import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { checkGeofences, checkSpeedViolation, setEventBroadcaster } from "./geofence-monitor";
import { setLocationBroadcaster, setVehicleBroadcaster } from "./broadcaster";
import { authRoutes } from "./auth-routes";
import { requireAuth, requireAdmin } from "./auth";
import { z } from "zod";
import {
  insertVehicleSchema,
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
  type User,
} from "@shared/schema";

// In-memory log of unrecognised device IDs (last 20 attempts)
const unknownDeviceLog: { deviceId: string; lat: number; lng: number; speed: number; seenAt: string }[] = [];

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes (public)
  app.use("/api/auth", authRoutes);

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

      const location = await storage.createDeviceLocation(
        vehicle.id,
        data.latitude,
        data.longitude,
        data.speed ?? 0,
        data.altitude ?? null,
        data.accuracy ?? null,
        data.timestamp ? new Date(data.timestamp) : new Date()
      );

      const speed = data.speed ?? 0;
      const status = speed > 5 ? "active" : "stopped";
      await storage.updateVehicle(vehicle.id, { status });

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
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", requireAuth, async (req, res) => {
    try {
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
      res.status(400).json({ error: "Invalid vehicle data" });
    }
  });

  app.patch("/api/vehicles/:id", requireAdmin, async (req, res) => {
    try {
      const vehicle = await storage.updateVehicle(req.params.id, req.body);
      if (!vehicle) {
        return res.status(404).json({ error: "Vehicle not found" });
      }
      res.json(vehicle);
    } catch (error) {
      res.status(500).json({ error: "Failed to update vehicle" });
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
      const locations = await storage.getLocations(
        vehicleId as string,
        activityId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/latest", requireAuth, async (req, res) => {
    try {
      const locations = await storage.getLatestLocations();
      res.json(locations);
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
      const events = await storage.getEvents(
        vehicleId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(events);
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
      const trips = await storage.getTrips(
        vehicleId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(trips);
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
        
        const updates: Partial<User> = { ...validatedData };
        if (updates.password) {
          const bcrypt = await import("bcrypt");
          updates.password = await bcrypt.hash(updates.password, 10);
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
        
        const status = newSpeed > 5 ? "active" : newSpeed < 1 ? "stopped" : "active";
        await storage.updateVehicle(demoVehicle.id, { status });
        
        // Check geofences and speed violations for simulated updates
        checkGeofences(newLocation).catch(err => console.error("Geofence check error:", err));
        checkSpeedViolation(newLocation).catch(err => console.error("Speed check error:", err));
        
        broadcastLocation(newLocation);
      }
    }
  }, 10000); // Update every 10 seconds

  return httpServer;
}
