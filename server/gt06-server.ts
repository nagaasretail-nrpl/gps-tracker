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
import { broadcastLocationUpdate } from "./broadcaster";

const GT06_PORT = parseInt(process.env.GT06_PORT || "5023", 10);

// ─── CRC-16/CCITT (XModem variant: init=0x0000, poly=0x1021) ─────────────
function calcCRC(buf: Buffer): number {
  let crc = 0x0000;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
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
  const crc = calcCRC(buf.slice(3, 6)); // proto → serial
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

  // Course/Status high byte encodes direction flags:
  //   bits [7:2] = course heading (0-63, × 5.625° = actual degrees)
  //   bit  [1]   = longitude W flag (0=East, 1=West)
  //   bit  [0]   = latitude S flag  (0=North, 1=South)
  const highByte = (data.readUInt16BE(16) >> 8) & 0xff;
  const latSouth = Boolean(highByte & 0x01);
  const lonWest  = Boolean(highByte & 0x02);
  const course   = ((highByte >> 2) & 0x3f) * 5.625; // degrees

  let lat = latRaw / 1800000.0;
  let lng = lngRaw / 1800000.0;
  if (latSouth) lat = -lat;
  if (lonWest)  lng = -lng;

  const timestamp = new Date(Date.UTC(year, month - 1, day, hour, min, sec));

  return { lat, lng, speed, course, timestamp, satellites };
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

  // CRC covers: [proto] through [last serial byte] inclusive
  const crcCalc = calcCRC(buf.slice(3, 4 + dataLen + 2));
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
    socket.on("close",  ()    => console.log(`[GT06] Connection closed ${remoteAddr} (IMEI: ${imei ?? "unknown"})`));
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

      // Look up the registered vehicle
      const vehicle = await storage.getVehicleByDeviceId(deviceImei);
      if (vehicle) {
        setVehicleId(vehicle.id);
        console.log(`[GT06] Matched vehicle: ${vehicle.name} (${vehicle.id})`);
      } else {
        console.warn(`[GT06] Unknown device IMEI: ${deviceImei} — not registered in fleet`);
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

      const loc = parseLocation(pkt.data);
      if (!loc) {
        console.warn(`[GT06] Could not parse location packet from ${deviceImei}`);
        break;
      }

      console.log(`[GT06] Location ${deviceImei}: lat=${loc.lat.toFixed(6)}, lng=${loc.lng.toFixed(6)}, speed=${loc.speed} km/h, sats=${loc.satellites}`);

      // Store location and update vehicle status
      const location = await storage.createDeviceLocation(
        vehicleId,
        loc.lat,
        loc.lng,
        loc.speed,
        null,
        null,
        loc.timestamp,
      );

      const status = loc.speed > 5 ? "active" : "stopped";
      await storage.updateVehicle(vehicleId, { status });

      // Trigger geofence checks and broadcast to WebSocket clients
      checkGeofences(location).catch((e) => console.error("[GT06] Geofence error:", e));
      checkSpeedViolation(location).catch((e) => console.error("[GT06] Speed check error:", e));
      broadcastLocationUpdate(location);

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
