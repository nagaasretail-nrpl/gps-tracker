import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, jsonb, boolean, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User profiles (for personal tracking mode + authentication)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email"),
  password: text("password").notNull(), // bcrypt hashed password
  role: text("role").notNull().default("user"), // user, admin, subuser
  parentUserId: varchar("parent_user_id"), // for subusers - links to parent user
  avatar: text("avatar"),
  phone: text("phone").unique(),
  department: text("department"),
  preferences: jsonb("preferences"), // units, map type, etc
  // Subscription / validity fields
  status: text("status").notNull().default("active"), // active, inactive, suspended
  subscriptionType: text("subscription_type").default("basic"), // basic, pro, enterprise
  subscriptionExpiry: timestamp("subscription_expiry"),
  // Vehicle access control: list of vehicle IDs this user can see (null = all vehicles for admin)
  allowedVehicleIds: text("allowed_vehicle_ids").array(),
  // Menu access control: list of route URLs this user can see (null = all menus allowed)
  allowedMenus: text("allowed_menus").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema for creating new users (signup)
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
}).extend({
  phone: z.string().min(10, "Mobile number must be at least 10 digits"),
});

// Schema for signup requests (includes plain password before hashing)
// Role is omitted to prevent privilege escalation - users are always created as "user" role
export const signupSchema = insertUserSchema.omit({
  password: true,
  role: true,
}).extend({
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Schema for login requests
export const loginSchema = z.object({
  phone: z.string().min(1, "Mobile number is required"),
  password: z.string().min(1, "Password is required"),
});

// Schema for regular users updating their own profile (safe fields only)
export const updateProfileSchema = z.object({
  name: z.string().optional(),
  avatar: z.string().optional(),
  phone: z.string().optional(),
  department: z.string().optional(),
  preferences: z.any().optional(),
});

// Schema for admin updating any user (includes sensitive fields)
export const adminUpdateUserSchema = updateProfileSchema.extend({
  email: z.string().email().optional().nullable(),
  role: z.enum(["user", "admin", "subuser"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  status: z.enum(["active", "inactive", "suspended"]).optional(),
  subscriptionType: z.enum(["basic", "pro", "enterprise"]).optional(),
  subscriptionExpiry: z.string().datetime().optional().nullable(),
  allowedVehicleIds: z.array(z.string()).optional().nullable(),
  allowedMenus: z.array(z.string()).optional().nullable(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type AdminUpdateUser = z.infer<typeof adminUpdateUserSchema>;

// App settings table (key/value store for system-wide config)
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings);
export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// Activities table (for personal tracking: hikes, runs, bike rides, etc.)
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  name: text("name").notNull(),
  type: text("type").notNull().default("walking"), // walking, running, hiking, cycling, driving, etc.
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  distance: decimal("distance", { precision: 10, scale: 2 }), // km
  duration: integer("duration"), // seconds
  maxSpeed: decimal("max_speed", { precision: 6, scale: 2 }), // km/h
  avgSpeed: decimal("avg_speed", { precision: 6, scale: 2 }), // km/h
  avgMovingSpeed: decimal("avg_moving_speed", { precision: 6, scale: 2 }), // km/h (excluding stops)
  movingTime: integer("moving_time"), // seconds
  maxAltitude: decimal("max_altitude", { precision: 7, scale: 2 }), // meters
  minAltitude: decimal("min_altitude", { precision: 7, scale: 2 }), // meters
  elevationGain: decimal("elevation_gain", { precision: 7, scale: 2 }), // meters (total ascent)
  elevationLoss: decimal("elevation_loss", { precision: 7, scale: 2 }), // meters (total descent)
  avgSlope: decimal("avg_slope", { precision: 5, scale: 2 }), // percentage
  maxSlope: decimal("max_slope", { precision: 5, scale: 2 }), // percentage
  minSlope: decimal("min_slope", { precision: 5, scale: 2 }), // percentage
  coordinates: jsonb("coordinates"), // array of location points
  color: text("color").default("#FF6B35"), // track color on map
  isRecording: boolean("is_recording").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Vehicles table (for fleet management)
export const vehicles = pgTable("vehicles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  deviceId: text("device_id").notNull().unique(),
  type: text("type").notNull().default("car"), // car, truck, motorcycle, etc.
  status: text("status").notNull().default("offline"), // active, stopped, offline
  iconColor: text("icon_color").default("#2563eb"),
  driverName: text("driver_name"),
  licensePlate: text("license_plate"),
  fuelType: text("fuel_type"), // petrol, diesel, cng, electric; null = not set
  fuelEfficiency: decimal("fuel_efficiency", { precision: 5, scale: 2 }), // km/L (or km/kWh for electric); null = not set
  fuelRatePerLiter: decimal("fuel_rate_per_liter", { precision: 10, scale: 2 }), // cost per liter/unit; null = not set
  fuelTankCapacity: decimal("fuel_tank_capacity", { precision: 10, scale: 2 }), // liters; null = not set
  devicePhone: text("device_phone"), // SIM card phone number on the GPS tracker
  parkedSince: timestamp("parked_since"), // set when vehicle transitions from moving → stopped
  lastSeenAt: timestamp("last_seen_at"), // set whenever any GT06 TCP packet arrives from this IMEI
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).omit({
  id: true,
  createdAt: true,
}).extend({
  name: z.string().min(1, "Vehicle name is required"),
  deviceId: z.string().min(1, "Device ID is required"),
  fuelEfficiency: z.coerce.number().positive().nullable().optional(),
  fuelType: z.enum(["petrol", "diesel", "cng", "electric"]).nullable().optional(),
  fuelRatePerLiter: z.coerce.number().positive().nullable().optional(),
  fuelTankCapacity: z.coerce.number().positive().nullable().optional(),
  devicePhone: z.string().nullable().optional(),
});

export const updateVehicleSchema = z.object({
  name: z.string().min(1).optional(),
  deviceId: z.string().min(1).optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  iconColor: z.string().optional(),
  driverName: z.string().nullable().optional(),
  licensePlate: z.string().nullable().optional(),
  fuelType: z.enum(["petrol", "diesel", "cng", "electric"]).nullable().optional(),
  fuelEfficiency: z.number().positive().nullable().optional(),
  fuelRatePerLiter: z.number().positive().nullable().optional(),
  fuelTankCapacity: z.number().positive().nullable().optional(),
  devicePhone: z.string().nullable().optional(),
  parkedSince: z.date().nullable().optional(),
});

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

// Location updates table (used by both vehicles and activities)
// CONSTRAINT: Must have either vehicleId OR activityId (not both, not neither)
export const locations = pgTable("locations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id"),
  activityId: varchar("activity_id"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  altitude: decimal("altitude", { precision: 7, scale: 2 }),
  speed: decimal("speed", { precision: 6, scale: 2 }), // km/h
  heading: decimal("heading", { precision: 5, scale: 2 }), // degrees 0-360
  address: text("address"),
  accuracy: decimal("accuracy", { precision: 6, scale: 2 }),
  satellites: integer("satellites"), // GPS satellite count
  isStationary: boolean("is_stationary").default(false), // true when vehicle is not moving
  accuracyScore: integer("accuracy_score").default(100), // 0-100 quality score
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  // Check constraint: exactly one of vehicleId or activityId must be non-null
  checkConstraint: sql`CHECK (
    (vehicle_id IS NOT NULL AND activity_id IS NULL) OR 
    (vehicle_id IS NULL AND activity_id IS NOT NULL)
  )`,
}));

export const insertLocationSchema = createInsertSchema(locations).omit({
  id: true,
}).refine(
  (data) => (data.vehicleId && !data.activityId) || (!data.vehicleId && data.activityId),
  {
    message: "Location must have exactly one of vehicleId or activityId",
  }
);

export type InsertLocation = z.infer<typeof insertLocationSchema>;
export type Location = typeof locations.$inferSelect;

// Geofences table
export const geofences = pgTable("geofences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: text("type").notNull().default("polygon"), // polygon, circle
  coordinates: jsonb("coordinates").notNull(), // array of [lat, lng] or {center: [lat, lng], radius: number}
  color: text("color").default("#10b981"),
  active: boolean("active").default(true).notNull(),
  alertOnEntry: boolean("alert_on_entry").default(true),
  alertOnExit: boolean("alert_on_exit").default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertGeofenceSchema = createInsertSchema(geofences).omit({
  id: true,
  createdAt: true,
});

export type InsertGeofence = z.infer<typeof insertGeofenceSchema>;
export type Geofence = typeof geofences.$inferSelect;

// Routes table
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  coordinates: jsonb("coordinates").notNull(), // array of [lat, lng]
  color: text("color").default("#3b82f6"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRouteSchema = createInsertSchema(routes).omit({
  id: true,
  createdAt: true,
});

export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

// Points of Interest table
export const pois = pgTable("pois", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  category: text("category"), // parking, fuel, service, custom
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPoiSchema = createInsertSchema(pois).omit({
  id: true,
  createdAt: true,
});

export type InsertPoi = z.infer<typeof insertPoiSchema>;
export type Poi = typeof pois.$inferSelect;

// Events table
export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(),
  type: text("type").notNull(), // geofence_entry, geofence_exit, speed_violation, etc.
  description: text("description").notNull(),
  severity: text("severity").default("info"), // info, warning, critical
  data: jsonb("data"), // additional event data
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  timestamp: true,
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// Trips table
export const trips = pgTable("trips", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vehicleId: varchar("vehicle_id").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  startLocation: jsonb("start_location"), // {lat, lng, address}
  endLocation: jsonb("end_location"), // {lat, lng, address}
  distance: decimal("distance", { precision: 10, scale: 2 }), // km
  duration: integer("duration"), // minutes
  maxSpeed: decimal("max_speed", { precision: 6, scale: 2 }), // km/h
  avgSpeed: decimal("avg_speed", { precision: 6, scale: 2 }), // km/h
});

export const insertTripSchema = createInsertSchema(trips).omit({
  id: true,
});

export type InsertTrip = z.infer<typeof insertTripSchema>;
export type Trip = typeof trips.$inferSelect;

// Push notification subscriptions (Web Push API)
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userEndpointUnique: uniqueIndex("push_subscriptions_user_id_endpoint_key").on(table.userId, table.endpoint),
}));

export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
});

export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;

// User alert settings table (per-user notification preferences)
export const userAlertSettings = pgTable("user_alert_settings", {
  userId: varchar("user_id").primaryKey(),
  speedAlertEnabled: boolean("speed_alert_enabled").default(false).notNull(),
  speedThresholdKph: integer("speed_threshold_kph").default(80).notNull(),
  parkingAlertEnabled: boolean("parking_alert_enabled").default(false).notNull(),
  parkingThresholdMin: integer("parking_threshold_min").default(60).notNull(),
  idleAlertEnabled: boolean("idle_alert_enabled").default(false).notNull(),
  idleThresholdMin: integer("idle_threshold_min").default(10).notNull(),
  geofenceAlertEnabled: boolean("geofence_alert_enabled").default(true).notNull(),
});

export const insertUserAlertSettingsSchema = createInsertSchema(userAlertSettings);

export type InsertUserAlertSettings = z.infer<typeof insertUserAlertSettingsSchema>;
export type UserAlertSettings = typeof userAlertSettings.$inferSelect;
