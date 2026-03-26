import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { checkGeofences, checkSpeedViolation, setEventBroadcaster } from "./geofence-monitor";
import { setLocationBroadcaster, setVehicleBroadcaster } from "./broadcaster";
import { getActiveConnections } from "./gt06-server";
import { authRoutes } from "./auth-routes";
import { requireAuth, requireAdmin } from "./auth";
import { filterIncomingLocation, type LastKnownLocation } from "./lib/locationFilter";
import { z } from "zod";
import crypto from "crypto";
import Razorpay from "razorpay";
import {
  insertVehicleSchema,
  updateVehicleSchema,
  insertLocationSchema,
  insertGeofenceSchema,
  insertRouteSchema,
  insertPoiSchema,
  insertEventSchema,
  insertTripSchema,
  insertUserSchema,
  insertActivitySchema,
  updateProfileSchema,
  adminUpdateUserSchema,
  insertUserAlertSettingsSchema,
  type User,
} from "@shared/schema";

// In-memory log of unrecognised device IDs (last 20 attempts)
const unknownDeviceLog: { deviceId: string; lat: number; lng: number; speed: number; seenAt: string }[] = [];

// Subscription plan type
interface SubscriptionPlan {
  name: string;
  maxVehicles: number;
  pricePerYear: number;
}

// Compute vehicle count + matched plan + amount for a given user
async function getSubscriptionPricingForUser(userId: string): Promise<{
  vehicleCount: number;
  planName: string | null;
  unitRate: number | null;   // per-vehicle price
  amount: number | null;     // total = unitRate × vehicleCount (charged amount)
}> {
  const user = await storage.getUser(userId);
  if (!user) return { vehicleCount: 0, planName: null, unitRate: null, amount: null };

  let vehicleCount: number;
  if (user.allowedVehicleIds && user.allowedVehicleIds.length > 0) {
    vehicleCount = user.allowedVehicleIds.length;
  } else {
    const allVehicles = await storage.getVehicles();
    vehicleCount = allVehicles.length;
  }

  const plansSetting = await storage.getSetting("subscription_plans");
  if (plansSetting?.value) {
    try {
      const plans: SubscriptionPlan[] = JSON.parse(plansSetting.value);
      if (Array.isArray(plans) && plans.length > 0) {
        // Match plan by the user's assigned subscriptionType name (case-insensitive).
        // Fall back to the plan with the smallest vehicle quota if no exact match.
        const userPlanKey = (user.subscriptionType ?? "").toLowerCase();
        const matched =
          plans.find(p => p.name.toLowerCase() === userPlanKey) ??
          [...plans].sort((a, b) => a.pricePerYear - b.pricePerYear)[0];
        const unitRate = matched.pricePerYear;
        const amount = unitRate * Math.max(vehicleCount, 1);
        return { vehicleCount, planName: matched.name, unitRate, amount };
      }
    } catch {
      // fall through to renewal_amount
    }
  }

  // Fallback: fixed renewal_amount setting (no per-vehicle scaling)
  const amountSetting = await storage.getSetting("renewal_amount");
  const flat = amountSetting ? parseInt(amountSetting.value, 10) : null;
  const amount = flat && !isNaN(flat) ? flat : null;
  return { vehicleCount, planName: null, unitRate: null, amount };
}

// DB-backed idempotency helpers for processed Razorpay payment IDs
async function isPaymentProcessed(paymentId: string): Promise<boolean> {
  const setting = await storage.getSetting("processed_payment_ids");
  const ids: string[] = setting ? JSON.parse(setting.value) : [];
  return ids.includes(paymentId);
}

async function markPaymentProcessed(paymentId: string): Promise<void> {
  const setting = await storage.getSetting("processed_payment_ids");
  const ids: string[] = setting ? JSON.parse(setting.value) : [];
  if (!ids.includes(paymentId)) {
    ids.push(paymentId);
    // Keep list bounded (last 1000 payment IDs)
    const trimmed = ids.slice(-1000);
    await storage.setSetting("processed_payment_ids", JSON.stringify(trimmed));
  }
}

// Returns null for admin (all vehicles allowed) or the specific allowed vehicle IDs for regular users.
// An empty array means the user has no vehicles assigned.
// Always fetches the persisted user from storage so role changes take effect immediately.
async function getAllowedVehicleIds(reqUser: { id: string; role: string }): Promise<string[] | null> {
  const user = await storage.getUserById(reqUser.id);
  if (!user) return [];
  if (user.role === "admin") return null;
  return user.allowedVehicleIds ?? [];
}

// Auto-expiry middleware: after requireAuth, auto-set non-admin users to inactive
// when their subscriptionExpiry has passed. Skip for /api/auth/* and /api/payments/*.
async function checkSubscriptionExpiry(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return next();
  const user = req.user as { id: string; role: string; subscriptionExpiry?: Date | null };
  if (user.role === "admin") return next();
  if (!user.subscriptionExpiry) return next();

  const now = new Date();
  const expiry = new Date(user.subscriptionExpiry);

  if (expiry < now) {
    // Mark inactive (fire-and-forget secondary check; /api/auth/me does it authoritatively)
    storage.updateUser(user.id, { status: "inactive" }).catch((err) =>
      console.error("[expiry] Failed to set user inactive:", err)
    );
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (public)
  app.use("/api/auth", authRoutes);

  // Apply subscription expiry check to all authenticated API routes
  // (skips /api/auth/* and /api/payments/* which are handled separately)
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/") || req.path.startsWith("/payments/")) return next();
    return checkSubscriptionExpiry(req, res, next);
  });

  // Payment routes (require auth but skip expiry check so inactive users can pay)

  // Check if payment gateway is configured and return dynamic pricing for this user
  app.get("/api/payments/status", requireAuth, async (req, res) => {
    try {
      const keyId = (await storage.getSetting("razorpay_key_id"))?.value || "";
      const keySecret = (await storage.getSetting("razorpay_key_secret"))?.value || "";
      const userId = (req.user as { id: string }).id;
      const { vehicleCount, planName, unitRate, amount } = await getSubscriptionPricingForUser(userId);
      const configured = !!(keyId && keySecret && amount && amount > 0);
      res.json({
        configured,
        amount: configured ? amount : null,
        unitRate: configured ? unitRate : null,
        vehicleCount,
        planName,
      });
    } catch {
      res.json({ configured: false, amount: null, vehicleCount: 0, planName: null });
    }
  });

  app.post("/api/payments/create-order", requireAuth, async (req, res) => {
    try {
      const keyId = (await storage.getSetting("razorpay_key_id"))?.value || "";
      const keySecret = (await storage.getSetting("razorpay_key_secret"))?.value || "";

      if (!keyId || !keySecret) {
        return res.status(503).json({ error: "Payment gateway not configured. Contact administrator." });
      }

      const userId = (req.user as { id: string }).id;
      const { amount } = await getSubscriptionPricingForUser(userId);

      if (!amount || amount <= 0) {
        return res.status(503).json({ error: "No subscription plan configured. Contact administrator." });
      }

      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const order = await razorpay.orders.create({
        amount: amount * 100, // paise
        currency: "INR",
        receipt: `renewal_${userId}_${Date.now()}`,
      });

      res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId });
    } catch (error) {
      console.error("[payments] create-order error:", error);
      res.status(500).json({ error: "Failed to create payment order" });
    }
  });

  app.post("/api/payments/verify", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        razorpayOrderId: z.string().min(1),
        razorpayPaymentId: z.string().min(1),
        razorpaySignature: z.string().min(1),
      });
      const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = schema.parse(req.body);

      // Idempotency: reject already-processed payment IDs (DB-backed, survives restarts)
      if (await isPaymentProcessed(razorpayPaymentId)) {
        return res.status(409).json({ error: "Payment already processed" });
      }

      const keyId = (await storage.getSetting("razorpay_key_id"))?.value || "";
      const keySecret = (await storage.getSetting("razorpay_key_secret"))?.value || "";
      if (!keyId || !keySecret) {
        return res.status(503).json({ error: "Payment gateway not configured." });
      }

      // Step 1: HMAC-SHA256 signature verification
      const expectedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");

      if (expectedSignature !== razorpaySignature) {
        return res.status(400).json({ error: "Payment signature verification failed" });
      }

      // Step 2: Fetch payment from Razorpay API to confirm captured status & amount
      const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      const payment = await razorpay.payments.fetch(razorpayPaymentId);

      if (payment.status !== "captured") {
        return res.status(400).json({ error: "Payment not captured. Please try again." });
      }

      // Step 3: Verify the order ID on the payment matches what we created
      if (payment.order_id !== razorpayOrderId) {
        return res.status(400).json({ error: "Order ID mismatch. Payment rejected." });
      }

      // Step 4: Verify amount matches dynamically calculated renewal amount for this user
      const userId = (req.user as { id: string }).id;
      const { amount: expectedAmountINR } = await getSubscriptionPricingForUser(userId);
      if (!expectedAmountINR || expectedAmountINR <= 0) {
        return res.status(503).json({ error: "Subscription plan not configured. Contact administrator." });
      }
      const expectedAmountPaise = expectedAmountINR * 100;
      if (Number(payment.amount) !== expectedAmountPaise) {
        console.error(`[payments] Amount mismatch: expected ${expectedAmountPaise}, got ${payment.amount}`);
        return res.status(400).json({ error: "Payment amount mismatch. Please contact support." });
      }

      // Mark payment ID as processed in DB before updating user (durable idempotency)
      await markPaymentProcessed(razorpayPaymentId);

      // Renewal date: 1 year from the day AFTER the previous expiry (preserves original subscription calendar)
      const freshUser = await storage.getUser(userId);
      let base: Date;
      if (freshUser?.subscriptionExpiry) {
        base = new Date(freshUser.subscriptionExpiry);
        base.setDate(base.getDate() + 1); // next day after previous expiry
      } else {
        base = new Date(); // no prior expiry — start from today
      }
      const newExpiry = new Date(base);
      newExpiry.setFullYear(newExpiry.getFullYear() + 1);

      await storage.updateUser(userId, {
        status: "active",
        subscriptionExpiry: newExpiry,
      });

      res.json({ ok: true, newExpiry: newExpiry.toISOString() });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      console.error("[payments] verify error:", error);
      res.status(500).json({ error: "Payment verification failed" });
    }
  });

  // Return recent unknown device IDs — useful for diagnosing IMEI mismatches
  app.get("/api/device/unknown", requireAuth, (_req, res) => {
    res.json(unknownDeviceLog);
  });

  // Public device data ingestion endpoint (no session auth — uses deviceId as identifier)
  app.post("/api/device/location", async (req, res) => {
    try {
      const schema = z.object({
        deviceId: z.string().min(1),
        latitude: z.number(),
        longitude: z.number(),
        speed: z.number().optional().default(0),
        altitude: z.number().optional().nullable(),
        accuracy: z.number().optional().nullable(),
        timestamp: z.string().optional(),
      });

      const data = schema.parse(req.body);
      console.log(`[device] Incoming location — deviceId: "${data.deviceId}", lat: ${data.latitude}, lng: ${data.longitude}, speed: ${data.speed}`);

      const vehicle = await storage.getVehicleByDeviceId(data.deviceId);

      if (!vehicle) {
        console.log(`[device] No vehicle found with deviceId: "${data.deviceId}"`);
        // Record for diagnostic display in the UI
        const existing = unknownDeviceLog.findIndex(e => e.deviceId === data.deviceId);
        const entry = { deviceId: data.deviceId, lat: data.latitude, lng: data.longitude, speed: data.speed ?? 0, seenAt: new Date().toISOString() };
        if (existing >= 0) unknownDeviceLog[existing] = entry;
        else unknownDeviceLog.unshift(entry);
        if (unknownDeviceLog.length > 20) unknownDeviceLog.pop();
        return res.status(404).json({ error: "Device not registered. Add the vehicle in the app first.", receivedDeviceId: data.deviceId });
      }

      // Run through the location filter pipeline
      const lastLoc = await storage.getLatestLocationForVehicle(vehicle.id);
      const lastKnown: LastKnownLocation | null = lastLoc ? {
        lat: parseFloat(String(lastLoc.latitude)),
        lng: parseFloat(String(lastLoc.longitude)),
        timestamp: lastLoc.timestamp,
        speedKph: lastLoc.speed ? parseFloat(String(lastLoc.speed)) : null,
      } : null;

      const filterResult = filterIncomingLocation({
        imei: data.deviceId,
        lat: data.latitude,
        lng: data.longitude,
        speedKph: data.speed ?? 0,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      }, lastKnown);

      if (!filterResult.accepted) {
        console.log(`[device][FILTER] ${data.deviceId} rejected: ${filterResult.reason}${filterResult.details ? ` — ${filterResult.details}` : ""}`);
        return res.json({ ok: false, filtered: true, reason: filterResult.reason });
      }

      const filtered = filterResult.location;

      const location = await storage.createDeviceLocation(
        vehicle.id,
        filtered.lat,
        filtered.lng,
        filtered.speedKph ?? data.speed ?? 0,
        data.altitude ?? null,
        data.accuracy ?? null,
        filtered.timestamp,
        null,
        filtered.heading,
        filtered.isStationary,
        filtered.accuracyScore,
      );

      const speed = filtered.speedKph ?? data.speed ?? 0;
      const newStatus = speed > 5 ? "active" : "stopped";
      let parkedSince: Date | null | undefined = undefined;
      if (newStatus === "stopped" && vehicle.status !== "stopped") {
        parkedSince = new Date();
      } else if (newStatus === "active" && vehicle.status === "stopped") {
        parkedSince = null;
      }
      const vehicleUpdate: { status: string; parkedSince?: Date | null } = { status: newStatus };
      if (parkedSince !== undefined) vehicleUpdate.parkedSince = parkedSince;
      await storage.updateVehicle(vehicle.id, vehicleUpdate);

      checkGeofences(location).catch(err => console.error("Geofence check error:", err));
      checkSpeedViolation(location).catch(err => console.error("Speed check error:", err));
      broadcastLocation(location);

      res.status(201).json({ ok: true, vehicleId: vehicle.id, status });
    } catch (error) {
      console.error("Device location error:", error);
      res.status(400).json({ error: "Invalid data", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Vehicles (protected routes)
  app.get("/api/vehicles", requireAuth, async (req, res) => {
    try {
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      const vehicles = await storage.getVehicles();
      const filtered = allowedIds === null ? vehicles : vehicles.filter(v => allowedIds.includes(v.id));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      if (allowedIds !== null && !allowedIds.includes(req.params.id)) {
        return res.status(403).json({ error: "Access denied" });
      }
      const vehicle = await storage.getVehicle(req.params.id);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicle" });
    }
  });

  app.post("/api/vehicles", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid vehicle data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create vehicle", details: error instanceof Error ? error.message : String(error) });
    }
  });

  // Bulk create vehicles (per-row safeParse so malformed rows become errors, not 400s)
  app.post("/api/vehicles/bulk", requireAdmin, async (req, res) => {
    try {
      const bodySchema = z.object({ vehicles: z.array(z.unknown()) });
      const { vehicles: rawRows } = bodySchema.parse(req.body);
      if (!Array.isArray(rawRows) || rawRows.length === 0) {
        return res.status(400).json({ error: "No vehicles provided" });
      }
      let created = 0;
      const errors: string[] = [];
      for (let i = 0; i < rawRows.length; i++) {
        const parsed = insertVehicleSchema.safeParse(rawRows[i]);
        if (!parsed.success) {
          const raw = rawRows[i] as Record<string, unknown>;
          const label = raw?.name ? `"${raw.name}"` : `Row ${i + 1}`;
          errors.push(`${label}: ${parsed.error.errors.map(e => e.message).join("; ")}`);
          continue;
        }
        try {
          await storage.createVehicle(parsed.data);
          created++;
        } catch (err) {
          const label = parsed.data.name ? `"${parsed.data.name}" (${parsed.data.deviceId})` : `Row ${i + 1}`;
          errors.push(`${label}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
      res.status(201).json({ created, errors });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request body", details: error.errors });
      }
      res.status(500).json({ error: "Bulk create failed", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.patch("/api/vehicles/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = updateVehicleSchema.parse(req.body);
      const updates = {
        ...parsed,
        fuelEfficiency: parsed.fuelEfficiency !== undefined
          ? (parsed.fuelEfficiency === null ? null : String(parsed.fuelEfficiency))
          : undefined,
        fuelRatePerLiter: parsed.fuelRatePerLiter !== undefined
          ? (parsed.fuelRatePerLiter === null ? null : String(parsed.fuelRatePerLiter))
          : undefined,
        fuelTankCapacity: parsed.fuelTankCapacity !== undefined
          ? (parsed.fuelTankCapacity === null ? null : String(parsed.fuelTankCapacity))
          : undefined,
      };
      const vehicle = await storage.updateVehicle(req.params.id, updates);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid vehicle data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update vehicle", details: error instanceof Error ? error.message : String(error) });
    }
  });

  app.delete("/api/vehicles/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteVehicle(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete vehicle" });
    }
  });

  // Locations (protected routes)
  app.get("/api/locations", requireAuth, async (req, res) => {
    try {
      const { vehicleId, activityId, startDate, endDate } = req.query;
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      if (vehicleId && allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
        return res.json([]);
      }
      const locations = (await storage.getLocations(
        vehicleId as string,
        activityId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )) ?? [];
      const filtered = allowedIds === null ? locations : locations.filter(l => l.vehicleId && allowedIds.includes(l.vehicleId));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/latest", requireAuth, async (req, res) => {
    try {
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      const locations = (await storage.getLatestLocations()) ?? [];
      const filtered = allowedIds === null ? locations : locations.filter(l => l.vehicleId && allowedIds.includes(l.vehicleId));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest locations" });
    }
  });

  app.get("/api/locations/history", requireAuth, async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      if (!vehicleId || !startDate || !endDate) {
        return res.status(400).json({ error: "vehicleId, startDate, and endDate are required" });
      }
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      if (allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
        return res.json([]);
      }
      const locations = await storage.getLocationHistory(
        vehicleId as string,
        new Date(startDate as string),
        new Date(endDate as string)
      );
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch location history" });
    }
  });

  app.get("/api/locations/trips", requireAuth, async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      }

      type LocRow = Awaited<ReturnType<typeof storage.getLocationHistory>>[number];

      interface TripSegment {
        vehicleId: string; date: string; startTime: string; endTime: string;
        startLat: number; startLng: number; startAddress: string | null;
        endLat: number; endLng: number; endAddress: string | null;
        distanceKm: number; durationSec: number; idleTimeSec: number;
        stopCount: number; avgSpeedKmh: number;
      }

      function isValidGpsPoint(loc: LocRow): boolean {
        if (!loc.timestamp) return false;
        const tsMs = new Date(loc.timestamp).getTime();
        if (!isFinite(tsMs) || tsMs <= 0) return false;
        const lat = parseFloat(String(loc.latitude));
        const lng = parseFloat(String(loc.longitude));
        if (!isFinite(lat) || !isFinite(lng)) return false;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
        if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false;
        const spd = parseFloat(String(loc.speed || "0")) || 0;
        if (spd > 300) return false;
        return true;
      }

      function detectSegments(locs: LocRow[], vid: string) {
        const SPEED_THRESHOLD = 3;
        const STOP_GAP_MS = 5 * 60 * 1000;
        const IDLE_MIN_MS = 2 * 60 * 1000;
        const MAX_LEG_SPEED_KMH = 200;

        const sorted = [...locs]
          .filter(isValidGpsPoint)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const segments: TripSegment[] = [];

        function finishSegment(pts: LocRow[]) {
          if (pts.length < 2) return;
          const s = pts[0], e = pts[pts.length - 1];
          let distKm = 0, idleMs = 0, stopCount = 0, speedSum = 0, speedCount = 0;
          let idleStart: number | null = null;
          for (let i = 0; i < pts.length; i++) {
            const spd = parseFloat(String(pts[i].speed || "0")) || 0;
            const ts = new Date(pts[i].timestamp).getTime();
            if (i > 0) {
              const legDist = haversine(parseFloat(String(pts[i-1].latitude)), parseFloat(String(pts[i-1].longitude)), parseFloat(String(pts[i].latitude)), parseFloat(String(pts[i].longitude)));
              const timeDiffH = (ts - new Date(pts[i-1].timestamp).getTime()) / 3_600_000;
              const impliedSpeed = timeDiffH > 0 ? legDist / timeDiffH : 9999;
              if (impliedSpeed <= MAX_LEG_SPEED_KMH) distKm += legDist;
              if (spd < SPEED_THRESHOLD) {
                if (idleStart == null) idleStart = new Date(pts[i - 1].timestamp).getTime();
              } else {
                if (idleStart != null) {
                  const dur = ts - idleStart;
                  idleMs += dur;
                  if (dur >= IDLE_MIN_MS) stopCount++;
                  idleStart = null;
                }
                speedSum += spd;
                speedCount++;
              }
            }
          }
          if (idleStart != null) {
            const dur = new Date(e.timestamp).getTime() - idleStart;
            idleMs += dur;
            if (dur >= IDLE_MIN_MS) stopCount++;
          }
          const startTs = new Date(s.timestamp);
          const endTs = new Date(e.timestamp);
          const dateKey = startTs.toISOString().slice(0, 10);
          segments.push({
            vehicleId: vid,
            date: dateKey,
            startTime: startTs.toISOString(),
            endTime: endTs.toISOString(),
            startLat: parseFloat(String(s.latitude)),
            startLng: parseFloat(String(s.longitude)),
            startAddress: s.address || null,
            endLat: parseFloat(String(e.latitude)),
            endLng: parseFloat(String(e.longitude)),
            endAddress: e.address || null,
            distanceKm: Math.round(distKm * 100) / 100,
            durationSec: Math.round((endTs.getTime() - startTs.getTime()) / 1000),
            idleTimeSec: Math.round(idleMs / 1000),
            stopCount,
            avgSpeedKmh: speedCount > 0 ? Math.round(speedSum / speedCount * 10) / 10 : 0,
          });
        }

        let segPts: LocRow[] = [];
        let lowSpeedSince: number | null = null;

        for (const loc of sorted) {
          const spd = parseFloat(String(loc.speed || "0")) || 0;
          const ts = new Date(loc.timestamp).getTime();
          if (segPts.length === 0) {
            if (spd >= SPEED_THRESHOLD) { segPts = [loc]; lowSpeedSince = null; }
          } else {
            segPts.push(loc);
            if (spd < SPEED_THRESHOLD) {
              if (lowSpeedSince == null) lowSpeedSince = ts;
              else if (ts - lowSpeedSince >= STOP_GAP_MS) {
                let endIdx = segPts.length - 1;
                while (endIdx > 0 && (parseFloat(String(segPts[endIdx].speed || "0")) || 0) < SPEED_THRESHOLD) endIdx--;
                finishSegment(segPts.slice(0, endIdx + 1));
                segPts = []; lowSpeedSince = null;
              }
            } else { lowSpeedSince = null; }
          }
        }

        if (segPts.length >= 2) {
          let endIdx = segPts.length - 1;
          while (endIdx > 0 && (parseFloat(String(segPts[endIdx].speed || "0")) || 0) < SPEED_THRESHOLD) endIdx--;
          finishSegment(segPts.slice(0, endIdx + 1));
        }

        return segments;
      }

      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });

      let vehicleIds: string[];
      if (vehicleId && vehicleId !== "all") {
        if (allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
          return res.json([]);
        }
        vehicleIds = [vehicleId as string];
      } else {
        const allVehicles = await storage.getVehicles();
        const allIds = allVehicles.map(v => v.id);
        vehicleIds = allowedIds === null ? allIds : allIds.filter(id => allowedIds.includes(id));
      }

      const allSegments: TripSegment[] = [];
      await Promise.all(vehicleIds.map(async (vid) => {
        const locs = await storage.getLocationHistory(vid, start, end);
        const segs = detectSegments(locs, vid);
        allSegments.push(...segs);
      }));

      res.json(allSegments);
    } catch (error) {
      console.error("Failed to compute trip segments:", error);
      res.status(500).json({ error: "Failed to compute trip segments" });
    }
  });

  // ── Parking Events Report ──────────────────────────────────────────────────
  app.get("/api/reports/parking", requireAuth, async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      if (!startDate || !endDate) {
        return res.status(400).json({ error: "startDate and endDate are required" });
      }
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);

      type LocRow = Awaited<ReturnType<typeof storage.getLocationHistory>>[number];

      function isValidGpsPoint(loc: LocRow): boolean {
        if (!loc.timestamp) return false;
        const tsMs = new Date(loc.timestamp).getTime();
        if (!isFinite(tsMs) || tsMs <= 0) return false;
        const lat = parseFloat(String(loc.latitude));
        const lng = parseFloat(String(loc.longitude));
        if (!isFinite(lat) || !isFinite(lng)) return false;
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
        if (Math.abs(lat) < 0.001 && Math.abs(lng) < 0.001) return false;
        const spd = parseFloat(String(loc.speed || "0")) || 0;
        if (spd > 300) return false;
        return true;
      }

      interface ParkingEvent {
        vehicleId: string;
        startTime: string;
        endTime: string;
        durationMin: number;
        lat: number;
        lng: number;
        address: string | null;
        pointCount: number;
      }

      function detectParkingEvents(locs: LocRow[], vid: string): ParkingEvent[] {
        const SPEED_THRESHOLD = 3;
        const MIN_PARK_MS = 5 * 60 * 1000;

        const sorted = [...locs]
          .filter(isValidGpsPoint)
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        const events: ParkingEvent[] = [];
        let group: LocRow[] = [];

        const emitGroup = () => {
          if (group.length < 2) { group = []; return; }
          const startTs = new Date(group[0].timestamp).getTime();
          const endTs = new Date(group[group.length - 1].timestamp).getTime();
          if (endTs - startTs >= MIN_PARK_MS) {
            const latSum = group.reduce((s, p) => s + parseFloat(String(p.latitude)), 0);
            const lngSum = group.reduce((s, p) => s + parseFloat(String(p.longitude)), 0);
            events.push({
              vehicleId: vid,
              startTime: group[0].timestamp instanceof Date
                ? group[0].timestamp.toISOString()
                : new Date(group[0].timestamp).toISOString(),
              endTime: group[group.length - 1].timestamp instanceof Date
                ? (group[group.length - 1].timestamp as Date).toISOString()
                : new Date(group[group.length - 1].timestamp).toISOString(),
              durationMin: Math.round((endTs - startTs) / 60000),
              lat: Math.round((latSum / group.length) * 1e6) / 1e6,
              lng: Math.round((lngSum / group.length) * 1e6) / 1e6,
              address: (group[0].address as string | null | undefined) ?? null,
              pointCount: group.length,
            });
          }
          group = [];
        };

        for (const loc of sorted) {
          const spd = parseFloat(String(loc.speed || "0")) || 0;
          if (spd <= SPEED_THRESHOLD) {
            group.push(loc);
          } else {
            emitGroup();
          }
        }
        emitGroup();

        return events;
      }

      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });

      let vehicleIds: string[];
      if (vehicleId && vehicleId !== "all") {
        if (allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
          return res.json([]);
        }
        vehicleIds = [vehicleId as string];
      } else {
        const allVehicles = await storage.getVehicles();
        const allIds = allVehicles.map(v => v.id);
        vehicleIds = allowedIds === null ? allIds : allIds.filter(id => allowedIds.includes(id));
      }

      const allEvents: ParkingEvent[] = [];
      await Promise.all(vehicleIds.map(async (vid) => {
        const locs = await storage.getLocationHistory(vid, start, end);
        const evs = detectParkingEvents(locs, vid);
        allEvents.push(...evs);
      }));

      allEvents.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

      res.json(allEvents);
    } catch (error) {
      console.error("Failed to compute parking events:", error);
      res.status(500).json({ error: "Failed to compute parking events" });
    }
  });

  app.post("/api/locations", requireAuth, async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      
      // If this is a vehicle location, update vehicle status and check geofences
      if (validatedData.vehicleId) {
        const speed = parseFloat(validatedData.speed || "0");
        const status = speed > 5 ? "active" : speed === 0 ? "stopped" : "active";
        await storage.updateVehicle(validatedData.vehicleId, { status });
        
        // Check geofences and speed violations (non-blocking)
        checkGeofences(location).catch(err => console.error("Geofence check error:", err));
        checkSpeedViolation(location).catch(err => console.error("Speed check error:", err));
      }
      
      // Broadcast to WebSocket clients
      broadcastLocation(location);
      
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: "Invalid location data" });
    }
  });

  // Recent trail for all vehicles (last N points per vehicle)
  app.get("/api/locations/trail", requireAuth, async (req, res) => {
    try {
      const hours = Math.min(parseInt((req.query.hours as string) || "6", 10), 48);
      const limit = Math.min(parseInt((req.query.limit as string) || "50", 10), 200);
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      const trail = await storage.getLocationTrail(since, limit);
      const filtered = allowedIds === null ? trail : trail.filter(l => l.vehicleId && allowedIds.includes(l.vehicleId));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trail data" });
    }
  });

  // Active GT06 device connections
  app.get("/api/device/connections", requireAuth, async (_req, res) => {
    res.json(getActiveConnections());
  });

  // Geofences (protected routes)
  app.get("/api/geofences", requireAuth, async (req, res) => {
    try {
      const geofences = await storage.getGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch geofences" });
    }
  });

  app.post("/api/geofences", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertGeofenceSchema.parse(req.body);
      const geofence = await storage.createGeofence(validatedData);
      res.status(201).json(geofence);
    } catch (error) {
      res.status(400).json({ error: "Invalid geofence data" });
    }
  });

  app.delete("/api/geofences/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteGeofence(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Geofence not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete geofence" });
    }
  });

  // Routes (protected routes)
  app.get("/api/routes", requireAuth, async (req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.post("/api/routes", requireAuth, async (req, res) => {
    try {
      const validatedData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(validatedData);
      res.status(201).json(route);
    } catch (error) {
      res.status(400).json({ error: "Invalid route data" });
    }
  });

  app.delete("/api/routes/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteRoute(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Route not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete route" });
    }
  });

  // POIs (protected routes)
  app.get("/api/pois", requireAuth, async (req, res) => {
    try {
      const pois = await storage.getPois();
      res.json(pois);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch POIs" });
    }
  });

  app.post("/api/pois", requireAuth, async (req, res) => {
    try {
      const validatedData = insertPoiSchema.parse(req.body);
      const poi = await storage.createPoi(validatedData);
      res.status(201).json(poi);
    } catch (error) {
      res.status(400).json({ error: "Invalid POI data" });
    }
  });

  app.delete("/api/pois/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deletePoi(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "POI not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete POI" });
    }
  });

  // Events (protected routes)
  app.get("/api/events", requireAuth, async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      if (vehicleId && allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
        return res.json([]);
      }
      const evts = (await storage.getEvents(
        vehicleId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )) ?? [];
      const filtered = allowedIds === null ? evts : evts.filter(e => e.vehicleId && allowedIds.includes(e.vehicleId));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.post("/api/events", requireAuth, async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  // Trips (protected routes)
  app.get("/api/trips", requireAuth, async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      const allowedIds = await getAllowedVehicleIds(req.user as { id: string; role: string });
      if (vehicleId && allowedIds !== null && !allowedIds.includes(vehicleId as string)) {
        return res.json([]);
      }
      const trips = (await storage.getTrips(
        vehicleId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      )) ?? [];
      const filtered = allowedIds === null ? trips : trips.filter(t => t.vehicleId && allowedIds.includes(t.vehicleId));
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch trips" });
    }
  });

  app.post("/api/trips", requireAuth, async (req, res) => {
    try {
      const validatedData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(validatedData);
      res.status(201).json(trip);
    } catch (error) {
      res.status(400).json({ error: "Invalid trip data" });
    }
  });

  // Users (Admin only)
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.get("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const sessionUser = req.user as User;
      const targetUserId = req.params.id;

      const freshUser = await storage.getUserById(sessionUser.id);
      if (!freshUser) {
        return res.status(401).json({ error: "Session invalid - user not found" });
      }

      if (freshUser.role !== "admin" && freshUser.id !== targetUserId) {
        return res.status(403).json({ error: "You can only view your own profile" });
      }

      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      const existingByPhone = await storage.getUserByPhone(validatedData.phone!);
      if (existingByPhone) {
        return res.status(400).json({ error: "Mobile number already registered" });
      }
      
      const bcrypt = await import("bcrypt");
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);
      
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword,
      });
      
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  app.patch("/api/users/:id", requireAuth, async (req, res) => {
    try {
      const sessionUser = req.user as User;
      const targetUserId = req.params.id;

      const freshUser = await storage.getUserById(sessionUser.id);
      if (!freshUser) {
        return res.status(401).json({ error: "Session invalid - user not found" });
      }

      if (freshUser.role === "admin") {
        const validatedData = adminUpdateUserSchema.parse(req.body);
        
        // Build typed update object, converting string dates to Date objects
        const updates: Partial<User> = {};
        if (validatedData.name !== undefined) updates.name = validatedData.name;
        if (validatedData.email !== undefined) updates.email = validatedData.email;
        if (validatedData.role !== undefined) updates.role = validatedData.role;
        if (validatedData.phone !== undefined) updates.phone = validatedData.phone;
        if (validatedData.department !== undefined) updates.department = validatedData.department;
        if (validatedData.status !== undefined) updates.status = validatedData.status;
        if (validatedData.subscriptionType !== undefined) updates.subscriptionType = validatedData.subscriptionType;
        if (validatedData.subscriptionExpiry !== undefined) {
          updates.subscriptionExpiry = validatedData.subscriptionExpiry
            ? new Date(validatedData.subscriptionExpiry)
            : null;
        }
        if (validatedData.allowedVehicleIds !== undefined) {
          updates.allowedVehicleIds = validatedData.allowedVehicleIds;
        }
        if (validatedData.allowedMenus !== undefined) {
          updates.allowedMenus = validatedData.allowedMenus;
        }
        if (validatedData.password) {
          const bcrypt = await import("bcrypt");
          updates.password = await bcrypt.hash(validatedData.password, 10);
        }
        
        const user = await storage.updateUser(targetUserId, updates);
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }
        
        const { password, ...userWithoutPassword } = user;
        return res.json(userWithoutPassword);
      }

      if (freshUser.id !== targetUserId) {
        return res.status(403).json({ error: "You can only update your own profile" });
      }

      const validatedData = updateProfileSchema.parse(req.body);
      const user = await storage.updateUser(freshUser.id, validatedData);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteUser(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "User not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  // Activities (protected routes - Personal Tracking)
  app.get("/api/activities", requireAuth, async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.query;
      const activities = await storage.getActivities(
        userId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(activities);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activities" });
    }
  });

  app.get("/api/activities/current", requireAuth, async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ error: "userId query parameter is required" });
      }
      const activity = await storage.getCurrentActivity(userId as string);
      res.json(activity || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch current activity" });
    }
  });

  app.get("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const activity = await storage.getActivity(req.params.id);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity" });
    }
  });

  app.post("/api/activities", requireAuth, async (req, res) => {
    try {
      const validatedData = insertActivitySchema.parse(req.body);
      const activity = await storage.createActivity(validatedData);
      res.status(201).json(activity);
    } catch (error) {
      res.status(400).json({ error: "Invalid activity data" });
    }
  });

  app.patch("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const activity = await storage.updateActivity(req.params.id, req.body);
      if (!activity) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.json(activity);
    } catch (error) {
      res.status(500).json({ error: "Failed to update activity" });
    }
  });

  app.delete("/api/activities/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteActivity(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Activity not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete activity" });
    }
  });

  app.get("/api/activities/:id/locations", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getActivityLocationHistory(req.params.id);
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch activity locations" });
    }
  });

  // App Settings routes
  // Public: returns only the Google Maps key (no auth required so the map can load)
  app.get("/api/settings/public", async (_req, res) => {
    try {
      const setting = await storage.getSetting("google_maps_key");
      res.json({ googleMapsKey: setting?.value || "" });
    } catch (error) {
      res.json({ googleMapsKey: "" });
    }
  });

  // Admin: get all settings
  app.get("/api/settings", requireAdmin, async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  // Admin: upsert a setting key/value
  app.put("/api/settings", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({ key: z.string().min(1), value: z.string() });
      const { key, value } = schema.parse(req.body);
      const setting = await storage.setSetting(key, value);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0].message });
      }
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time location updates
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const clients = new Set<WebSocket>();

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log("WebSocket client connected");

    ws.on("close", () => {
      clients.delete(ws);
      console.log("WebSocket client disconnected");
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
      clients.delete(ws);
    });
  });

  function broadcastLocation(location: any) {
    const message = JSON.stringify({ type: "location", data: location });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  function broadcastEvent(event: any) {
    const message = JSON.stringify({ type: "event", data: event });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Set up event broadcasting for geofence monitor
  setEventBroadcaster(broadcastEvent);

  function broadcastVehicle(vehicle: any) {
    const message = JSON.stringify({ type: "vehicle", data: vehicle });
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Alert settings (per-user notification preferences)
  app.get("/api/alert-settings", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as { id: string }).id;
      let settings = await storage.getUserAlertSettings(userId);
      if (!settings) {
        // Return defaults without persisting — only persist on first PUT
        settings = {
          userId,
          speedAlertEnabled: false,
          speedThresholdKph: 80,
          parkingAlertEnabled: false,
          parkingThresholdMin: 60,
          idleAlertEnabled: false,
          idleThresholdMin: 10,
          geofenceAlertEnabled: true,
        };
      }
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch alert settings" });
    }
  });

  app.put("/api/alert-settings", requireAuth, async (req, res) => {
    try {
      const userId = (req.user as { id: string }).id;
      const schema = insertUserAlertSettingsSchema.omit({ userId: true });
      const validated = schema.parse(req.body);
      const settings = await storage.upsertUserAlertSettings(userId, validated);
      res.json(settings);
    } catch (error) {
      if (error instanceof Error && error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid alert settings" });
      }
      res.status(500).json({ error: "Failed to save alert settings" });
    }
  });

  // Set up location broadcasting for GT06 TCP server
  setLocationBroadcaster(broadcastLocation);
  setVehicleBroadcaster(broadcastVehicle);

  // Simulate location updates for demo vehicle
  setInterval(async () => {
    const vehicles = await storage.getVehicles();
    const demoVehicle = vehicles.find(v => v.deviceId === "DEMO-001");
    
    if (demoVehicle) {
      const latestLocations = await storage.getLatestLocations();
      const currentLocation = latestLocations.find(l => l.vehicleId === demoVehicle.id);
      
      if (currentLocation) {
        const lat = parseFloat(currentLocation.latitude);
        const lng = parseFloat(currentLocation.longitude);
        
        // Random walk simulation
        const newLat = lat + (Math.random() - 0.5) * 0.001;
        const newLng = lng + (Math.random() - 0.5) * 0.001;
        const newSpeed = Math.random() * 80;
        const newHeading = Math.random() * 360;
        
        const newLocation = await storage.createLocation({
          vehicleId: demoVehicle.id,
          latitude: newLat.toFixed(7),
          longitude: newLng.toFixed(7),
          ...(currentLocation.altitude ? { altitude: currentLocation.altitude } : {}),
          speed: newSpeed.toFixed(2),
          heading: newHeading.toFixed(2),
          ...(currentLocation.address ? { address: currentLocation.address } : {}),
          accuracy: "5",
        });

        if (!newLocation) return;

        const status = newSpeed > 5 ? "active" : newSpeed < 1 ? "stopped" : "active";
        await storage.updateVehicle(demoVehicle.id, { status });
        
        // Check geofences and speed violations for simulated updates
        checkGeofences(newLocation).catch(() => {});
        checkSpeedViolation(newLocation).catch(() => {});
        
        broadcastLocation(newLocation);
      }
    }
  }, 10000); // Update every 10 seconds

  return httpServer;
}
