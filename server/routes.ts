import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import {
  insertVehicleSchema,
  insertLocationSchema,
  insertGeofenceSchema,
  insertRouteSchema,
  insertPoiSchema,
  insertEventSchema,
  insertTripSchema,
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Vehicles
  app.get("/api/vehicles", async (req, res) => {
    try {
      const vehicles = await storage.getVehicles();
      res.json(vehicles);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch vehicles" });
    }
  });

  app.get("/api/vehicles/:id", async (req, res) => {
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

  app.post("/api/vehicles", async (req, res) => {
    try {
      const validatedData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(validatedData);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ error: "Invalid vehicle data" });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
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

  app.delete("/api/vehicles/:id", async (req, res) => {
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

  // Locations
  app.get("/api/locations", async (req, res) => {
    try {
      const { vehicleId, startDate, endDate } = req.query;
      const locations = await storage.getLocations(
        vehicleId as string,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch locations" });
    }
  });

  app.get("/api/locations/latest", async (req, res) => {
    try {
      const locations = await storage.getLatestLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch latest locations" });
    }
  });

  app.get("/api/locations/history", async (req, res) => {
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

  app.post("/api/locations", async (req, res) => {
    try {
      const validatedData = insertLocationSchema.parse(req.body);
      const location = await storage.createLocation(validatedData);
      
      // Update vehicle status based on speed
      const speed = parseFloat(validatedData.speed || "0");
      const status = speed > 5 ? "active" : speed === 0 ? "stopped" : "active";
      await storage.updateVehicle(validatedData.vehicleId, { status });
      
      // Broadcast to WebSocket clients
      broadcastLocation(location);
      
      res.status(201).json(location);
    } catch (error) {
      res.status(400).json({ error: "Invalid location data" });
    }
  });

  // Geofences
  app.get("/api/geofences", async (req, res) => {
    try {
      const geofences = await storage.getGeofences();
      res.json(geofences);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch geofences" });
    }
  });

  app.post("/api/geofences", async (req, res) => {
    try {
      const validatedData = insertGeofenceSchema.parse(req.body);
      const geofence = await storage.createGeofence(validatedData);
      res.status(201).json(geofence);
    } catch (error) {
      res.status(400).json({ error: "Invalid geofence data" });
    }
  });

  app.delete("/api/geofences/:id", async (req, res) => {
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

  // Routes
  app.get("/api/routes", async (req, res) => {
    try {
      const routes = await storage.getRoutes();
      res.json(routes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch routes" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const validatedData = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(validatedData);
      res.status(201).json(route);
    } catch (error) {
      res.status(400).json({ error: "Invalid route data" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
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

  // POIs
  app.get("/api/pois", async (req, res) => {
    try {
      const pois = await storage.getPois();
      res.json(pois);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch POIs" });
    }
  });

  app.post("/api/pois", async (req, res) => {
    try {
      const validatedData = insertPoiSchema.parse(req.body);
      const poi = await storage.createPoi(validatedData);
      res.status(201).json(poi);
    } catch (error) {
      res.status(400).json({ error: "Invalid POI data" });
    }
  });

  app.delete("/api/pois/:id", async (req, res) => {
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

  // Events
  app.get("/api/events", async (req, res) => {
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

  app.post("/api/events", async (req, res) => {
    try {
      const validatedData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(validatedData);
      res.status(201).json(event);
    } catch (error) {
      res.status(400).json({ error: "Invalid event data" });
    }
  });

  // Trips
  app.get("/api/trips", async (req, res) => {
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

  app.post("/api/trips", async (req, res) => {
    try {
      const validatedData = insertTripSchema.parse(req.body);
      const trip = await storage.createTrip(validatedData);
      res.status(201).json(trip);
    } catch (error) {
      res.status(400).json({ error: "Invalid trip data" });
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
          altitude: currentLocation.altitude,
          speed: newSpeed.toFixed(2),
          heading: newHeading.toFixed(2),
          address: currentLocation.address,
          accuracy: "5",
        });
        
        const status = newSpeed > 5 ? "active" : newSpeed < 1 ? "stopped" : "active";
        await storage.updateVehicle(demoVehicle.id, { status });
        
        broadcastLocation(newLocation);
      }
    }
  }, 10000); // Update every 10 seconds

  return httpServer;
}
