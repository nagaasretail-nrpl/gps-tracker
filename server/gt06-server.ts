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
//  78 78 [05] [proto] [serial hi] [serial lo] [crc hi] [crc lo] 0D 0A
function buildAck(proto: number, serial: number): Buffer {
  const buf = Buffer.alloc(10);
  buf[0] = 0x78; buf[1] = 0x78;
  buf[2] = 0x05;
  buf[3] = proto;
  buf[4] = (serial >> 8) & 0xff;
  buf[5] = serial & 0xff;
  const crc = calcCRC(buf.slice(2, 6)); // length byte → serial
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
  //   bit 4 (0x10) = GPS data valid
  //   bit 0 (0x01) = GPS tracking active / real-time
  const gpsValid = Boolean(lowByte & 0x10);

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

  // Reject if not enough satellites for a reliable fix
  if (satellites < 4) {
    console.warn(`[GT06] Discarding location: only ${satellites} satellites (need ≥4)`);
    return null;
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
  const gpsValid   = Boolean(lowByte & 0x10);
  const latRaw     = data.readUInt32BE(7);
  const lngRaw     = data.readUInt32BE(11);

  if (!gpsValid) {
    const reason = `GPS fix not valid (status=0x${lowByte.toString(16)}, sats=${satellites})`;
    console.warn(`[GT06] Discarding location: ${reason}`);
    return { parsed: null, reason };
  }

  // Reuse existing parseLocation for the full decode
  const result = parseLocation(data);
  if (!result) {
    // Determine specific reason
    if (satellites < 4) {
      return { parsed: null, reason: `Too few satellites: ${satellites} (need ≥4)` };
    }
    // Coord decode failure
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
interface Packet {
  length: number;
  proto: number;
  data: Buffer;
  serial: number;
  crc: number;
}

function parsePacket(buf: Buffer): Packet | null {
  // Must start with 78 78 and end with 0D 0A
  if (buf.length < 10) return null;
  if (buf[0] !== 0x78 || buf[1] !== 0x78) return null;
  if (buf[buf.length - 2] !== 0x0d || buf[buf.length - 1] !== 0x0a) return null;

  const pktLen = buf[2]; // number of bytes from proto to last CRC byte
  if (buf.length < pktLen + 5) return null; // 2 start + 1 len + pktLen + 2 stop = pktLen+5

  const proto   = buf[3];
  // pktLen = proto(1) + dataLen + serial(2) + crc(2), so dataLen = pktLen - 5
  const dataLen = pktLen - 5;
  const data    = buf.slice(4, 4 + dataLen);         // payload after proto byte
  const serial  = buf.readUInt16BE(4 + dataLen);     // serial after data
  const crcGot  = buf.readUInt16BE(4 + dataLen + 2); // CRC after serial

  // CRC covers: [length byte] through [last serial byte] inclusive (Traccar convention)
  const crcCalc = calcCRC(buf.slice(2, 4 + dataLen + 2));
  if (crcGot !== crcCalc) {
    console.warn(`[GT06] CRC mismatch: got 0x${crcGot.toString(16)}, expected 0x${crcCalc.toString(16)} | raw=${buf.toString("hex")}`);
  }

  return { length: pktLen, proto, data, serial, crc: crcGot };
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

    socket.on("data", async (chunk) => {
      // Buffer incoming data – TCP may deliver packets in fragments
      rxBuf = Buffer.concat([rxBuf, chunk]);

      // Try to parse complete packets from the buffer
      while (rxBuf.length >= 10) {
        // Find start bytes
        const startIdx = rxBuf.indexOf(Buffer.from([0x78, 0x78]));
        if (startIdx < 0) { rxBuf = Buffer.alloc(0); break; }
        if (startIdx > 0)  { rxBuf = rxBuf.slice(startIdx); }

        // Need at least 5 bytes to read the length
        if (rxBuf.length < 5) break;

        const pktLen = rxBuf[2];
        const totalLen = pktLen + 5; // 2 start + 1 len + pktLen + 2 stop
        if (rxBuf.length < totalLen) break; // wait for more data

        const rawPacket = rxBuf.slice(0, totalLen);
        rxBuf = rxBuf.slice(totalLen);

        const pkt = parsePacket(rawPacket);
        if (!pkt) continue;

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
      console.log(`[GT06] Login from IMEI: ${deviceImei} (${remoteAddr})`);

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
      } else {
        console.warn(`[GT06] Unknown device IMEI: ${deviceImei} — not registered in fleet`);
        logUnknownImei(deviceImei, remoteAddr);
      }

      // Always ACK so device continues sending location data
      socket.write(buildAck(0x01, pkt.serial));
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

      const loc = parseLocationWithReason(pkt.data);
      if (!loc.parsed) {
        // Always ACK location packets even if discarded (prevents device retransmits).
        logRejection(deviceImei, loc.reason);
        socket.write(buildAck(0x12, pkt.serial));
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
        socket.write(buildAck(0x12, pkt.serial));
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

      socket.write(buildAck(0x12, pkt.serial));
      break;
    }

    // ── Heartbeat / Status (0x13) ──
    case 0x13: {
      const deviceImei = getImei();
      if (deviceImei) console.log(`[GT06] Heartbeat from ${deviceImei}`);
      socket.write(buildAck(0x13, pkt.serial));
      break;
    }

    // ── Alarm (0x16) ──
    case 0x16: {
      const deviceImei = getImei();
      console.log(`[GT06] Alarm packet from ${deviceImei ?? remoteAddr}`);
      socket.write(buildAck(0x16, pkt.serial));
      break;
    }

    default: {
      console.log(`[GT06] Unknown protocol 0x${pkt.proto.toString(16)} from ${remoteAddr}`);
      socket.write(buildAck(pkt.proto, pkt.serial));
      break;
    }
  }
}
