/**
 * Shared device registry — single source of truth for live GT06 TCP state.
 *
 * Imported by both gt06-server.ts (writes) and routes.ts (reads).
 * All state is in-memory; it resets on server restart, which is expected.
 */

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
