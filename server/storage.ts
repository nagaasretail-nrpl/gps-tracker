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
  type User,
  type InsertUser,
  type Activity,
  type InsertActivity,
  type AppSetting,
  vehicles,
  locations,
  geofences,
  routes,
  pois,
  events,
  trips,
  users,
  activities,
  appSettings,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db, neonSql } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Activities (Personal Tracking)
  getActivities(userId?: string, startDate?: Date, endDate?: Date): Promise<Activity[]>;
  getActivity(id: string): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  updateActivity(id: string, activity: Partial<Activity>): Promise<Activity | undefined>;
  deleteActivity(id: string): Promise<boolean>;
  getCurrentActivity(userId?: string): Promise<Activity | undefined>;

  // Vehicles
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: string): Promise<Vehicle | undefined>;
  getVehicleByDeviceId(deviceId: string): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: string, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: string): Promise<boolean>;

  // Locations
  getLocations(vehicleId?: string, activityId?: string, startDate?: Date, endDate?: Date): Promise<Location[]>;
  getLatestLocations(): Promise<Location[]>;
  getLatestLocationForVehicle(vehicleId: string): Promise<Location | null>;
  getLocationHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<Location[]>;
  getLocationTrail(since: Date, perVehicleLimit: number): Promise<Location[]>;
  getActivityLocationHistory(activityId: string): Promise<Location[]>;
  createLocation(location: InsertLocation): Promise<Location>;
  createDeviceLocation(vehicleId: string, lat: number, lng: number, speed: number, altitude: number | null, accuracy: number | null, timestamp: Date, satellites?: number | null, heading?: number | null, isStationary?: boolean, accuracyScore?: number): Promise<Location>;

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

  // App Settings
  getSettings(): Promise<AppSetting[]>;
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string): Promise<AppSetting>;
}

export class DbStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserById(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    if (Object.keys(updates).length === 0) {
      const rows = await db.select().from(users).where(eq(users.id, id));
      return rows[0];
    }
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === null) {
        set[key] = sql`NULL`;
      } else {
        set[key] = val;
      }
    }
    await db.update(users).set(set).where(eq(users.id, id));
    const rows = await db.select().from(users).where(eq(users.id, id));
    return rows[0];
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getActivities(userId?: string, startDate?: Date, endDate?: Date): Promise<Activity[]> {
    const conditions = [];
    
    if (userId) {
      conditions.push(eq(activities.userId, userId));
    }
    // Filter by when the activity occurred (startTime), not when it was created
    if (startDate) {
      conditions.push(gte(activities.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(activities.startTime, endDate));
    }

    let query = db.select().from(activities);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    // Order by when activities started, most recent first
    return await query.orderBy(desc(activities.startTime));
  }

  async getActivity(id: string): Promise<Activity | undefined> {
    const result = await db.select().from(activities).where(eq(activities.id, id)).limit(1);
    return result[0];
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const result = await db.insert(activities).values(insertActivity).returning();
    return result[0];
  }

  async updateActivity(id: string, updates: Partial<Activity>): Promise<Activity | undefined> {
    const result = await db.update(activities).set(updates).where(eq(activities.id, id)).returning();
    return result[0];
  }

  async deleteActivity(id: string): Promise<boolean> {
    const result = await db.delete(activities).where(eq(activities.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getCurrentActivity(userId?: string): Promise<Activity | undefined> {
    const conditions = [eq(activities.isRecording, true)];
    
    if (userId) {
      conditions.push(eq(activities.userId, userId));
    }

    const result = await db.select().from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.startTime))
      .limit(1);
    
    return result[0];
  }

  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }

  async getVehicle(id: string): Promise<Vehicle | undefined> {
    const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
    return result[0];
  }

  async getVehicleByDeviceId(deviceId: string): Promise<Vehicle | undefined> {
    // Neon HTTP driver crashes on parameterized queries that return 0 rows.
    // Fetch all vehicles (typically a small list) and filter in-memory instead.
    const all = await db.select().from(vehicles);
    return all.find(v => v.deviceId === deviceId);
  }

  async createVehicle(insertVehicle: InsertVehicle): Promise<Vehicle> {
    const fe = insertVehicle.fuelEfficiency != null ? String(insertVehicle.fuelEfficiency) : null;
    const fr = insertVehicle.fuelRatePerLiter != null ? String(insertVehicle.fuelRatePerLiter) : null;
    const fc = insertVehicle.fuelTankCapacity != null ? String(insertVehicle.fuelTankCapacity) : null;
    const dp = insertVehicle.devicePhone ?? null;
    await neonSql`INSERT INTO vehicles (id, name, device_id, type, status, icon_color, driver_name, license_plate, fuel_type, fuel_efficiency, fuel_rate_per_liter, fuel_tank_capacity, device_phone)
      VALUES (gen_random_uuid(), ${insertVehicle.name}, ${insertVehicle.deviceId}, ${insertVehicle.type ?? "car"}, ${insertVehicle.status ?? "offline"}, ${insertVehicle.iconColor ?? "#2563eb"}, ${insertVehicle.driverName ?? null}, ${insertVehicle.licensePlate ?? null}, ${insertVehicle.fuelType ?? null}, ${fe}, ${fr}, ${fc}, ${dp})`;
    const rows = await db.select().from(vehicles).where(eq(vehicles.deviceId, insertVehicle.deviceId));
    return rows[0];
  }

  async updateVehicle(id: string, updates: Partial<Vehicle>): Promise<Vehicle | undefined> {
    if (Object.keys(updates).length === 0) return undefined;
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (val === null) {
        set[key] = sql`NULL`;
      } else {
        set[key] = val;
      }
    }
    await db.update(vehicles).set(set).where(eq(vehicles.id, id));
    const rows = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return rows[0];
  }

  async deleteVehicle(id: string): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getLocations(vehicleId?: string, activityId?: string, startDate?: Date, endDate?: Date): Promise<Location[]> {
    const conditions = [];
    
    if (vehicleId) {
      conditions.push(eq(locations.vehicleId, vehicleId));
    }
    if (activityId) {
      conditions.push(eq(locations.activityId, activityId));
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
      SELECT DISTINCT ON (vehicle_id)
        id,
        vehicle_id   AS "vehicleId",
        activity_id  AS "activityId",
        latitude,
        longitude,
        altitude,
        speed,
        heading,
        accuracy,
        address,
        satellites,
        timestamp
      FROM locations
      ORDER BY vehicle_id, timestamp DESC
    `);
    const rows = (result.rows ?? []) as Location[];
    return rows.filter(l => {
      const lat = parseFloat(String(l.latitude));
      const lng = parseFloat(String(l.longitude));
      return lat >= 5 && lat <= 37 && lng >= 65 && lng <= 100;
    });
  }

  async getLatestLocationForVehicle(vehicleId: string): Promise<Location | null> {
    const result = await db.execute(sql`
      SELECT
        id,
        vehicle_id   AS "vehicleId",
        activity_id  AS "activityId",
        latitude,
        longitude,
        altitude,
        speed,
        heading,
        accuracy,
        address,
        timestamp
      FROM locations
      WHERE vehicle_id = ${vehicleId}
      ORDER BY timestamp DESC
      LIMIT 10
    `);
    const rows = ((result.rows ?? []) as Location[]).filter(l => {
      const lat = parseFloat(String(l.latitude));
      const lng = parseFloat(String(l.longitude));
      return lat >= 5 && lat <= 37 && lng >= 65 && lng <= 100;
    });
    return rows.length > 0 ? rows[0] : null;
  }

  async getLocationHistory(vehicleId: string, startDate: Date, endDate: Date): Promise<Location[]> {
    const rows = await db.select().from(locations)
      .where(and(
        eq(locations.vehicleId, vehicleId),
        gte(locations.timestamp, startDate),
        lte(locations.timestamp, endDate),
      ))
      .orderBy(desc(locations.timestamp));
    // Filter India bounds in JS — matching the pattern used in getLatestLocations/getLocationTrail.
    return (rows ?? []).filter((l) => {
      const lat = parseFloat(String(l.latitude));
      const lng = parseFloat(String(l.longitude));
      return lat >= 5 && lat <= 37 && lng >= 65 && lng <= 100;
    });
  }

  async getLocationTrail(since: Date, perVehicleLimit: number): Promise<Location[]> {
    const result = await db.execute(sql`
      SELECT * FROM (
        SELECT
          id, vehicle_id AS "vehicleId", activity_id AS "activityId",
          latitude, longitude, altitude, speed, heading, accuracy, address, timestamp,
          ROW_NUMBER() OVER (PARTITION BY vehicle_id ORDER BY timestamp DESC) AS rn
        FROM locations
        WHERE timestamp >= ${since}
      ) ranked
      WHERE rn <= ${perVehicleLimit}
      ORDER BY "vehicleId", timestamp ASC
    `);
    return ((result.rows ?? []) as Record<string, unknown>[])
      .filter(r => {
        const lat = parseFloat(String(r.latitude));
        const lng = parseFloat(String(r.longitude));
        return lat >= 5 && lat <= 37 && lng >= 65 && lng <= 100;
      })
      .map((r: Record<string, unknown>) => ({
      id: r.id as string,
      vehicleId: r.vehicleId as string,
      activityId: r.activityId as string | null,
      latitude: r.latitude as string,
      longitude: r.longitude as string,
      altitude: r.altitude as string | null,
      speed: r.speed as string | null,
      heading: r.heading as string | null,
      accuracy: r.accuracy as string | null,
      address: r.address as string | null,
      satellites: r.satellites as number | null,
      isStationary: (r.isStationary ?? r.is_stationary ?? false) as boolean | null,
      accuracyScore: (r.accuracyScore ?? r.accuracy_score ?? 100) as number | null,
      timestamp: r.timestamp as Date,
    }));
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    // Validate that location is associated with either a vehicle or an activity
    if (!insertLocation.vehicleId && !insertLocation.activityId) {
      throw new Error("Location must be associated with either a vehicle or an activity");
    }
    
    const result = await db.insert(locations).values(insertLocation).returning();
    return result[0];
  }

  async createDeviceLocation(vehicleId: string, lat: number, lng: number, speed: number, altitude: number | null, accuracy: number | null, timestamp: Date, satellites?: number | null, _heading?: number | null, isStationary?: boolean, accuracyScore?: number): Promise<Location> {
    // Neon HTTP driver converts JS null to '' for numeric columns in parameterized queries.
    // Use template literal form and only include optional columns when they have values.
    // RETURNING also fails on Neon HTTP, so we construct the result from inputs.
    // is_stationary and accuracy_score always have values so they appear in every branch.
    const ts = timestamp.toISOString();
    const sats = satellites ?? null;
    const isStat = isStationary ?? false;
    const accScore = accuracyScore ?? 100;

    if (altitude !== null && accuracy !== null && sats !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, altitude, accuracy, satellites, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${altitude}, ${accuracy}, ${sats}, ${isStat}, ${accScore}, ${ts})`;
    } else if (altitude !== null && accuracy !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, altitude, accuracy, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${altitude}, ${accuracy}, ${isStat}, ${accScore}, ${ts})`;
    } else if (altitude !== null && sats !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, altitude, satellites, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${altitude}, ${sats}, ${isStat}, ${accScore}, ${ts})`;
    } else if (altitude !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, altitude, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${altitude}, ${isStat}, ${accScore}, ${ts})`;
    } else if (accuracy !== null && sats !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, accuracy, satellites, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${accuracy}, ${sats}, ${isStat}, ${accScore}, ${ts})`;
    } else if (accuracy !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, accuracy, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${accuracy}, ${isStat}, ${accScore}, ${ts})`;
    } else if (sats !== null) {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, satellites, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${sats}, ${isStat}, ${accScore}, ${ts})`;
    } else {
      await neonSql`INSERT INTO locations (vehicle_id, latitude, longitude, speed, is_stationary, accuracy_score, timestamp) VALUES (${vehicleId}, ${lat}, ${lng}, ${speed}, ${isStat}, ${accScore}, ${ts})`;
    }

    return {
      id: "",
      vehicleId,
      activityId: null,
      latitude: String(lat),
      longitude: String(lng),
      altitude: altitude !== null ? String(altitude) : null,
      speed: String(speed),
      heading: null,
      address: null,
      accuracy: accuracy !== null ? String(accuracy) : null,
      satellites: sats,
      isStationary: isStat,
      accuracyScore: accScore,
      timestamp,
    } as Location;
  }
  
  async getActivityLocationHistory(activityId: string): Promise<Location[]> {
    return await db.select().from(locations)
      .where(eq(locations.activityId, activityId))
      .orderBy(locations.timestamp);
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
    
    try {
      return await query.orderBy(desc(events.timestamp));
    } catch (err) {
      if (err instanceof TypeError && String(err.message).includes("map")) {
        return [];
      }
      throw err;
    }
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
    
    try {
      return await query.orderBy(desc(trips.startTime));
    } catch (err) {
      if (err instanceof TypeError && String(err.message).includes("map")) {
        return [];
      }
      throw err;
    }
  }

  async createTrip(insertTrip: InsertTrip): Promise<Trip> {
    const result = await db.insert(trips).values(insertTrip).returning();
    return result[0];
  }

  async updateTrip(id: string, updates: Partial<Trip>): Promise<Trip | undefined> {
    const result = await db.update(trips).set(updates).where(eq(trips.id, id)).returning();
    return result[0];
  }

  async getSettings(): Promise<AppSetting[]> {
    try {
      const result = await db.select().from(appSettings);
      return result ?? [];
    } catch (err) {
      // The neon-http driver returns null instead of [] for empty tables,
      // causing a TypeError when drizzle calls .map() on the result.
      // Treat this specific case as an empty result; re-throw real DB errors.
      if (err instanceof TypeError && String(err.message).includes("map")) {
        return [];
      }
      throw err;
    }
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    try {
      const result = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      return result?.[0];
    } catch (err) {
      // Same neon-http null bug as getSettings — empty table returns null.
      if (err instanceof TypeError && String(err.message).includes("map")) {
        return undefined;
      }
      throw err;
    }
  }

  async setSetting(key: string, value: string): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      // neon-http null bug: update without .returning(), then fetch separately
      await db.update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key));
      const updated = await this.getSetting(key);
      return updated!;
    } else {
      const result = await db.insert(appSettings).values({ key, value }).returning();
      return result[0];
    }
  }
}

export const storage = new DbStorage();
