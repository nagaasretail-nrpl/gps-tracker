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
