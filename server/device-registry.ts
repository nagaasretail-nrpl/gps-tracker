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
