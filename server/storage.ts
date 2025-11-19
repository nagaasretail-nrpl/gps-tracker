import {
  type Vehicle,
  type InsertVehicle,
  type Location,
  type InsertLocation,
  type Geofence,
  type InsertGeofence,
  type Route,
  type InsertRoute,
  type Poi,
  type InsertPoi,
  type Event,
  type InsertEvent,
  type Trip,
  type InsertTrip,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;

  // Locations
  getLocations(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Location[]>;
  getLatestLocations(): Promise<Location[]>;
  getLocationHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;

  // Geofences
  getGeofences(): Promise<Geofence[]>;
  getGeofence(id: string): Promise<Geofence | undefined>;
  createGeofence(geofence: InsertGeofence): Promise<Geofence>;
  deleteGeofence(id: string): Promise<boolean>;

  // Routes
  getRoutes(): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  deleteRoute(id: string): Promise<boolean>;

  // POIs
  getPois(): Promise<Poi[]>;
  getPoi(id: string): Promise<Poi | undefined>;
  createPoi(poi: InsertPoi): Promise<Poi>;
  deletePoi(id: string): Promise<boolean>;

  // Events
  getEvents(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Trips
  getTrips(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<Trip>): Promise<Trip | undefined>;
}

export class MemStorage implements IStorage {
  private vehicles: Map<string, Vehicle>;
  private locations: Map<string, Location>;
  private geofences: Map<string, Geofence>;
  private routes: Map<string, Route>;
  private pois: Map<string, Poi>;
  private events: Map<string, Event>;
  private trips: Map<string, Trip>;

  constructor() {
    this.vehicles = new Map();
    this.locations = new Map();
    this.geofences = new Map();
    this.routes = new Map();
    this.pois = new Map();
    this.events = new Map();
    this.trips = new Map();
    
    this.seedDemoData();
  }

  private seedDemoData() {
    const demoVehicle: Vehicle = {
      id: randomUUID(),
      name: "Demo Vehicle 1",
      deviceId: "DEMO-001",
      type: "car",
      status: "active",
      iconColor: "#2563eb",
      createdAt: new Date(),
    };
    this.vehicles.set(demoVehicle.id, demoVehicle);

    const demoLocation: Location = {
      id: randomUUID(),
      vehicleId: demoVehicle.id,
      latitude: "40.7128",
      longitude: "-74.0060",
      altitude: "10",
      speed: "45.5",
      heading: "90",
      address: "New York, NY",
      accuracy: "5",
      timestamp: new Date(),
    };
    this.locations.set(demoLocation.id, demoLocation);
  }

  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const id = randomUUID();
    const vehicle: Vehicle = {
      ...insertVehicle,
      id,
      createdAt: new Date(),
    };
    this.vehicles.set(id, vehicle);
    return vehicle;
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const vehicle = this.vehicles.get(id);
    if (!vehicle) return undefined;
    const updated = { ...vehicle, ...updates };
    this.vehicles.set(id, updated);
    return updated;
  }

  async deleteVehicle(id: string): Promise<boolean> {
    return this.vehicles.delete(id);
  }

  async getLocations(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Location[]> {
    let locations = Array.from(this.locations.values());
    
    if (vehicleId) {
      locations = locations.filter(l => l.vehicleId === vehicleId);
    }
    
    if (startDate) {
      locations = locations.filter(l => new Date(l.timestamp) >= startDate);
    }
    
    if (endDate) {
      locations = locations.filter(l => new Date(l.timestamp) <= endDate);
    }
    
    return locations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getLatestLocations(): Promise<Location[]> {
    const locationsByVehicle = new Map<string, Location>();
    
    Array.from(this.locations.values()).forEach(location => {
      const existing = locationsByVehicle.get(location.vehicleId);
      if (!existing || new Date(location.timestamp) > new Date(existing.timestamp)) {
        locationsByVehicle.set(location.vehicleId, location);
      }
    });
    
    return Array.from(locationsByVehicle.values());
  }

  async getLocationHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<Location[]> {
    return this.getLocations(vehicleId, startDate, endDate);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const id = randomUUID();
    const location: Location = {
      ...insertLocation,
      id,
      timestamp: new Date(),
    };
    this.locations.set(id, location);
    return location;
  }

  async getGeofences(): Promise<Geofence[]> {
    return Array.from(this.geofences.values());
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    return this.geofences.get(id);
  }

  async createGeofence(insertGeofence: InsertGeofence): Promise<Geofence> {
    const id = randomUUID();
    const geofence: Geofence = {
      ...insertGeofence,
      id,
      createdAt: new Date(),
    };
    this.geofences.set(id, geofence);
    return geofence;
  }

  async deleteGeofence(id: string): Promise<boolean> {
    return this.geofences.delete(id);
  }

  async getRoutes(): Promise<Route[]> {
    return Array.from(this.routes.values());
  }

  async getRoute(id: string): Promise<Route | undefined> {
    return this.routes.get(id);
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const id = randomUUID();
    const route: Route = {
      ...insertRoute,
      id,
      createdAt: new Date(),
    };
    this.routes.set(id, route);
    return route;
  }

  async deleteRoute(id: string): Promise<boolean> {
    return this.routes.delete(id);
  }

  async getPois(): Promise<Poi[]> {
    return Array.from(this.pois.values());
  }

  async getPoi(id: string): Promise<Poi | undefined> {
    return this.pois.get(id);
  }

  async createPoi(insertPoi: InsertPoi): Promise<Poi> {
    const id = randomUUID();
    const poi: Poi = {
      ...insertPoi,
      id,
      createdAt: new Date(),
    };
    this.pois.set(id, poi);
    return poi;
  }

  async deletePoi(id: string): Promise<boolean> {
    return this.pois.delete(id);
  }

  async getEvents(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Event[]> {
    let events = Array.from(this.events.values());
    
    if (vehicleId) {
      events = events.filter(e => e.vehicleId === vehicleId);
    }
    
    if (startDate) {
      events = events.filter(e => new Date(e.timestamp) >= startDate);
    }
    
    if (endDate) {
      events = events.filter(e => new Date(e.timestamp) <= endDate);
    }
    
    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const id = randomUUID();
    const event: Event = {
      ...insertEvent,
      id,
      timestamp: new Date(),
    };
    this.events.set(id, event);
    return event;
  }

  async getTrips(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Trip[]> {
    let trips = Array.from(this.trips.values());
    
    if (vehicleId) {
      trips = trips.filter(t => t.vehicleId === vehicleId);
    }
    
    if (startDate) {
      trips = trips.filter(t => new Date(t.startTime) >= startDate);
    }
    
    if (endDate) {
      trips = trips.filter(t => new Date(t.startTime) <= endDate);
    }
    
    return trips.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const id = randomUUID();
    const trip: Trip = {
      ...insertTrip,
      id,
    };
    this.trips.set(id, trip);
    return trip;
  }

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip | undefined> {
    const trip = this.trips.get(id);
    if (!trip) return undefined;
    const updated = { ...trip, ...updates };
    this.trips.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
