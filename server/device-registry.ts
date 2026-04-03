/**
 * Shared device registry — single source of truth for live GT06 TCP state.
 *
 * Imported by both gt06-server.ts (writes) and routes.ts (reads).
 * All state is in-memory; it resets on server restart, which is expected.
 *
 * Bounded retention: unknown IMEI log and rejection log are capped to prevent
 * unbounded memory growth over long server uptime.
 */

const MAX_UNKNOWN_IMEIS = 500;
const MAX_REJECTION_ENTRIES = 1000;
const MAX_RAW_ATTEMPTS = 200;

// ─── Active TCP Connections ───────────────────────────────────────────────
export interface ActiveConnection {
  imei: string;
  remoteAddr: string;
  connectedAt: Date;
  lastPacketAt: Date;
  packetCount: number;
}

export const activeConnections = new Map<string, ActiveConnection>();

export function getActiveConnections(): ActiveConnection[] {
  return Array.from(activeConnections.values());
}

// ─── Unknown IMEI Log ─────────────────────────────────────────────────────
export interface UnknownImeiEntry {
  imei: string;
  remoteAddr: string;
  seenAt: Date;
  connectCount: number;
}

const unknownImeiLog = new Map<string, UnknownImeiEntry>();

export function logUnknownImei(imei: string, remoteAddr: string): void {
  const existing = unknownImeiLog.get(imei);
  if (existing) {
    existing.seenAt = new Date();
    existing.remoteAddr = remoteAddr;
    existing.connectCount += 1;
  } else {
    // Evict oldest entry when at capacity (delete first inserted key)
    if (unknownImeiLog.size >= MAX_UNKNOWN_IMEIS) {
      const oldestKey = unknownImeiLog.keys().next().value;
      if (oldestKey !== undefined) unknownImeiLog.delete(oldestKey);
    }
    unknownImeiLog.set(imei, {
      imei,
      remoteAddr,
      seenAt: new Date(),
      connectCount: 1,
    });
  }
}

export function getUnknownImeiLog(): UnknownImeiEntry[] {
  return Array.from(unknownImeiLog.values()).sort(
    (a, b) => b.seenAt.getTime() - a.seenAt.getTime()
  );
}

// ─── Per-IMEI Rejection Log ───────────────────────────────────────────────
export interface RejectionEntry {
  imei: string;
  reason: string;
  rejectedAt: Date;
  count: number;
}

const rejectionLog = new Map<string, RejectionEntry>();

export function logRejection(imei: string, reason: string): void {
  const existing = rejectionLog.get(imei);
  if (existing) {
    existing.reason = reason;
    existing.rejectedAt = new Date();
    existing.count += 1;
  } else {
    // Evict oldest entry when at capacity
    if (rejectionLog.size >= MAX_REJECTION_ENTRIES) {
      const oldestKey = rejectionLog.keys().next().value;
      if (oldestKey !== undefined) rejectionLog.delete(oldestKey);
    }
    rejectionLog.set(imei, {
      imei,
      reason,
      rejectedAt: new Date(),
      count: 1,
    });
  }
}

export function getRejectionLog(): RejectionEntry[] {
  return Array.from(rejectionLog.values());
}

export function getRejectionForImei(imei: string): RejectionEntry | undefined {
  return rejectionLog.get(imei);
}

// ─── Raw TCP Connection Attempts ─────────────────────────────────────────
// Records the first raw bytes from every new TCP connection.
// loginCompleted is set to true when a valid 0x01 login packet is parsed.
// This lets the admin see devices that connect at the TCP level but never
// complete the GT06 handshake (e.g. wrong packet format, unsupported protocol).
export interface RawAttemptEntry {
  remoteAddr: string;  // full IP:port
  seenAt: Date;
  rawHex: string;      // first 16 bytes in hex
  loginCompleted: boolean;
}

const rawAttemptLog: RawAttemptEntry[] = [];

export function logRawAttempt(remoteAddr: string, rawHex: string): void {
  if (rawAttemptLog.length >= MAX_RAW_ATTEMPTS) {
    rawAttemptLog.shift(); // evict oldest
  }
  rawAttemptLog.push({
    remoteAddr,
    seenAt: new Date(),
    rawHex,
    loginCompleted: false,
  });
}

export function markAttemptLoginComplete(remoteAddr: string): void {
  // Walk backwards — most recent entry for this addr is most likely the right one
  for (let i = rawAttemptLog.length - 1; i >= 0; i--) {
    if (rawAttemptLog[i].remoteAddr === remoteAddr) {
      rawAttemptLog[i].loginCompleted = true;
      break;
    }
  }
}

export function getRawAttemptLog(): RawAttemptEntry[] {
  return [...rawAttemptLog].sort((a, b) => b.seenAt.getTime() - a.seenAt.getTime());
}

// ─── Per-IMEI Packet Statistics ───────────────────────────────────────────
// Tracks GPS-location packet throughput since last server start.
// "received"  = GPS location packet arrived from a known, registered device
// "accepted"  = passed filter pipeline and was written to DB
// "rejected"  = parse failure OR filter pipeline rejection
// Note: heartbeat / alarm / auxiliary packets are NOT counted here — only
//       packets that carry (or attempt to carry) a GPS location fix.
export interface PacketStats {
  imei: string;
  packetsReceived: number;
  locationsAccepted: number;
  locationsRejected: number;
  lastRejectionReason: string | null;
  lastRejectionAt: Date | null;
}

const packetStatsMap = new Map<string, PacketStats>();

function ensureStats(imei: string): PacketStats {
  let s = packetStatsMap.get(imei);
  if (!s) {
    s = {
      imei,
      packetsReceived: 0,
      locationsAccepted: 0,
      locationsRejected: 0,
      lastRejectionReason: null,
      lastRejectionAt: null,
    };
    packetStatsMap.set(imei, s);
  }
  return s;
}

export function logPacketReceived(imei: string): void {
  ensureStats(imei).packetsReceived += 1;
}

export function logLocationAccepted(imei: string): void {
  ensureStats(imei).locationsAccepted += 1;
}

export function logLocationRejected(imei: string, reason: string): void {
  const s = ensureStats(imei);
  s.locationsRejected += 1;
  s.lastRejectionReason = reason;
  s.lastRejectionAt = new Date();
}

export function getPacketStats(imei: string): PacketStats | undefined {
  return packetStatsMap.get(imei);
}

export function getAllPacketStats(): PacketStats[] {
  return Array.from(packetStatsMap.values());
}
