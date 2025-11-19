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
  vehicles,
  locations,
  geofences,
  routes,
  pois,
  events,
  trips,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

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

export class DbStorage implements IStorage {
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return result[0];
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const result = await db.insert(vehicles).values(insertVehicle).returning();
    return result[0];
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const result = await db.update(vehicles).set(updates).where(eq(vehicles.id, id)).returning();
    return result[0];
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLocations(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Location[]> {
    const conditions = [];
    
    if (vehicleId) {
      conditions.push(eq(locations.vehicleId, vehicleId));
    }
    if (startDate) {
      conditions.push(gte(locations.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(locations.timestamp, endDate));
    }

    let query = db.select().from(locations);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return await query.orderBy(desc(locations.timestamp));
  }

  async getLatestLocations(): Promise<Location[]> {
    const result = await db.execute(sql`
      SELECT DISTINCT ON (vehicle_id) *
      FROM locations
      ORDER BY vehicle_id, timestamp DESC
    `);
    return result.rows as Location[];
  }

  async getLocationHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<Location[]> {
    return await db.select().from(locations)
      .where(and(
        eq(locations.vehicleId, vehicleId),
        gte(locations.timestamp, startDate),
        lte(locations.timestamp, endDate)
      ))
      .orderBy(desc(locations.timestamp));
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const result = await db.insert(locations).values(insertLocation).returning();
    return result[0];
  }

  async getGeofences(): Promise<Geofence[]> {
    return await db.select().from(geofences);
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const result = await db.select().from(geofences).where(eq(geofences.id, id)).limit(1);
    return result[0];
  }

  async createGeofence(insertGeofence: InsertGeofence): Promise<Geofence> {
    const result = await db.insert(geofences).values(insertGeofence).returning();
    return result[0];
  }

  async deleteGeofence(id: string): Promise<boolean> {
    const result = await db.delete(geofences).where(eq(geofences.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getRoutes(): Promise<Route[]> {
    return await db.select().from(routes);
  }

  async getRoute(id: string): Promise<Route | undefined> {
    const result = await db.select().from(routes).where(eq(routes.id, id)).limit(1);
    return result[0];
  }

  async createRoute(insertRoute: InsertRoute): Promise<Route> {
    const result = await db.insert(routes).values(insertRoute).returning();
    return result[0];
  }

  async deleteRoute(id: string): Promise<boolean> {
    const result = await db.delete(routes).where(eq(routes.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPois(): Promise<Poi[]> {
    return await db.select().from(pois);
  }

  async getPoi(id: string): Promise<Poi | undefined> {
    const result = await db.select().from(pois).where(eq(pois.id, id)).limit(1);
    return result[0];
  }

  async createPoi(insertPoi: InsertPoi): Promise<Poi> {
    const result = await db.insert(pois).values(insertPoi).returning();
    return result[0];
  }

  async deletePoi(id: string): Promise<boolean> {
    const result = await db.delete(pois).where(eq(pois.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getEvents(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Event[]> {
    const conditions = [];
    
    if (vehicleId) {
      conditions.push(eq(events.vehicleId, vehicleId));
    }
    if (startDate) {
      conditions.push(gte(events.timestamp, startDate));
    }
    if (endDate) {
      conditions.push(lte(events.timestamp, endDate));
    }

    let query = db.select().from(events);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return await query.orderBy(desc(events.timestamp));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(insertEvent).returning();
    return result[0];
  }

  async getTrips(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Trip[]> {
    const conditions = [];
    
    if (vehicleId) {
      conditions.push(eq(trips.vehicleId, vehicleId));
    }
    if (startDate) {
      conditions.push(gte(trips.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(trips.startTime, endDate));
    }

    let query = db.select().from(trips);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return await query.orderBy(desc(trips.startTime));
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const result = await db.insert(trips).values(insertTrip).returning();
    return result[0];
  }

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip | undefined> {
    const result = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
    return result[0];
  }
}

export const storage = new DbStorage();
