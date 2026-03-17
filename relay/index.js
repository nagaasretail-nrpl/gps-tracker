/**
 * GT06N → HTTP Relay
 *
 * Accepts GT06N binary TCP connections (port 5023 by default),
 * parses the binary GT06 protocol, and forwards location data
 * to the main GPS Fleet Tracker app via HTTP.
 *
 * Deploy this on any server that can expose a raw TCP port
 * (Railway, Fly.io, Oracle Free Tier, etc.)
 *
 * Environment variables:
 *   TARGET_URL  - Full URL of the main app (e.g. https://gp-sserver-mobile-clone.replit.app)
 *   PORT        - TCP port to listen on (default: 5023)
 *   API_KEY     - Optional shared secret checked by the main app (leave blank if not configured)
 */

const net  = require("net");
const http = require("https"); // use "http" if TARGET_URL starts with http://

const TARGET_URL = process.env.TARGET_URL || "https://gp-sserver-mobile-clone.replit.app";
const TCP_PORT   = parseInt(process.env.PORT || "5023", 10);
const API_KEY    = process.env.API_KEY || "";

// ─── CRC-16/CCITT (GT06 CRC-ITU) ─────────────────────────────────────────
function calcCRC(buf) {
  let crc = 0xffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i] << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

// ─── Build ACK ────────────────────────────────────────────────────────────
function buildAck(proto, serial) {
  const buf = Buffer.alloc(10);
  buf[0] = 0x78; buf[1] = 0x78;
  buf[2] = 0x05;
  buf[3] = proto;
  buf[4] = (serial >> 8) & 0xff;
  buf[5] = serial & 0xff;
  const crc = calcCRC(buf.slice(2, 6));
  buf[6] = (crc >> 8) & 0xff;
  buf[7] = crc & 0xff;
  buf[8] = 0x0d; buf[9] = 0x0a;
  return buf;
}

// ─── Decode BCD IMEI (8 bytes → 15-digit string) ─────────────────────────
function decodeBCDimei(buf, offset) {
  let imei = "";
  for (let i = 0; i < 8; i++) {
    const b = buf[offset + i];
    imei += ((b >> 4) & 0x0f).toString() + (b & 0x0f).toString();
  }
  return imei.slice(0, 15);
}

// ─── Parse Location Data ──────────────────────────────────────────────────
function parseLocation(data) {
  if (data.length < 18) return null;

  const year  = 2000 + data[0];
  const month = data[1];
  const day   = data[2];
  const hour  = data[3];
  const min   = data[4];
  const sec   = data[5];

  const satellites = data[6] & 0x0f;
  const latRaw = data.readUInt32BE(7);
  const lngRaw = data.readUInt32BE(11);
  const speed  = data[15];

  const highByte = (data.readUInt16BE(16) >> 8) & 0xff;
  const latSouth = Boolean(highByte & 0x01);
  const lonWest  = Boolean(highByte & 0x02);

  let lat = latRaw / 1800000.0;
  let lng = lngRaw / 1800000.0;
  if (latSouth) lat = -lat;
  if (lonWest)  lng = -lng;

  const timestamp = new Date(Date.UTC(year, month - 1, day, hour, min, sec));
  return { lat, lng, speed, satellites, timestamp: timestamp.toISOString() };
}

// ─── Parse Complete GT06 Packet ───────────────────────────────────────────
function parsePacket(buf) {
  if (buf.length < 10) return null;
  if (buf[0] !== 0x78 || buf[1] !== 0x78) return null;
  if (buf[buf.length - 2] !== 0x0d || buf[buf.length - 1] !== 0x0a) return null;

  const pktLen  = buf[2];
  const dataLen = pktLen - 5;
  if (dataLen < 0 || buf.length < pktLen + 5) return null;

  const proto   = buf[3];
  const data    = buf.slice(4, 4 + dataLen);
  const serial  = buf.readUInt16BE(4 + dataLen);
  const crcGot  = buf.readUInt16BE(4 + dataLen + 2);
  const crcCalc = calcCRC(buf.slice(2, 4 + dataLen + 2));

  if (crcGot !== crcCalc) {
    console.warn(`CRC mismatch: got 0x${crcGot.toString(16)}, expected 0x${crcCalc.toString(16)}`);
  }

  return { proto, data, serial };
}

// ─── Post Location to Main App ────────────────────────────────────────────
function postLocation(imei, loc) {
  const body = JSON.stringify({
    deviceId:  imei,
    latitude:  loc.lat,
    longitude: loc.lng,
    speed:     loc.speed,
    timestamp: loc.timestamp,
  });

  const url    = new URL("/api/device/location", TARGET_URL);
  const isHttps = url.protocol === "https:";
  const mod    = isHttps ? require("https") : require("http");

  const options = {
    hostname: url.hostname,
    port:     url.port || (isHttps ? 443 : 80),
    path:     url.pathname,
    method:   "POST",
    headers: {
      "Content-Type":   "application/json",
      "Content-Length": Buffer.byteLength(body),
      ...(API_KEY ? { "X-Api-Key": API_KEY } : {}),
    },
  };

  const req = mod.request(options, (res) => {
    let raw = "";
    res.on("data", (d) => raw += d);
    res.on("end", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        console.log(`[→ API] ${imei}: ${loc.lat.toFixed(5)},${loc.lng.toFixed(5)} speed=${loc.speed}km/h → ${res.statusCode}`);
      } else {
        console.warn(`[→ API] ${imei}: HTTP ${res.statusCode} — ${raw.slice(0, 120)}`);
      }
    });
  });

  req.on("error", (e) => console.error(`[→ API] Request error for ${imei}:`, e.message));
  req.write(body);
  req.end();
}

// ─── TCP Server ───────────────────────────────────────────────────────────
const server = net.createServer((socket) => {
  const remote = `${socket.remoteAddress}:${socket.remotePort}`;
  let imei   = null;
  let rxBuf  = Buffer.alloc(0);

  console.log(`[+] Connection from ${remote}`);

  socket.on("data", (chunk) => {
    rxBuf = Buffer.concat([rxBuf, chunk]);

    while (rxBuf.length >= 10) {
      const startIdx = rxBuf.indexOf(Buffer.from([0x78, 0x78]));
      if (startIdx < 0)  { rxBuf = Buffer.alloc(0); break; }
      if (startIdx > 0)  { rxBuf = rxBuf.slice(startIdx); }
      if (rxBuf.length < 5) break;

      const pktLen   = rxBuf[2];
      const totalLen = pktLen + 5;
      if (rxBuf.length < totalLen) break;

      const rawPacket = rxBuf.slice(0, totalLen);
      rxBuf = rxBuf.slice(totalLen);

      const pkt = parsePacket(rawPacket);
      if (!pkt) continue;

      if (pkt.proto === 0x01) {
        // Login packet
        if (pkt.data.length >= 8) {
          imei = decodeBCDimei(pkt.data, 0);
          console.log(`[LOGIN] IMEI: ${imei}`);
        }
        socket.write(buildAck(0x01, pkt.serial));
      }
      else if (pkt.proto === 0x12) {
        // Location packet
        if (imei) {
          const loc = parseLocation(pkt.data);
          if (loc) postLocation(imei, loc);
          else console.warn(`[LOC] Could not parse location from ${imei}`);
        } else {
          console.warn(`[LOC] Location before login from ${remote}`);
        }
        socket.write(buildAck(0x12, pkt.serial));
      }
      else if (pkt.proto === 0x13) {
        // Heartbeat
        if (imei) console.log(`[HBT] ${imei}`);
        socket.write(buildAck(0x13, pkt.serial));
      }
      else {
        socket.write(buildAck(pkt.proto, pkt.serial));
      }
    }
  });

  socket.on("error",  (e) => console.warn(`[!] ${remote}: ${e.message}`));
  socket.on("close",  ()  => console.log(`[-] Closed ${remote} (IMEI: ${imei ?? "unknown"})`));
  socket.setTimeout(120_000, () => socket.destroy());
});

server.listen(TCP_PORT, "0.0.0.0", () => {
  console.log(`GT06N Relay listening on TCP port ${TCP_PORT}`);
  console.log(`Forwarding location data to: ${TARGET_URL}/api/device/location`);
});

server.on("error", (e) => console.error("Server error:", e.message));
