/**
 * GT06 / GT06N Binary TCP Protocol Server
 *
 * The GT06N GPS tracker sends binary packets over a persistent TCP connection.
 * Packet format:  [78 78] [len] [proto] [data] [serial 2B] [crc 2B] [0D 0A]
 *
 * Supported protocol numbers:
 *   0x01 - Login (device sends IMEI, server ACKs)
 *   0x12 - GPS Location
 *   0x13 - Heartbeat / Status
 *   0x16 - Alarm
 */

import * as net from "net";
import { storage } from "./storage";
import { checkGeofences, checkSpeedViolation } from "./geofence-monitor";
import { broadcastLocationUpdate, broadcastVehicleUpdate } from "./broadcaster";
import { filterIncomingLocation, type LastKnownLocation } from "./lib/locationFilter";
import { sendPushAlertsForLocation } from "./push-notifications";
import {
  activeConnections,
  logUnknownImei,
  logRejection,
  logRawAttempt,
  markAttemptLoginComplete,
  logPacketReceived,
  logLocationAccepted,
  logLocationRejected,
} from "./device-registry";

const GT06_PORT = parseInt(process.env.GT06_PORT || "5023", 10);

// ─── Haversine distance (km) ──────────────────────────────────────────────
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── CRC-16/X-25 (poly=0x1021 reflected=0x8408, init=0xFFFF, xorOut=0xFFFF)
// This is the algorithm used by Traccar (the reference GT06 server implementation)
function calcCRC(buf: Buffer): number {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? ((crc >>> 1) ^ 0x8408) : (crc >>> 1);
    }
  }
  return (~crc) & 0xffff;
}

// ─── Build ACK Response ───────────────────────────────────────────────────
// Standard (0x78 0x78): [78 78] [05] [proto] [s_hi] [s_lo] [crc_hi] [crc_lo] [0D 0A]  — 10 bytes
// Extended (0x79 0x79): [79 79] [00] [05] [proto] [s_hi] [s_lo] [crc_hi] [crc_lo] [0D 0A] — 11 bytes
function buildAck(proto: number, serial: number, extended: boolean = false): Buffer {
  if (extended) {
    const buf = Buffer.alloc(11);
    buf[0] = 0x79; buf[1] = 0x79;
    buf[2] = 0x00; buf[3] = 0x05; // 2-byte big-endian length = 5
    buf[4] = proto;
    buf[5] = (serial >> 8) & 0xff;
    buf[6] = serial & 0xff;
    const crc = calcCRC(buf.slice(2, 7)); // [00 05 proto s_hi s_lo]
    buf[7] = (crc >> 8) & 0xff;
    buf[8] = crc & 0xff;
    buf[9] = 0x0d; buf[10] = 0x0a;
    return buf;
  }
  const buf = Buffer.alloc(10);
  buf[0] = 0x78; buf[1] = 0x78;
  buf[2] = 0x05;
  buf[3] = proto;
  buf[4] = (serial >> 8) & 0xff;
  buf[5] = serial & 0xff;
  const crc = calcCRC(buf.slice(2, 6)); // [05 proto s_hi s_lo]
  buf[6] = (crc >> 8) & 0xff;
  buf[7] = crc & 0xff;
  buf[8] = 0x0d; buf[9] = 0x0a;
  return buf;
}

// ─── Decode BCD IMEI (8 bytes → 15-digit string) ─────────────────────────
function decodeBCDimei(buf: Buffer, offset: number): string {
  let imei = "";
  for (let i = 0; i < 8; i++) {
    const b = buf[offset + i];
    imei += ((b >> 4) & 0x0f).toString();
    imei += (b & 0x0f).toString();
  }
  return imei.slice(0, 15); // strip trailing padding nibble
}

// ─── Parse Location Packet Data ──────────────────────────────────────────
interface ParsedLocation {
  lat: number;
  lng: number;
  speed: number;
  course: number;
  timestamp: Date;
  satellites: number;
}

function parseLocation(data: Buffer): ParsedLocation | null {
  // data starts AFTER the protocol byte (0x12), so:
  // [0..5]  = Date/Time: year(+2000), month, day, hour, min, sec
  // [6]     = GPS info: high nibble = data len, low nibble = satellites
  // [7..10] = Latitude  (uint32 BE, degrees × 1,800,000)
  // [11..14]= Longitude (uint32 BE, degrees × 1,800,000)
  // [15]    = Speed (km/h, uint8)
  // [16..17]= Course + Status (uint16 BE)
  //   High byte: bits[7:2]=course, bit[1]=W/E, bit[0]=S/N
  //   Low byte (status): bit[4]=GPS data valid, bit[0]=GPS tracking active
  if (data.length < 18) return null;

  const year  = 2000 + data[0];
  const month = data[1];
  const day   = data[2];
  const hour  = data[3];
  const min   = data[4];
  const sec   = data[5];

  const gpsInfo    = data[6];
  const satellites = gpsInfo & 0x0f;

  const latRaw = data.readUInt32BE(7);
  const lngRaw = data.readUInt32BE(11);
  const speed  = data[15];

  const statusWord = data.readUInt16BE(16);
  const highByte   = (statusWord >> 8) & 0xff;
  const lowByte    = statusWord & 0xff;

  // GPS validity flags from low byte:
  //   bit 4 (0x10) = GPS data valid (original GT06 spec)
  //   bit 0 (0x01) = GPS real-time tracking active (used by GT06S and many clones)
  // Many GT06 clone firmwares set ONLY bit 0x01 and leave 0x10 clear even with a
  // valid fix — accept either bit so those devices are not silently dropped.
  const gpsValid = Boolean(lowByte & 0x10) || Boolean(lowByte & 0x01);

  // Reject packets with no valid GPS fix
  if (!gpsValid) {
    console.warn(`[GT06] Discarding location: GPS fix not valid (status=0x${lowByte.toString(16)}, sats=${satellites})`);
    return null;
  }

  // Course/Status high byte encodes direction flags:
  //   bits [7:2] = course heading (0-63, × 5.625° = actual degrees)
  //   bit  [1]   = longitude W flag (0=East, 1=West)
  //   bit  [0]   = latitude S flag  (0=North, 1=South)
  const latSouth = Boolean(highByte & 0x01);
  const lonWest  = Boolean(highByte & 0x02);
  const course   = ((highByte >> 2) & 0x3f) * 5.625; // degrees

  // GT06 clone trackers use various coordinate encodings. We try each known
  // format applied SIMULTANEOUSLY to both lat and lng raw values, and pick the
  // first pair where BOTH values land inside India's geographic bounds
  // (lat 5–35°N, lng 65–100°E). Evaluating as a pair prevents a borderline
  // "wrong format" from passing the lat check alone (e.g. ×1800000 giving ~5.7°
  // which is just inside the lat threshold but whose lng would be ~43°, failing).
  function decodeCoordPair(
    latRaw: number,
    lngRaw: number
  ): { lat: number; lng: number } | null {
    const formats: Array<(r: number) => number> = [
      // Format 1: Plain degrees × 1,800,000 (original GT06 spec)
      r => r / 1800000.0,
      // Format 2: NMEA DDMMmmmm — 8-digit (most common GT06 clone format)
      // e.g. rawLat=10305432 → floor(…/1M)=10°, (…%1M)/10000=30.5432′ → 10.509°
      r => Math.floor(r / 1000000) + (r % 1000000) / 10000.0 / 60.0,
      // Format 3: NMEA DDMMmmm — 7-digit (cheaper clones, 3-decimal minutes)
      r => Math.floor(r / 100000) + (r % 100000) / 1000.0 / 60.0,
      // Format 4: degrees × 30,000 (rare Coban variant)
      r => r / 30000.0,
    ];

    for (const fn of formats) {
      const lat = fn(latRaw);
      const lng = fn(lngRaw);
      if (lat > 5 && lat < 35 && lng > 65 && lng < 100) {
        return { lat, lng };
      }
    }
    return null; // no known format gives an India coordinate pair
  }

  console.log(`[GT06] Raw coords: latRaw=${latRaw}, lngRaw=${lngRaw}`);

  const decoded = decodeCoordPair(latRaw, lngRaw);
  if (!decoded) {
    console.warn(
      `[GT06] Discarding location: no encoding format gives India bounds ` +
      `— rawLat=${latRaw}, rawLng=${lngRaw}`
    );
    return null;
  }

  let lat = decoded.lat;
  let lng = decoded.lng;
  if (latSouth) lat = -lat;
  if (lonWest)  lng = -lng;

  // Final India bounds check — catches hemisphere-bit errors and any edge case
  // where a format passed the pre-bit check but flipped out of bounds after.
  // India is always N hemisphere (lat > 0) and E longitude (lng > 0).
  const LAT_MIN = 5, LAT_MAX = 35, LNG_MIN = 65, LNG_MAX = 100;
  if (lat < LAT_MIN || lat > LAT_MAX || lng < LNG_MIN || lng > LNG_MAX) {
    console.warn(
      `[GT06] Discarding location: outside India bounds after hemisphere bits ` +
      `(lat=${lat.toFixed(5)}, lng=${lng.toFixed(5)}) — rawLat=${latRaw}, rawLng=${lngRaw}`
    );
    return null;
  }

  // Satellite count — once gpsValid is true (either 0x10 or 0x01 is set) we accept the
  // fix regardless of satellite count. Many GT06S / GT06 clone firmwares report 0 satellites
  // in the packet even when the GPS fix is genuinely valid, so hard-rejecting on sat count
  // would drop most of their packets. Warn only so admin diagnostics stay informative.
  if (satellites === 0) {
    console.warn(`[GT06] Low satellite count: 0 (accepted because gpsValid=true, status=0x${lowByte.toString(16)})`);
  } else if (satellites < 4) {
    console.warn(`[GT06] Low satellite count: ${satellites} (accepted because gpsValid=true)`);
  }

  // Use server receive time — GPS device time can have timezone/BCD issues
  const timestamp = new Date();

  return { lat, lng, speed, course, timestamp, satellites };
}

// ─── Parse Location with reason string ───────────────────────────────────
interface ParseLocationResult {
  parsed: ParsedLocation | null;
  reason: string;
}

function parseLocationWithReason(data: Buffer): ParseLocationResult {
  if (data.length < 18) return { parsed: null, reason: "Packet too short" };

  const gpsInfo    = data[6];
  const satellites = gpsInfo & 0x0f;
  const statusWord = data.readUInt16BE(16);
  const lowByte    = statusWord & 0xff;
  const highByte   = (statusWord >> 8) & 0xff;
  // Accept bit 0x10 (GPS data valid) OR bit 0x01 (GPS tracking active) — GT06S and many
  // clones only set 0x01; requiring 0x10 silently drops all their packets.
  const gpsValid   = Boolean(lowByte & 0x10) || Boolean(lowByte & 0x01);
  const latRaw     = data.readUInt32BE(7);
  const lngRaw     = data.readUInt32BE(11);

  if (!gpsValid) {
    // parseLocation() already emits a console.warn for this case; just capture reason
    const reason = `GPS fix not valid (status=0x${lowByte.toString(16)}, sats=${satellites})`;
    return { parsed: null, reason };
  }

  // Reuse existing parseLocation for the full decode (it handles its own console.warn).
  // Note: once gpsValid is true, satellite count alone does NOT cause rejection here —
  // parseLocation warns but continues. If null is returned, it must be a coord decode failure.
  const result = parseLocation(data);
  if (!result) {
    // Coord decode failure (satellite count is no longer a hard-reject reason)
    const formats: Array<(r: number) => number> = [
      r => r / 1800000.0,
      r => Math.floor(r / 1000000) + (r % 1000000) / 10000.0 / 60.0,
      r => Math.floor(r / 100000) + (r % 100000) / 1000.0 / 60.0,
      r => r / 30000.0,
    ];
    const latSouth = Boolean(highByte & 0x01);
    const lonWest  = Boolean(highByte & 0x02);
    for (const fn of formats) {
      let lat = fn(latRaw);
      let lng = fn(lngRaw);
      if (latSouth) lat = -lat;
      if (lonWest)  lng = -lng;
      if (lat > 5 && lat < 35 && lng > 65 && lng < 100) {
        // Coords land within India bounds in this format but parseLocation still rejected — possible decode bug
        return { parsed: null, reason: `Coord within India bounds but parseLocation rejected it (possible decode issue): lat=${lat.toFixed(4)}, lng=${lng.toFixed(4)}` };
      }
    }
    return { parsed: null, reason: `No coord format matches India bounds (rawLat=${latRaw}, rawLng=${lngRaw})` };
  }

  return { parsed: result, reason: "" };
}

// ─── Parse a Complete Packet ──────────────────────────────────────────────
// Supports both GT06 packet formats:
//   Standard (0x78 0x78): [78 78] [len 1B] [proto] [data] [serial 2B] [crc 2B] [0D 0A]
//   Extended (0x79 0x79): [79 79] [len_hi] [len_lo] [proto] [data] [serial 2B] [crc 2B] [0D 0A]
// The pktLen field (1 or 2 bytes) counts bytes from proto through last CRC byte:
//   pktLen = proto(1) + dataLen + serial(2) + crc(2) → dataLen = pktLen - 5
interface Packet {
  length: number;
  proto: number;
  data: Buffer;
  serial: number;
  crc: number;
  extended: boolean; // true = 0x79 0x79 extended; false = 0x78 0x78 standard
}

function parsePacket(buf: Buffer): Packet | null {
  const isStd = buf.length >= 2 && buf[0] === 0x78 && buf[1] === 0x78;
  const isExt = buf.length >= 2 && buf[0] === 0x79 && buf[1] === 0x79;
  if (!isStd && !isExt) return null;

  if (buf[buf.length - 2] !== 0x0d || buf[buf.length - 1] !== 0x0a) return null;

  // headerLen = bytes before proto byte (start bytes + length field bytes)
  // dataOffset = index of the proto byte in buf
  const headerLen  = isStd ? 3 : 4;  // std: 2+1  ext: 2+2
  const dataOffset = isStd ? 3 : 4;  // proto is at buf[3] or buf[4]
  const minLen     = isStd ? 10 : 11; // smallest valid packet

  if (buf.length < minLen) return null;

  const pktLen = isStd ? buf[2] : buf.readUInt16BE(2);
  if (buf.length < headerLen + pktLen + 2) return null;

  const proto   = buf[dataOffset];
  const dataLen = pktLen - 5;
  if (dataLen < 0) return null;

  const data    = buf.slice(dataOffset + 1, dataOffset + 1 + dataLen);
  const serial  = buf.readUInt16BE(dataOffset + 1 + dataLen);
  const crcGot  = buf.readUInt16BE(dataOffset + 1 + dataLen + 2);

  // CRC covers from the first length byte through last serial byte
  const crcCalc = calcCRC(buf.slice(2, dataOffset + 1 + dataLen + 2));
  if (crcGot !== crcCalc) {
    console.warn(`[GT06] CRC mismatch: got 0x${crcGot.toString(16)}, expected 0x${crcCalc.toString(16)} | raw=${buf.toString("hex")}`);
  }

  return { length: pktLen, proto, data, serial, crc: crcGot, extended: isExt };
}

// ─── GT06 TCP Server ──────────────────────────────────────────────────────
export function startGT06Server() {
  const server = net.createServer((socket) => {
    const remoteAddr = `${socket.remoteAddress}:${socket.remotePort}`;
    let imei: string | null = null;
    let vehicleId: string | null = null;
    let rxBuf = Buffer.alloc(0);
    const connKey = remoteAddr;

    console.log(`[GT06] New connection from ${remoteAddr}`);

    let firstDataSeen = false;

    socket.on("data", async (chunk) => {
      // Buffer incoming data – TCP may deliver packets in fragments
      rxBuf = Buffer.concat([rxBuf, chunk]);

      // Record the very first raw bytes from this connection (for diagnostics).
      // This lets admins see devices that connect but never complete GT06 login.
      if (!firstDataSeen && rxBuf.length >= 2) {
        firstDataSeen = true;
        logRawAttempt(remoteAddr, rxBuf.slice(0, 16).toString("hex"));
      }

      // Try to parse complete packets from the buffer.
      // Handles both standard (0x78 0x78) and extended (0x79 0x79) GT06 formats.
      while (rxBuf.length >= 2) {
        const isStd = rxBuf[0] === 0x78 && rxBuf[1] === 0x78;
        const isExt = rxBuf[0] === 0x79 && rxBuf[1] === 0x79;

        if (!isStd && !isExt) {
          // Neither valid start — scan forward for the next valid start bytes
          let nextStart = -1;
          for (let i = 1; i < rxBuf.length - 1; i++) {
            if ((rxBuf[i] === 0x78 && rxBuf[i + 1] === 0x78) ||
                (rxBuf[i] === 0x79 && rxBuf[i + 1] === 0x79)) {
              nextStart = i;
              break;
            }
          }
          if (nextStart < 0) {
            // No valid start found anywhere — log the unrecognized data and clear
            const hex = rxBuf.slice(0, 32).toString("hex");
            console.warn(`[GT06] Unrecognized protocol data from ${remoteAddr}: ${hex} — clearing buffer`);
            rxBuf = Buffer.alloc(0);
            break;
          }
          rxBuf = rxBuf.slice(nextStart);
          continue;
        }

        // Determine total expected packet length based on format
        let totalLen: number;
        if (isStd) {
          if (rxBuf.length < 5) break; // need at least 5 to read 1-byte length
          const pktLen = rxBuf[2];
          totalLen = pktLen + 5; // 2 start + 1 len + pktLen + 2 stop
        } else {
          if (rxBuf.length < 6) break; // need at least 6 to read 2-byte length
          const pktLen = rxBuf.readUInt16BE(2);
          // Guard against malformed extended packets with huge length values
          if (pktLen > 4096) {
            console.warn(`[GT06] Extended packet with absurd pktLen=${pktLen} from ${remoteAddr} — discarding`);
            rxBuf = Buffer.alloc(0);
            break;
          }
          totalLen = pktLen + 6; // 2 start + 2 len + pktLen + 2 stop
        }

        if (rxBuf.length < totalLen) break; // wait for more data

        const rawPacket = rxBuf.slice(0, totalLen);
        rxBuf = rxBuf.slice(totalLen);

        const pkt = parsePacket(rawPacket);
        if (!pkt) {
          console.warn(`[GT06] Failed to parse ${isExt ? "extended" : "standard"} packet from ${remoteAddr}: ${rawPacket.toString("hex")}`);
          continue;
        }

        try {
          await handlePacket(socket, pkt, remoteAddr,
            (id) => { imei = id; },
            (id) => { vehicleId = id; },
            () => imei,
            () => vehicleId,
          );
        } catch (err) {
          console.error(`[GT06] Handler error for ${remoteAddr}:`, err);
        }
      }
    });

    socket.on("error",  (err) => console.warn(`[GT06] Socket error ${remoteAddr}:`, err.message));
    socket.on("close",  () => {
      activeConnections.delete(connKey);
      console.log(`[GT06] Connection closed ${remoteAddr} (IMEI: ${imei ?? "unknown"})`);
    });
    socket.setTimeout(120_000, () => socket.destroy());
  });

  server.listen(GT06_PORT, () => {
    console.log(`[GT06] TCP server listening on port ${GT06_PORT}`);
  });

  server.on("error", (err) => {
    console.error(`[GT06] Server error:`, err.message);
  });

  return server;
}

// ─── Handle a Parsed Packet ───────────────────────────────────────────────
async function handlePacket(
  socket: net.Socket,
  pkt: Packet,
  remoteAddr: string,
  setImei: (id: string) => void,
  setVehicleId: (id: string) => void,
  getImei: () => string | null,
  getVehicleId: () => string | null,
) {
  switch (pkt.proto) {
    // ── Login (0x01) ──
    case 0x01: {
      if (pkt.data.length < 8) break;
      const deviceImei = decodeBCDimei(pkt.data, 0);
      setImei(deviceImei);
      console.log(`[GT06] Login from IMEI: ${deviceImei} (${remoteAddr}, ${pkt.extended ? "extended 0x79" : "standard 0x78"})`);
      markAttemptLoginComplete(remoteAddr);

      // Register in active connections map
      activeConnections.set(remoteAddr, {
        imei: deviceImei,
        remoteAddr,
        connectedAt: new Date(),
        lastPacketAt: new Date(),
        packetCount: 1,
      });

      // Look up the registered vehicle
      const vehicle = await storage.getVehicleByDeviceId(deviceImei);
      if (vehicle) {
        setVehicleId(vehicle.id);
        console.log(`[GT06] Matched vehicle: ${vehicle.name} (${vehicle.id})`);
        // Record that this device has contacted the server (even with no GPS fix yet)
        storage.updateVehicleLastSeen(vehicle.id, new Date()).catch((e: Error) => {
          console.error(`[GT06] Failed to update lastSeenAt for ${vehicle.id}:`, e.message);
        });
      } else {
        console.warn(`[GT06] Unknown device IMEI: ${deviceImei} — not registered in fleet`);
        logUnknownImei(deviceImei, remoteAddr);
      }

      // Always ACK so device continues sending location data
      socket.write(buildAck(0x01, pkt.serial, pkt.extended));
      break;
    }

    // ── GPS Location (0x12) ──
    case 0x12: {
      const vehicleId = getVehicleId();
      const deviceImei = getImei();
      if (!vehicleId || !deviceImei) {
        console.warn(`[GT06] Location packet before login from ${remoteAddr}`);
        break;
      }

      // Record last contact for every 0x12 packet from a known vehicle,
      // regardless of whether GPS fix is valid or passes the filter.
      storage.updateVehicleLastSeen(vehicleId, new Date()).catch((e: Error) => {
        console.error(`[GT06] Failed to update lastSeenAt for ${vehicleId}:`, e.message);
      });

      logPacketReceived(deviceImei);

      const loc = parseLocationWithReason(pkt.data);
      if (!loc.parsed) {
        // Always ACK location packets even if discarded (prevents device retransmits).
        logRejection(deviceImei, loc.reason);
        logLocationRejected(deviceImei, loc.reason);
        socket.write(buildAck(0x12, pkt.serial, pkt.extended));
        break;
      }
      const locData = loc.parsed;

      // ── Location filter pipeline ─────────────────────────────────────────
      // Run the incoming coordinate through the multi-stage filter (bounds
      // check, jump guard, speed spike, stationary drift) with Kalman smoothing.
      //
      // Ocean recovery: getLatestLocationForVehicle already filters returned rows
      // to India bounds (lat 5-37, lng 65-100), so if the last stored coordinate
      // is an ocean/garbage point it will return null. When lastKnown is null the
      // filter skips the jump guard entirely, allowing the first valid India
      // coordinate to be accepted — this is the recovery path.
      const lastLoc = await storage.getLatestLocationForVehicle(vehicleId);
      const lastKnown: LastKnownLocation | null = lastLoc ? {
        lat: parseFloat(String(lastLoc.latitude)),
        lng: parseFloat(String(lastLoc.longitude)),
        timestamp: lastLoc.timestamp,
        speedKph: lastLoc.speed ? parseFloat(String(lastLoc.speed)) : null,
      } : null;

      const filterResult = filterIncomingLocation({
        imei: deviceImei,
        lat: locData.lat,
        lng: locData.lng,
        speedKph: locData.speed,
        heading: locData.course ?? null,
        satellites: locData.satellites,
        timestamp: locData.timestamp,
      }, lastKnown);

      if (!filterResult.accepted) {
        const filterReason = `${filterResult.reason}${filterResult.details ? ` — ${filterResult.details}` : ""}`;
        console.log(`[GT06][FILTER] ${deviceImei} rejected: ${filterReason}`);
        logRejection(deviceImei, filterReason);
        logLocationRejected(deviceImei, filterReason);
        socket.write(buildAck(0x12, pkt.serial, pkt.extended));
        break;
      }

      const filtered = filterResult.location;

      // Update last-packet time and count in the registry
      const conn = activeConnections.get(remoteAddr);
      if (conn) {
        conn.lastPacketAt = new Date();
        conn.packetCount += 1;
      }

      console.log(`[GT06] Location ${deviceImei}: lat=${filtered.lat.toFixed(6)}, lng=${filtered.lng.toFixed(6)}, speed=${filtered.speedKph ?? locData.speed} km/h, sats=${locData.satellites}`);

      // Store location and update vehicle status
      const location = await storage.createDeviceLocation(
        vehicleId,
        filtered.lat,
        filtered.lng,
        filtered.speedKph ?? locData.speed,
        null,
        null,
        filtered.timestamp,
        locData.satellites,
        filtered.heading,
        filtered.isStationary,
        filtered.accuracyScore,
      );

      const newStatus = (filtered.speedKph ?? locData.speed) > 5 ? "active" : "stopped";
      const existingVehicle = await storage.getVehicle(vehicleId);
      let parkedSince: Date | null | undefined = undefined; // undefined = don't change
      if (newStatus === "stopped" && existingVehicle?.status !== "stopped") {
        // Transitioned from moving → stopped: record parking start time
        parkedSince = new Date();
      } else if (newStatus === "active" && existingVehicle?.status === "stopped") {
        // Transitioned from stopped → moving: clear parking time
        parkedSince = null;
      }
      const vehicleUpdate: { status: string; parkedSince?: Date | null } = { status: newStatus };
      if (parkedSince !== undefined) vehicleUpdate.parkedSince = parkedSince;
      const updatedVehicle = await storage.updateVehicle(vehicleId, vehicleUpdate);

      // Track accepted location in per-IMEI packet stats
      logLocationAccepted(deviceImei);

      // Trigger geofence checks and broadcast to WebSocket clients
      checkGeofences(location).catch((e) => console.error("[GT06] Geofence error:", e));
      checkSpeedViolation(location).catch((e) => console.error("[GT06] Speed check error:", e));
      broadcastLocationUpdate({ ...location, vehicleId });
      if (updatedVehicle) broadcastVehicleUpdate(updatedVehicle);

      // Server-side push notifications for speed/parking/idle thresholds.
      // Uses post-update vehicle snapshot so status/parkedSince reflect current state.
      if (updatedVehicle) {
        const gpsSpeed = filtered.speedKph ?? locData.speed;
        const updatedParkedSince =
          parkedSince !== undefined ? parkedSince : updatedVehicle.parkedSince ?? null;
        sendPushAlertsForLocation(
          { id: vehicleId, name: updatedVehicle.name, status: newStatus, parkedSince: updatedParkedSince },
          gpsSpeed
        ).catch((e) => console.error("[GT06] Push alert error:", e));
      }

      socket.write(buildAck(0x12, pkt.serial, pkt.extended));
      break;
    }

    // ── Heartbeat / Status (0x13) ──
    // Byte 0 of data encodes device status bits:
    //   bit 3 (0x08) = ACC / ignition on
    //   bit 1 (0x02) = GPS real-time tracking active
    //   bit 0 (0x01) = device power state
    case 0x13: {
      const deviceImei = getImei();
      socket.write(buildAck(0x13, pkt.serial, pkt.extended));

      const conn13 = activeConnections.get(remoteAddr);
      if (conn13) { conn13.lastPacketAt = new Date(); conn13.packetCount += 1; }

      if (deviceImei && pkt.data && pkt.data.length >= 1) {
        const statusByte = pkt.data[0];
        const ignitionOn = Boolean(statusByte & 0x08);
        console.log(`[GT06] Heartbeat from ${deviceImei} — ACC/ignition: ${ignitionOn ? "ON" : "OFF"} (status=0x${statusByte.toString(16)})`);

        // Update lastSeenAt and ignition state
        const vehicle = await storage.getVehicleByDeviceId(deviceImei);
        if (vehicle) {
          await storage.updateVehicleLastSeen(vehicle.id, new Date());
          await storage.updateVehicleIgnition(vehicle.id, ignitionOn);
        }
      } else if (deviceImei) {
        console.log(`[GT06] Heartbeat from ${deviceImei}`);
        // Still update lastSeenAt even if status byte absent
        const vehicle = await storage.getVehicleByDeviceId(deviceImei);
        if (vehicle) {
          await storage.updateVehicleLastSeen(vehicle.id, new Date());
        }
      }
      break;
    }

    // ── GPS + LBS Combined (0x19) ──
    // Format: [GPS data 18 bytes] [MCC 2B] [MNC 1B] [LAC 2B] [Cell ID 3B] [Signal 1B]
    // The GPS portion is identical to 0x12 — parse it with parseLocation().
    case 0x19: {
      const vehicleId19 = getVehicleId();
      const deviceImei19 = getImei();
      socket.write(buildAck(0x19, pkt.serial, pkt.extended));

      if (!vehicleId19 || !deviceImei19) {
        console.warn(`[GT06] 0x19 packet before login from ${remoteAddr}`);
        break;
      }

      const conn19 = activeConnections.get(remoteAddr);
      if (conn19) { conn19.lastPacketAt = new Date(); conn19.packetCount += 1; }

      storage.updateVehicleLastSeen(vehicleId19, new Date()).catch((e: Error) => {
        console.error(`[GT06] Failed to update lastSeenAt for ${vehicleId19}:`, e.message);
      });

      // GPS portion is the first 18 bytes — same layout as 0x12
      if (pkt.data && pkt.data.length >= 18) {
        const gpsData = pkt.data.slice(0, 18);
        logPacketReceived(deviceImei19);
        const loc19 = parseLocationWithReason(gpsData);
        if (!loc19.parsed) {
          logRejection(deviceImei19, `0x19: ${loc19.reason}`);
          logLocationRejected(deviceImei19, `0x19: ${loc19.reason}`);
          break;
        }
        const locData19 = loc19.parsed;

        const lastLoc19 = await storage.getLatestLocationForVehicle(vehicleId19);
        const lastKnown19: LastKnownLocation | null = lastLoc19 ? {
          lat: parseFloat(String(lastLoc19.latitude)),
          lng: parseFloat(String(lastLoc19.longitude)),
          timestamp: lastLoc19.timestamp,
          speedKph: lastLoc19.speed ? parseFloat(String(lastLoc19.speed)) : null,
        } : null;

        const filterResult19 = filterIncomingLocation({
          imei: deviceImei19,
          lat: locData19.lat,
          lng: locData19.lng,
          speedKph: locData19.speed,
          heading: locData19.course ?? null,
          satellites: locData19.satellites,
          timestamp: locData19.timestamp,
        }, lastKnown19);

        if (!filterResult19.accepted) {
          const r = `${filterResult19.reason}${filterResult19.details ? ` — ${filterResult19.details}` : ""}`;
          console.log(`[GT06][FILTER] 0x19 ${deviceImei19} rejected: ${r}`);
          logRejection(deviceImei19, r);
          logLocationRejected(deviceImei19, r);
          break;
        }

        const filtered19 = filterResult19.location;
        console.log(`[GT06] 0x19 GPS+LBS location ${deviceImei19}: lat=${filtered19.lat.toFixed(6)}, lng=${filtered19.lng.toFixed(6)}, sats=${locData19.satellites}`);

        const location19 = await storage.createDeviceLocation(
          vehicleId19,
          filtered19.lat,
          filtered19.lng,
          filtered19.speedKph ?? locData19.speed,
          null,
          null,
          filtered19.timestamp,
          locData19.satellites,
          filtered19.heading,
          filtered19.isStationary,
          filtered19.accuracyScore,
        );

        const newStatus19 = (filtered19.speedKph ?? locData19.speed) > 5 ? "active" : "stopped";
        const existingVehicle19 = await storage.getVehicle(vehicleId19);
        let parkedSince19: Date | null | undefined = undefined;
        if (newStatus19 === "stopped" && existingVehicle19?.status !== "stopped") {
          parkedSince19 = new Date();
        } else if (newStatus19 === "active" && existingVehicle19?.status === "stopped") {
          parkedSince19 = null;
        }
        const vehicleUpdate19: { status: string; parkedSince?: Date | null } = { status: newStatus19 };
        if (parkedSince19 !== undefined) vehicleUpdate19.parkedSince = parkedSince19;
        const updatedVehicle19 = await storage.updateVehicle(vehicleId19, vehicleUpdate19);

        logLocationAccepted(deviceImei19);
        checkGeofences(location19).catch((e) => console.error("[GT06] Geofence error:", e));
        checkSpeedViolation(location19).catch((e) => console.error("[GT06] Speed check error:", e));
        broadcastLocationUpdate({ ...location19, vehicleId: vehicleId19 });
        if (updatedVehicle19) broadcastVehicleUpdate(updatedVehicle19);
        // Log appended LBS fields for diagnostics / future cell-tower positioning
        if (pkt.data.length >= 27) {
          // LBS block starts at byte 18: MCC(2) MNC(1) LAC(2) CellID(3) Signal(1) = 9 bytes
          const mcc    = pkt.data.readUInt16BE(18);
          const mnc    = pkt.data[20];
          const lac    = pkt.data.readUInt16BE(21);
          const cellId = (pkt.data[23] << 16) | (pkt.data[24] << 8) | pkt.data[25];
          const signal = pkt.data[26];
          console.log(`[GT06] 0x19 LBS: MCC=${mcc} MNC=${mnc} LAC=0x${lac.toString(16)} CellID=0x${cellId.toString(16)} Signal=${signal}`);
        }
      } else {
        console.warn(`[GT06] 0x19 GPS+LBS: data too short (${pkt.data?.length ?? 0} bytes) from ${deviceImei19}`);
      }
      break;
    }

    // ── LBS-Only (0x22 / 0x23) ──
    // No GPS coordinates — device only has cell-tower info. Update lastSeenAt so
    // the vehicle doesn't show "Waiting for GPS" / offline when it's actually alive.
    case 0x22:
    case 0x23: {
      const protoName = pkt.proto === 0x22 ? "LBS-Only" : "LBS-Status";
      const deviceImei2223 = getImei();
      socket.write(buildAck(pkt.proto, pkt.serial, pkt.extended));

      const conn2223 = activeConnections.get(remoteAddr);
      if (conn2223) { conn2223.lastPacketAt = new Date(); conn2223.packetCount += 1; }

      if (deviceImei2223) {
        // Log raw LBS fields from the payload for diagnostics
        // 0x22 layout: [MCC 2B] [MNC 1B] [LAC 2B] [CellID 3B] [Signal 1B] = 9 bytes
        // 0x23 layout: [Status 1B] [MCC 2B] [MNC 1B] [LAC 2B] [CellID 3B] [Signal 1B] = 10 bytes
        if (pkt.data && pkt.data.length >= 9) {
          const offset = pkt.proto === 0x23 ? 1 : 0;
          if (pkt.data.length >= offset + 9) {
            const mcc2223    = pkt.data.readUInt16BE(offset);
            const mnc2223    = pkt.data[offset + 2];
            const lac2223    = pkt.data.readUInt16BE(offset + 3);
            const cellId2223 = (pkt.data[offset + 5] << 16) | (pkt.data[offset + 6] << 8) | pkt.data[offset + 7];
            const signal2223 = pkt.data[offset + 8];
            console.log(`[GT06] ${protoName} (0x${pkt.proto.toString(16)}) from ${deviceImei2223} — MCC=${mcc2223} MNC=${mnc2223} LAC=0x${lac2223.toString(16)} CellID=0x${cellId2223.toString(16)} Signal=${signal2223}`);
          }
        } else {
          console.log(`[GT06] ${protoName} (0x${pkt.proto.toString(16)}) from ${deviceImei2223} — no GPS coords, updating lastSeenAt`);
        }

        const vehicle2223 = await storage.getVehicleByDeviceId(deviceImei2223);
        if (vehicle2223) {
          await storage.updateVehicleLastSeen(vehicle2223.id, new Date());
          // 0x23 also contains a status byte at position 0 (same as 0x13)
          if (pkt.proto === 0x23 && pkt.data && pkt.data.length >= 1) {
            const statusByte = pkt.data[0];
            const ignitionOn = Boolean(statusByte & 0x08);
            await storage.updateVehicleIgnition(vehicle2223.id, ignitionOn);
          }
        }
      }
      break;
    }

    // ── Offline Stored GPS Upload (0x15) ──
    // GT06N buffers GPS points when offline (tunnel / no-signal). When connectivity
    // returns, it sends all buffered records in a 0x15 packet:
    //   [Count 1B] [GPS Record 1: 18 bytes] [GPS Record 2: 18 bytes] ...
    // Each GPS record has the same 18-byte layout as a 0x12 location packet.
    // We process every record through the full filter pipeline except the stale-age
    // check (offline packets are intentionally old — that's the point of buffering).
    case 0x15: {
      const vehicleId15 = getVehicleId();
      const deviceImei15 = getImei();
      socket.write(buildAck(0x15, pkt.serial, pkt.extended));

      const conn15 = activeConnections.get(remoteAddr);
      if (conn15) { conn15.lastPacketAt = new Date(); conn15.packetCount += 1; }

      if (!vehicleId15 || !deviceImei15) {
        console.warn(`[GT06] 0x15 offline upload before login from ${remoteAddr}`);
        break;
      }

      if (!pkt.data || pkt.data.length < 1) {
        console.log(`[GT06] 0x15 offline upload: empty payload from ${deviceImei15}`);
        break;
      }

      const recordCount = pkt.data[0];
      console.log(`[GT06] 0x15 offline upload from ${deviceImei15}: ${recordCount} stored record(s)`);

      if (recordCount === 0) break;

      // Each record is 18 bytes in the same format as a 0x12 GPS packet.
      let stored15 = 0;
      let rejected15 = 0;
      const lastLoc15 = await storage.getLatestLocationForVehicle(vehicleId15);
      let lastKnown15: LastKnownLocation | null = lastLoc15 ? {
        lat: parseFloat(String(lastLoc15.latitude)),
        lng: parseFloat(String(lastLoc15.longitude)),
        timestamp: lastLoc15.timestamp,
        speedKph: lastLoc15.speed ? parseFloat(String(lastLoc15.speed)) : null,
      } : null;

      for (let i = 0; i < recordCount; i++) {
        const offset = 1 + i * 18;
        if (offset + 18 > pkt.data.length) {
          console.warn(`[GT06] 0x15: record ${i + 1}/${recordCount} truncated — stopping early`);
          break;
        }
        const record = pkt.data.slice(offset, offset + 18);
        logPacketReceived(deviceImei15);
        const locResult = parseLocationWithReason(record);
        if (!locResult.parsed) {
          console.log(`[GT06] 0x15 record ${i + 1}: rejected parse — ${locResult.reason}`);
          logLocationRejected(deviceImei15, `0x15[${i}]: ${locResult.reason}`);
          rejected15++;
          continue;
        }
        const locData15 = locResult.parsed;

        // Use GPS device time for offline records (they were recorded at a specific time,
        // not "now"). Re-parse timestamp from the raw bytes since parseLocation() uses new Date().
        const year15  = 2000 + record[0];
        const month15 = record[1];
        const day15   = record[2];
        const hour15  = record[3];
        const min15   = record[4];
        const sec15   = record[5];
        const offlineTs = new Date(Date.UTC(year15, month15 - 1, day15, hour15, min15, sec15));
        locData15.timestamp = offlineTs;

        // allowStale=true: skip the age check — these records are intentionally old.
        const filterResult15 = filterIncomingLocation({
          imei: deviceImei15,
          lat: locData15.lat,
          lng: locData15.lng,
          speedKph: locData15.speed,
          heading: locData15.course ?? null,
          satellites: locData15.satellites,
          timestamp: offlineTs,
        }, lastKnown15, { allowStale: true });

        if (!filterResult15.accepted) {
          const r = `${filterResult15.reason}${filterResult15.details ? ` — ${filterResult15.details}` : ""}`;
          console.log(`[GT06] 0x15 record ${i + 1}: filter rejected — ${r}`);
          logRejection(deviceImei15, `0x15[${i}]: ${r}`);
          logLocationRejected(deviceImei15, `0x15[${i}]: ${r}`);
          rejected15++;
          continue;
        }

        const filtered15 = filterResult15.location;
        const location15 = await storage.createDeviceLocation(
          vehicleId15,
          filtered15.lat,
          filtered15.lng,
          filtered15.speedKph ?? locData15.speed,
          null,
          null,
          offlineTs,
          locData15.satellites,
          filtered15.heading,
          filtered15.isStationary,
          filtered15.accuracyScore,
        );

        // Update lastKnown15 so next offline record uses this one as reference
        // (jump guard and duplicate check need a running reference per record).
        lastKnown15 = {
          lat: filtered15.lat,
          lng: filtered15.lng,
          timestamp: offlineTs,
          speedKph: filtered15.speedKph,
        };

        logLocationAccepted(deviceImei15);
        broadcastLocationUpdate({ ...location15, vehicleId: vehicleId15 });
        stored15++;
      }

      console.log(`[GT06] 0x15 offline upload done — ${stored15} stored, ${rejected15} rejected`);

      // Update lastSeenAt and vehicle status for the most recent offline record stored.
      if (stored15 > 0 && lastKnown15) {
        storage.updateVehicleLastSeen(vehicleId15, new Date()).catch((e: Error) => {
          console.error(`[GT06] Failed to update lastSeenAt for ${vehicleId15}:`, e.message);
        });
      }
      break;
    }

    // ── Alarm (0x16) ──
    case 0x16: {
      const deviceImei = getImei();
      console.log(`[GT06] Alarm packet from ${deviceImei ?? remoteAddr}`);
      socket.write(buildAck(0x16, pkt.serial, pkt.extended));
      break;
    }

    // ── GT06N Auxiliary Packets (ACK + log only) ──
    // These packets carry no GPS data — the device expects an ACK to stay connected.
    // Explicit handlers keep the log clean and document what each packet type means.

    // 0x1A: String / Info response (device replies to a text command with a text string)
    case 0x1A: {
      const imei1A = getImei();
      const text1A = pkt.data ? pkt.data.toString("ascii").replace(/\0/g, "").trim() : "";
      console.log(`[GT06] 0x1A string info from ${imei1A ?? remoteAddr}${text1A ? `: "${text1A}"` : ""}`);
      socket.write(buildAck(0x1A, pkt.serial, pkt.extended));
      const conn1A = activeConnections.get(remoteAddr);
      if (conn1A) { conn1A.lastPacketAt = new Date(); conn1A.packetCount += 1; }
      break;
    }

    // 0x25: GPRS Command / Query response (device ACKs a server command or responds to query)
    case 0x25: {
      const imei25 = getImei();
      console.log(`[GT06] 0x25 GPRS command response from ${imei25 ?? remoteAddr}`);
      socket.write(buildAck(0x25, pkt.serial, pkt.extended));
      const conn25 = activeConnections.get(remoteAddr);
      if (conn25) { conn25.lastPacketAt = new Date(); conn25.packetCount += 1; }
      break;
    }

    // 0x26: Network / Signal strength info
    case 0x26: {
      const imei26 = getImei();
      const signal26 = pkt.data && pkt.data.length >= 1 ? pkt.data[0] : null;
      console.log(`[GT06] 0x26 signal strength from ${imei26 ?? remoteAddr}${signal26 !== null ? `: ${signal26}` : ""}`);
      socket.write(buildAck(0x26, pkt.serial, pkt.extended));
      const conn26 = activeConnections.get(remoteAddr);
      if (conn26) { conn26.lastPacketAt = new Date(); conn26.packetCount += 1; }
      break;
    }

    // 0x2B: Record query / time sync response
    case 0x2B: {
      const imei2B = getImei();
      console.log(`[GT06] 0x2B record/time info from ${imei2B ?? remoteAddr}`);
      socket.write(buildAck(0x2B, pkt.serial, pkt.extended));
      const conn2B = activeConnections.get(remoteAddr);
      if (conn2B) { conn2B.lastPacketAt = new Date(); conn2B.packetCount += 1; }
      break;
    }

    // 0x30: WiFi location info (some GT06N variants with WiFi chipset)
    case 0x30: {
      const imei30 = getImei();
      console.log(`[GT06] 0x30 WiFi info from ${imei30 ?? remoteAddr}`);
      socket.write(buildAck(0x30, pkt.serial, pkt.extended));
      const conn30 = activeConnections.get(remoteAddr);
      if (conn30) { conn30.lastPacketAt = new Date(); conn30.packetCount += 1; }
      break;
    }

    default: {
      console.log(`[GT06] Unknown protocol 0x${pkt.proto.toString(16)} from ${remoteAddr}`);
      socket.write(buildAck(pkt.proto, pkt.serial, pkt.extended));
      break;
    }
  }
}
