import webPush from "web-push";
import { storage } from "./storage";

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:admin@nistagps.com";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
}

// Send a push notification to all subscriptions for a given user
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

  const subscriptions = await storage.getPushSubscriptionsByUser(userId);
  if (subscriptions.length === 0) return;

  const payloadStr = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/tracking",
    icon: payload.icon ?? "/nista-logo.png",
  });

  for (const sub of subscriptions) {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payloadStr
      );
    } catch (err: unknown) {
      const status = (err as { statusCode?: number })?.statusCode;
      // 410 Gone = subscription expired/unsubscribed; remove it
      if (status === 410 || status === 404) {
        await storage.deletePushSubscription(userId, sub.endpoint).catch(() => {});
      } else {
        console.error("[push] sendNotification error:", err instanceof Error ? err.message : err);
      }
    }
  }
}

// 5-minute server-side debounce per userId:alertType
const pushDebounce = new Map<string, number>();
const PUSH_COOLDOWN_MS = 5 * 60 * 1000;

export function canSendPush(userId: string, alertType: string): boolean {
  const key = `${userId}:${alertType}`;
  const last = pushDebounce.get(key) ?? 0;
  return Date.now() - last > PUSH_COOLDOWN_MS;
}

export function markPushSent(userId: string, alertType: string): void {
  pushDebounce.set(`${userId}:${alertType}`, Date.now());
}

export { VAPID_PUBLIC_KEY };

// Vehicle snapshot type used by sendPushAlertsForLocation
export interface VehicleSnapshot {
  id: string;
  name: string;
  status: string;
  parkedSince?: Date | null;
}

/**
 * Check speed/parking/idle thresholds for all users who have push subscriptions
 * and whose allowed vehicle list includes this vehicle, then send push notifications.
 *
 * Call this after every GPS location update (both HTTP /api/device/location and GT06 TCP).
 *
 * @param vehicle - post-update vehicle snapshot (must reflect current status/parkedSince)
 * @param speedKph - current speed in km/h
 */
export async function sendPushAlertsForLocation(
  vehicle: VehicleSnapshot,
  speedKph: number
): Promise<void> {
  const allSubs = await storage.getAllPushSubscriptions();
  if (allSubs.length === 0) return;

  const userIds = [...new Set(allSubs.map(s => s.userId))];

  for (const userId of userIds) {
    // Enforce per-user vehicle access control:
    // admins see all vehicles; non-admins only their allowedVehicleIds.
    const userRecord = await storage.getUserById(userId);
    if (!userRecord) continue;
    if (userRecord.role !== "admin") {
      const allowed = userRecord.allowedVehicleIds ?? [];
      if (allowed.length === 0 || !allowed.includes(vehicle.id)) continue;
    }

    const settings = await storage.getUserAlertSettings(userId);
    if (!settings) continue;

    // Speed alert — fires regardless of stopped/active status
    if (settings.speedAlertEnabled && speedKph > settings.speedThresholdKph) {
      if (canSendPush(userId, `speed:${vehicle.id}`)) {
        await sendPushToUser(userId, {
          title: `Speed Alert — ${vehicle.name}`,
          body: `Speed ${speedKph.toFixed(0)} km/h exceeds limit of ${settings.speedThresholdKph} km/h`,
          url: "/tracking",
        });
        markPushSent(userId, `speed:${vehicle.id}`);
      }
    }

    // Parking alert — only when vehicle is confirmed stopped (post-update status check)
    if (
      settings.parkingAlertEnabled &&
      vehicle.status === "stopped" &&
      vehicle.parkedSince
    ) {
      const parkedMin = (Date.now() - new Date(vehicle.parkedSince).getTime()) / 60000;
      if (parkedMin >= settings.parkingThresholdMin) {
        if (canSendPush(userId, `parking:${vehicle.id}`)) {
          await sendPushToUser(userId, {
            title: `Parking Alert — ${vehicle.name}`,
            body: `Vehicle has been parked for ${Math.floor(parkedMin)} minutes`,
            url: "/tracking",
          });
          markPushSent(userId, `parking:${vehicle.id}`);
        }
      }
    }

    // Idle alert — vehicle stopped (speed ≤ 5) with parkedSince set, explicit status guard
    if (
      settings.idleAlertEnabled &&
      speedKph <= 5 &&
      vehicle.status === "stopped" &&
      vehicle.parkedSince
    ) {
      const idleMin = (Date.now() - new Date(vehicle.parkedSince).getTime()) / 60000;
      if (idleMin >= settings.idleThresholdMin) {
        if (canSendPush(userId, `idle:${vehicle.id}`)) {
          await sendPushToUser(userId, {
            title: `Idle Alert — ${vehicle.name}`,
            body: `Vehicle has been idle for ${Math.floor(idleMin)} minutes`,
            url: "/tracking",
          });
          markPushSent(userId, `idle:${vehicle.id}`);
        }
      }
    }
  }
}
