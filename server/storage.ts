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
  type UserAlertSettings,
  type PushSubscription,
  type InsertPushSubscription,
  type Driver,
  type InsertDriver,
  type MaintenanceRecord,
  type InsertMaintenance,
  type Expense,
  type InsertExpense,
  type DeviceModel,
  type InsertDeviceModel,
  type VehicleSubscription,
  type InsertVehicleSubscription,
  type AuditLog,
  type DeviceSession,
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
  userAlertSettings,
  pushSubscriptions,
  drivers,
  maintenanceRecords,
  expenses,
  deviceModels,
  vehicleSubscriptions,
  auditLogs,
  hostedPlans,
  subscriptions,
  deviceSessions,
} from "@shared/schema";
import type { HostedPlan, InsertHostedPlan, Subscription, InsertSubscription } from "@shared/schema";
import { randomUUID } from "crypto";
import { db, neonSql } from "./db";
import { eq, and, gte, lte, desc, sql } from "drizzle-orm";

// The Neon HTTP driver occasionally returns `null` instead of `[]` for empty
// result sets. Drizzle then throws a TypeError ("Cannot read properties of null
// (reading 'map')") when it tries to process the result. This helper wraps any
// SELECT query, catches that known driver defect, and returns [] instead.
// All other errors are re-thrown so genuine failures are not silently swallowed.
async function safeSelect<T>(queryFn: () => Promise<T[]>): Promise<T[]> {
  try {
    const rows = await queryFn();
    return rows ?? [];
  } catch (err) {
    if (err instanceof TypeError && String(err.message).includes("map")) {
      return [];
    }
    throw err;
  }
}

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
  updateVehicleLastSeen(id: string, at: Date): Promise<void>;
  updateVehicleIgnition(id: string, ignitionOn: boolean): Promise<void>;
  deleteVehicle(id: string): Promise<boolean>;

  // Locations
  getLocations(vehicleId?: string, activityId?: string, startDate?: Date, endDate?: Date): Promise<Location[]>;
  getLatestLocations(): Promise<Location[]>;
  getLatestLocationForVehicle(vehicleId: string): Promise<Location | null>;
  getLatestLocationTimestampsForVehicles(vehicleIds: string[]): Promise<Map<string, Date>>;
  getLocationCountsForVehicles(vehicleIds: string[], since: Date): Promise<Map<string, number>>;
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
  getEvents(vehicleId?: string, startDate?: Date, endDate?: Date, type?: string, severity?: string): Promise<Event[]>;
  createEvent(event: InsertEvent): Promise<Event>;

  // Drivers
  getDrivers(allowedVehicleIds?: string[] | null): Promise<Driver[]>;
  getDriver(id: string): Promise<Driver | undefined>;
  createDriver(driver: InsertDriver): Promise<Driver>;
  updateDriver(id: string, driver: Partial<InsertDriver>): Promise<Driver | undefined>;
  deleteDriver(id: string): Promise<boolean>;

  // Maintenance Records
  getMaintenanceRecords(vehicleId?: string, allowedVehicleIds?: string[] | null): Promise<MaintenanceRecord[]>;
  getMaintenanceRecord(id: string): Promise<MaintenanceRecord | undefined>;
  createMaintenanceRecord(record: InsertMaintenance): Promise<MaintenanceRecord>;
  updateMaintenanceRecord(id: string, record: Partial<InsertMaintenance>): Promise<MaintenanceRecord | undefined>;
  deleteMaintenanceRecord(id: string): Promise<boolean>;

  // Expenses
  getExpenses(vehicleId?: string, startDate?: Date, endDate?: Date, allowedVehicleIds?: string[] | null): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
  deleteExpense(id: string): Promise<boolean>;

  // Device Models
  getDeviceModels(): Promise<DeviceModel[]>;
  getDeviceModel(id: string): Promise<DeviceModel | undefined>;
  createDeviceModel(model: InsertDeviceModel): Promise<DeviceModel>;
  updateDeviceModel(id: string, model: Partial<InsertDeviceModel>): Promise<DeviceModel | undefined>;
  deleteDeviceModel(id: string): Promise<boolean>;

  // Vehicle Subscriptions
  getVehicleSubscriptions(vehicleId?: string): Promise<VehicleSubscription[]>;
  createVehicleSubscription(sub: InsertVehicleSubscription): Promise<VehicleSubscription>;
  updateVehicleSubscription(vehicleId: string, updates: Partial<InsertVehicleSubscription>): Promise<void>;

  // Audit Logs
  getAuditLogs(limit?: number): Promise<AuditLog[]>;
  addAuditLog(userId: string | null, action: string, detail?: string): Promise<void>;

  // Hosted Plans
  getHostedPlans(): Promise<HostedPlan[]>;
  getHostedPlan(id: string): Promise<HostedPlan | undefined>;
  createHostedPlan(plan: InsertHostedPlan): Promise<HostedPlan>;
  updateHostedPlan(id: string, updates: Partial<InsertHostedPlan>): Promise<HostedPlan | undefined>;

  // Subscriptions (per-account billing records)
  getSubscriptions(userId?: string): Promise<Subscription[]>;
  createSubscription(sub: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // Trips
  getTrips(vehicleId?: string, startDate?: Date, endDate?: Date): Promise<Trip[]>;
  createTrip(trip: InsertTrip): Promise<Trip>;
  updateTrip(id: string, trip: Partial<Trip>): Promise<Trip | undefined>;

  // App Settings
  getSettings(): Promise<AppSetting[]>;
  getSetting(key: string): Promise<AppSetting | undefined>;
  setSetting(key: string, value: string): Promise<AppSetting>;

  // User Alert Settings
  getUserAlertSettings(userId: string): Promise<UserAlertSettings | undefined>;
  upsertUserAlertSettings(userId: string, settings: Partial<UserAlertSettings>): Promise<UserAlertSettings>;

  // Push Subscriptions
  savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription>;
  deletePushSubscription(userId: string, endpoint: string): Promise<boolean>;
  getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]>;
  getAllPushSubscriptions(): Promise<PushSubscription[]>;

  // Device Sessions (persisted TCP connection state)
  upsertDeviceSession(imei: string, remoteAddr: string): Promise<void>;
  heartbeatDeviceSession(imei: string): Promise<void>;
  locationAcceptedDeviceSession(imei: string): Promise<void>;
  locationRejectedDeviceSession(imei: string, reason: string): Promise<void>;
  markDeviceSessionDisconnected(imei: string): Promise<void>;
  getDeviceSession(imei: string): Promise<DeviceSession | undefined>;
  getAllDeviceSessions(): Promise<DeviceSession[]>;
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
    const dm = insertVehicle.deviceModel ?? null;
    await neonSql`INSERT INTO vehicles (id, name, device_id, type, status, icon_color, driver_name, license_plate, fuel_type, fuel_efficiency, fuel_rate_per_liter, fuel_tank_capacity, device_phone, device_model)
      VALUES (gen_random_uuid(), ${insertVehicle.name}, ${insertVehicle.deviceId}, ${insertVehicle.type ?? "car"}, ${insertVehicle.status ?? "offline"}, ${insertVehicle.iconColor ?? "#2563eb"}, ${insertVehicle.driverName ?? null}, ${insertVehicle.licensePlate ?? null}, ${insertVehicle.fuelType ?? null}, ${fe}, ${fr}, ${fc}, ${dp}, ${dm})`;
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

  async updateVehicleLastSeen(id: string, at: Date): Promise<void> {
    await neonSql`UPDATE vehicles SET last_seen_at = ${at.toISOString()} WHERE id = ${id}`;
  }

  async updateVehicleIgnition(id: string, ignitionOn: boolean): Promise<void> {
    await neonSql`UPDATE vehicles SET ignition_on = ${ignitionOn} WHERE id = ${id}`;
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

  async getLatestLocationTimestampsForVehicles(vehicleIds: string[]): Promise<Map<string, Date>> {
    if (vehicleIds.length === 0) return new Map();
    // Use sql.join with individual params — Neon HTTP driver can't serialize JS arrays
    // into Postgres array parameters for ANY(), but handles individual bindings correctly.
    const idList = sql.join(vehicleIds.map((id) => sql`${id}`), sql`, `);
    const result = await db.execute(sql`
      SELECT DISTINCT ON (vehicle_id)
        vehicle_id AS "vehicleId",
        timestamp
      FROM locations
      WHERE vehicle_id IN (${idList})
        AND latitude::float >= 5 AND latitude::float <= 37
        AND longitude::float >= 65 AND longitude::float <= 100
      ORDER BY vehicle_id, timestamp DESC
    `);
    const map = new Map<string, Date>();
    for (const row of (result.rows ?? []) as { vehicleId: string; timestamp: string | Date }[]) {
      map.set(row.vehicleId, new Date(row.timestamp));
    }
    return map;
  }

  async getLocationCountsForVehicles(vehicleIds: string[], since: Date): Promise<Map<string, number>> {
    if (vehicleIds.length === 0) return new Map();
    const idList = sql.join(vehicleIds.map((id) => sql`${id}`), sql`, `);
    const result = await db.execute(sql`
      SELECT vehicle_id AS "vehicleId", COUNT(*)::int AS "count"
      FROM locations
      WHERE vehicle_id IN (${idList})
        AND timestamp >= ${since.toISOString()}
      GROUP BY vehicle_id
    `);
    const map = new Map<string, number>();
    for (const row of (result.rows ?? []) as { vehicleId: string; count: number }[]) {
      map.set(row.vehicleId, row.count);
    }
    return map;
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

  private fixGeofenceBooleans(g: Geofence): Geofence {
    return {
      ...g,
      active: g.active === true || (g.active as unknown) === "true" || (g.active as unknown) === "t",
      alertOnEntry: g.alertOnEntry === true || (g.alertOnEntry as unknown) === "true" || (g.alertOnEntry as unknown) === "t",
      alertOnExit: g.alertOnExit === true || (g.alertOnExit as unknown) === "true" || (g.alertOnExit as unknown) === "t",
    };
  }

  async getGeofences(): Promise<Geofence[]> {
    const rows = await db.select().from(geofences);
    return rows.map(g => this.fixGeofenceBooleans(g));
  }

  async getGeofence(id: string): Promise<Geofence | undefined> {
    const result = await db.select().from(geofences).where(eq(geofences.id, id)).limit(1);
    return result[0] ? this.fixGeofenceBooleans(result[0]) : undefined;
  }

  async createGeofence(insertGeofence: InsertGeofence): Promise<Geofence> {
    const id = (await neonSql`SELECT gen_random_uuid() AS id`)[0].id as string;
    const coords = JSON.stringify(insertGeofence.coordinates);
    const alertOnEntry = insertGeofence.alertOnEntry !== false;
    const alertOnExit = insertGeofence.alertOnExit !== false;
    await neonSql`
      INSERT INTO geofences (id, name, description, type, coordinates, color, active, alert_on_entry, alert_on_exit)
      VALUES (
        ${id},
        ${insertGeofence.name},
        ${insertGeofence.description ?? null},
        ${insertGeofence.type ?? "polygon"},
        ${coords}::jsonb,
        ${insertGeofence.color ?? "#10b981"},
        TRUE,
        ${alertOnEntry},
        ${alertOnExit}
      )
    `;
    const rows = await db.select().from(geofences).where(eq(geofences.id, id));
    return this.fixGeofenceBooleans(rows[0]);
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

  async getEvents(vehicleId?: string, startDate?: Date, endDate?: Date, type?: string, severity?: string): Promise<Event[]> {
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
    if (type) {
      conditions.push(eq(events.type, type));
    }
    if (severity) {
      conditions.push(eq(events.severity, severity));
    }

    let query = db.select().from(events);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as typeof query;
    }
    
    return safeSelect(() => query.orderBy(desc(events.timestamp)));
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const result = await db.insert(events).values(insertEvent).returning();
    return result[0];
  }

  // Drivers
  async getDrivers(allowedVehicleIds?: string[] | null): Promise<Driver[]> {
    const all = await safeSelect(() => db.select().from(drivers).orderBy(drivers.name));
    if (allowedVehicleIds === null) return all; // admin
    if (!allowedVehicleIds || allowedVehicleIds.length === 0) return [];
    return all.filter(d => !d.assignedVehicleId || allowedVehicleIds.includes(d.assignedVehicleId));
  }

  async getDriver(id: string): Promise<Driver | undefined> {
    const result = await db.select().from(drivers).where(eq(drivers.id, id)).limit(1);
    return result[0];
  }

  async createDriver(driver: InsertDriver): Promise<Driver> {
    const result = await db.insert(drivers).values(driver).returning();
    return result[0];
  }

  async updateDriver(id: string, updates: Partial<InsertDriver>): Promise<Driver | undefined> {
    if (Object.keys(updates).length === 0) return this.getDriver(id);
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      set[key] = val === null ? sql`NULL` : val;
    }
    await db.update(drivers).set(set).where(eq(drivers.id, id));
    return this.getDriver(id);
  }

  async deleteDriver(id: string): Promise<boolean> {
    const result = await db.delete(drivers).where(eq(drivers.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Maintenance Records
  async getMaintenanceRecords(vehicleId?: string, allowedVehicleIds?: string[] | null): Promise<MaintenanceRecord[]> {
    const query = vehicleId
      ? db.select().from(maintenanceRecords).where(eq(maintenanceRecords.vehicleId, vehicleId)).orderBy(desc(maintenanceRecords.serviceDate))
      : db.select().from(maintenanceRecords).orderBy(desc(maintenanceRecords.serviceDate));
    const all = await safeSelect(() => query);
    if (allowedVehicleIds === null) return all;
    if (vehicleId) return all; // already filtered by query
    if (!allowedVehicleIds || allowedVehicleIds.length === 0) return [];
    return all.filter(r => allowedVehicleIds.includes(r.vehicleId));
  }

  async getMaintenanceRecord(id: string): Promise<MaintenanceRecord | undefined> {
    const result = await db.select().from(maintenanceRecords).where(eq(maintenanceRecords.id, id)).limit(1);
    return result[0];
  }

  async createMaintenanceRecord(record: InsertMaintenance): Promise<MaintenanceRecord> {
    const values = {
      vehicleId: record.vehicleId,
      serviceType: record.serviceType,
      serviceDate: record.serviceDate,
      odometer: record.odometer ?? null,
      cost: record.cost != null ? String(record.cost) : null,
      notes: record.notes ?? null,
      nextDueOdometer: record.nextDueOdometer ?? null,
      nextDueDate: record.nextDueDate ?? null,
    };
    const result = await db.insert(maintenanceRecords).values(values).returning();
    return result[0];
  }

  async updateMaintenanceRecord(id: string, updates: Partial<InsertMaintenance>): Promise<MaintenanceRecord | undefined> {
    if (Object.keys(updates).length === 0) return this.getMaintenanceRecord(id);
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (key === "cost") {
        set[key] = val != null ? String(val) : sql`NULL`;
      } else {
        set[key] = val === null || val === undefined ? sql`NULL` : val;
      }
    }
    await db.update(maintenanceRecords).set(set).where(eq(maintenanceRecords.id, id));
    return this.getMaintenanceRecord(id);
  }

  async deleteMaintenanceRecord(id: string): Promise<boolean> {
    const result = await db.delete(maintenanceRecords).where(eq(maintenanceRecords.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Expenses
  async getExpenses(vehicleId?: string, startDate?: Date, endDate?: Date, allowedVehicleIds?: string[] | null): Promise<Expense[]> {
    const conditions = [];
    if (vehicleId) conditions.push(eq(expenses.vehicleId, vehicleId));
    if (startDate) conditions.push(gte(expenses.date, startDate));
    if (endDate) conditions.push(lte(expenses.date, endDate));
    let query = db.select().from(expenses);
    if (conditions.length > 0) query = query.where(and(...conditions)) as typeof query;
    const all = await safeSelect(() => query.orderBy(desc(expenses.date)));
    if (allowedVehicleIds === null) return all;
    if (vehicleId) return all;
    if (!allowedVehicleIds || allowedVehicleIds.length === 0) return [];
    return all.filter(e => allowedVehicleIds.includes(e.vehicleId));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const result = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1);
    return result[0];
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const values = {
      vehicleId: expense.vehicleId,
      category: expense.category ?? "other",
      date: expense.date,
      amount: String(expense.amount),
      liters: expense.liters != null ? String(expense.liters) : null,
      notes: expense.notes ?? null,
    };
    const result = await db.insert(expenses).values(values).returning();
    return result[0];
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    if (Object.keys(updates).length === 0) return this.getExpense(id);
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (key === "amount" || key === "liters") {
        set[key] = val != null ? String(val) : sql`NULL`;
      } else {
        set[key] = val === null || val === undefined ? sql`NULL` : val;
      }
    }
    await db.update(expenses).set(set).where(eq(expenses.id, id));
    return this.getExpense(id);
  }

  async deleteExpense(id: string): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Device Models
  async getDeviceModels(): Promise<DeviceModel[]> {
    return safeSelect(() => db.select().from(deviceModels).orderBy(deviceModels.manufacturer, deviceModels.modelName));
  }

  async getDeviceModel(id: string): Promise<DeviceModel | undefined> {
    const result = await db.select().from(deviceModels).where(eq(deviceModels.id, id)).limit(1);
    return result[0];
  }

  async createDeviceModel(model: InsertDeviceModel): Promise<DeviceModel> {
    const values = {
      manufacturer: model.manufacturer,
      modelName: model.modelName,
      protocol: model.protocol ?? "gt06",
      port: model.port ?? null,
      connectionType: model.connectionType ?? "tcp",
      activationNotes: model.activationNotes ?? null,
    };
    const result = await db.insert(deviceModels).values(values).returning();
    return result[0];
  }

  async updateDeviceModel(id: string, updates: Partial<InsertDeviceModel>): Promise<DeviceModel | undefined> {
    if (Object.keys(updates).length === 0) return this.getDeviceModel(id);
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      set[key] = val === null || val === undefined ? sql`NULL` : val;
    }
    await db.update(deviceModels).set(set).where(eq(deviceModels.id, id));
    return this.getDeviceModel(id);
  }

  async deleteDeviceModel(id: string): Promise<boolean> {
    const result = await db.delete(deviceModels).where(eq(deviceModels.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Vehicle Subscriptions
  async getVehicleSubscriptions(vehicleId?: string): Promise<VehicleSubscription[]> {
    const query = vehicleId
      ? db.select().from(vehicleSubscriptions).where(eq(vehicleSubscriptions.vehicleId, vehicleId)).orderBy(desc(vehicleSubscriptions.createdAt))
      : db.select().from(vehicleSubscriptions).orderBy(desc(vehicleSubscriptions.createdAt));
    return safeSelect(() => query);
  }

  async createVehicleSubscription(sub: InsertVehicleSubscription): Promise<VehicleSubscription> {
    const result = await db.insert(vehicleSubscriptions).values(sub).returning();
    return result[0];
  }

  async updateVehicleSubscription(vehicleId: string, updates: Partial<InsertVehicleSubscription>): Promise<void> {
    if (Object.keys(updates).length === 0) return;
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      set[key] = val === null || val === undefined ? sql`NULL` : val;
    }
    await db.update(vehicleSubscriptions).set(set).where(eq(vehicleSubscriptions.vehicleId, vehicleId));
  }

  // Audit Logs
  async getAuditLogs(limit = 200): Promise<AuditLog[]> {
    return safeSelect(() => db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit));
  }

  async addAuditLog(userId: string | null, action: string, detail?: string): Promise<void> {
    try {
      await db.insert(auditLogs).values({ userId: userId ?? null, action, detail: detail ?? null });
    } catch (err) {
      // Non-critical: audit log failures should not break user-facing operations.
      // Log to stderr so errors are visible in server logs without impacting callers.
      console.error("[audit-log] Failed to write audit entry:", action, err instanceof Error ? err.message : String(err));
    }
  }

  // Hosted Plans
  async getHostedPlans(): Promise<HostedPlan[]> {
    // Use raw SQL for boolean column to avoid Neon HTTP driver "t"/"f" string comparison issue
    return safeSelect(() => db.select().from(hostedPlans).where(sql`${hostedPlans.active} = true`).orderBy(hostedPlans.pricePerYear));
  }

  async getHostedPlan(id: string): Promise<HostedPlan | undefined> {
    const rows = await safeSelect(() => db.select().from(hostedPlans).where(eq(hostedPlans.id, id)).limit(1));
    return rows[0];
  }

  async createHostedPlan(plan: InsertHostedPlan): Promise<HostedPlan> {
    const result = await db.insert(hostedPlans).values(plan).returning();
    return result[0];
  }

  async updateHostedPlan(id: string, updates: Partial<InsertHostedPlan>): Promise<HostedPlan | undefined> {
    if (Object.keys(updates).length === 0) return this.getHostedPlan(id);
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      set[key] = val === null || val === undefined ? sql`NULL` : val;
    }
    await db.update(hostedPlans).set(set).where(eq(hostedPlans.id, id));
    return this.getHostedPlan(id);
  }

  // Subscriptions (per-account billing records)
  async getSubscriptions(userId?: string): Promise<Subscription[]> {
    const query = userId
      ? db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt))
      : db.select().from(subscriptions).orderBy(desc(subscriptions.createdAt));
    return safeSelect(() => query);
  }

  async createSubscription(sub: InsertSubscription): Promise<Subscription> {
    const result = await db.insert(subscriptions).values(sub).returning();
    return result[0];
  }

  async updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    if (Object.keys(updates).length === 0) {
      const rows = await safeSelect(() => db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1));
      return rows[0];
    }
    const set: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(updates)) {
      set[key] = val === null || val === undefined ? sql`NULL` : val;
    }
    await db.update(subscriptions).set(set).where(eq(subscriptions.id, id));
    const rows = await safeSelect(() => db.select().from(subscriptions).where(eq(subscriptions.id, id)).limit(1));
    return rows[0];
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
    
    return safeSelect(() => query.orderBy(desc(trips.startTime)));
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
    return safeSelect(() => db.select().from(appSettings));
  }

  async getSetting(key: string): Promise<AppSetting | undefined> {
    const rows = await safeSelect(() => db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1));
    return rows[0];
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

  async getUserAlertSettings(userId: string): Promise<UserAlertSettings | undefined> {
    // Use db.execute with explicit text cast for boolean columns to work around the Neon HTTP
    // driver boolean coercion bug — the driver returns all booleans as false regardless of value.
    const result = await db.execute(sql`
      SELECT user_id AS "userId",
             speed_alert_enabled::text AS "speedAlertEnabled",
             speed_threshold_kph AS "speedThresholdKph",
             parking_alert_enabled::text AS "parkingAlertEnabled",
             parking_threshold_min AS "parkingThresholdMin",
             idle_alert_enabled::text AS "idleAlertEnabled",
             idle_threshold_min AS "idleThresholdMin",
             geofence_alert_enabled::text AS "geofenceAlertEnabled"
      FROM user_alert_settings
      WHERE user_id = ${userId}
      LIMIT 1
    `);
    const rows = (result.rows ?? []) as Record<string, unknown>[];
    if (rows.length === 0) return undefined;
    const row = rows[0];
    const parseBool = (v: unknown) => v === "true" || v === "t" || v === true || v === 1;
    return {
      userId: row["userId"] as string,
      speedAlertEnabled: parseBool(row["speedAlertEnabled"]),
      speedThresholdKph: Number(row["speedThresholdKph"]),
      parkingAlertEnabled: parseBool(row["parkingAlertEnabled"]),
      parkingThresholdMin: Number(row["parkingThresholdMin"]),
      idleAlertEnabled: parseBool(row["idleAlertEnabled"]),
      idleThresholdMin: Number(row["idleThresholdMin"]),
      geofenceAlertEnabled: parseBool(row["geofenceAlertEnabled"]),
    } as UserAlertSettings;
  }

  async upsertUserAlertSettings(userId: string, settings: Partial<UserAlertSettings>): Promise<UserAlertSettings> {
    // Merge with existing row to preserve any fields not included in a partial update.
    const existing = await this.getUserAlertSettings(userId);
    const merged = {
      speedAlertEnabled: settings.speedAlertEnabled ?? existing?.speedAlertEnabled ?? false,
      speedThresholdKph: settings.speedThresholdKph ?? existing?.speedThresholdKph ?? 80,
      parkingAlertEnabled: settings.parkingAlertEnabled ?? existing?.parkingAlertEnabled ?? false,
      parkingThresholdMin: settings.parkingThresholdMin ?? existing?.parkingThresholdMin ?? 60,
      idleAlertEnabled: settings.idleAlertEnabled ?? existing?.idleAlertEnabled ?? false,
      idleThresholdMin: settings.idleThresholdMin ?? existing?.idleThresholdMin ?? 10,
      geofenceAlertEnabled: settings.geofenceAlertEnabled ?? existing?.geofenceAlertEnabled ?? true,
    };

    // Use raw SQL INSERT ... ON CONFLICT DO UPDATE to avoid Neon HTTP driver boolean bug
    // with drizzle db.update().set() which silently coerces booleans to false.
    await neonSql`
      INSERT INTO user_alert_settings (
        user_id, speed_alert_enabled, speed_threshold_kph,
        parking_alert_enabled, parking_threshold_min,
        idle_alert_enabled, idle_threshold_min,
        geofence_alert_enabled
      ) VALUES (
        ${userId}, ${merged.speedAlertEnabled}, ${merged.speedThresholdKph},
        ${merged.parkingAlertEnabled}, ${merged.parkingThresholdMin},
        ${merged.idleAlertEnabled}, ${merged.idleThresholdMin},
        ${merged.geofenceAlertEnabled}
      )
      ON CONFLICT (user_id) DO UPDATE SET
        speed_alert_enabled = EXCLUDED.speed_alert_enabled,
        speed_threshold_kph = EXCLUDED.speed_threshold_kph,
        parking_alert_enabled = EXCLUDED.parking_alert_enabled,
        parking_threshold_min = EXCLUDED.parking_threshold_min,
        idle_alert_enabled = EXCLUDED.idle_alert_enabled,
        idle_threshold_min = EXCLUDED.idle_threshold_min,
        geofence_alert_enabled = EXCLUDED.geofence_alert_enabled
    `;
    const updated = await this.getUserAlertSettings(userId);
    return updated!;
  }

  async savePushSubscription(sub: InsertPushSubscription): Promise<PushSubscription> {
    // Use INSERT ... ON CONFLICT DO UPDATE to upsert (same user+endpoint pair is idempotent)
    await neonSql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
      VALUES (${sub.userId}, ${sub.endpoint}, ${sub.p256dh}, ${sub.auth})
      ON CONFLICT (user_id, endpoint) DO UPDATE SET
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth
    `;
    const rows = await db.select().from(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, sub.userId), eq(pushSubscriptions.endpoint, sub.endpoint)))
      .limit(1);
    return rows[0];
  }

  async deletePushSubscription(userId: string, endpoint: string): Promise<boolean> {
    const result = await db.delete(pushSubscriptions)
      .where(and(eq(pushSubscriptions.userId, userId), eq(pushSubscriptions.endpoint, endpoint)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async getPushSubscriptionsByUser(userId: string): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
  }

  async getAllPushSubscriptions(): Promise<PushSubscription[]> {
    return await db.select().from(pushSubscriptions);
  }

  // ─── Device Sessions ──────────────────────────────────────────────────────
  // Uses raw neonSql for all writes to avoid Neon HTTP driver issues with
  // complex ON CONFLICT clauses. Reads use drizzle ORM selects.

  async upsertDeviceSession(imei: string, remoteAddr: string): Promise<void> {
    // On reconnect: reset all per-session counters/fields to start fresh.
    // This means counters always reflect the *current* TCP session, not lifetime totals.
    await neonSql`
      INSERT INTO device_sessions (imei, remote_addr, connected_at, last_heartbeat_at, last_location_at, heartbeat_count, location_count, rejected_count, last_rejection_reason, is_connected, updated_at)
      VALUES (${imei}, ${remoteAddr}, NOW(), NOW(), NULL, 0, 0, 0, NULL, TRUE, NOW())
      ON CONFLICT (imei) DO UPDATE SET
        remote_addr = EXCLUDED.remote_addr,
        connected_at = NOW(),
        last_heartbeat_at = NOW(),
        last_location_at = NULL,
        heartbeat_count = 0,
        location_count = 0,
        rejected_count = 0,
        last_rejection_reason = NULL,
        is_connected = TRUE,
        updated_at = NOW()
    `;
  }

  async heartbeatDeviceSession(imei: string): Promise<void> {
    await neonSql`
      UPDATE device_sessions
      SET last_heartbeat_at = NOW(), heartbeat_count = heartbeat_count + 1, is_connected = TRUE, updated_at = NOW()
      WHERE imei = ${imei}
    `;
  }

  async locationAcceptedDeviceSession(imei: string): Promise<void> {
    await neonSql`
      UPDATE device_sessions
      SET last_location_at = NOW(), location_count = location_count + 1, updated_at = NOW()
      WHERE imei = ${imei}
    `;
  }

  async locationRejectedDeviceSession(imei: string, reason: string): Promise<void> {
    await neonSql`
      UPDATE device_sessions
      SET rejected_count = rejected_count + 1, last_rejection_reason = ${reason}, updated_at = NOW()
      WHERE imei = ${imei}
    `;
  }

  async markDeviceSessionDisconnected(imei: string): Promise<void> {
    await neonSql`
      UPDATE device_sessions
      SET is_connected = FALSE, updated_at = NOW()
      WHERE imei = ${imei}
    `;
  }

  async getDeviceSession(imei: string): Promise<DeviceSession | undefined> {
    const rows = await safeSelect(() =>
      db.select().from(deviceSessions).where(eq(deviceSessions.imei, imei)).limit(1)
    );
    return rows[0];
  }

  async getAllDeviceSessions(): Promise<DeviceSession[]> {
    return await safeSelect(() => db.select().from(deviceSessions));
  }
}

export const storage = new DbStorage();
