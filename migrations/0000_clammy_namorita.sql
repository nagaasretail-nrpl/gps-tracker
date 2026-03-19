CREATE TABLE "activities" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"name" text NOT NULL,
	"type" text DEFAULT 'walking' NOT NULL,
	"description" text,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"distance" numeric(10, 2),
	"duration" integer,
	"max_speed" numeric(6, 2),
	"avg_speed" numeric(6, 2),
	"avg_moving_speed" numeric(6, 2),
	"moving_time" integer,
	"max_altitude" numeric(7, 2),
	"min_altitude" numeric(7, 2),
	"elevation_gain" numeric(7, 2),
	"elevation_loss" numeric(7, 2),
	"avg_slope" numeric(5, 2),
	"max_slope" numeric(5, 2),
	"min_slope" numeric(5, 2),
	"coordinates" jsonb,
	"color" text DEFAULT '#FF6B35',
	"is_recording" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"severity" text DEFAULT 'info',
	"data" jsonb,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "geofences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" text DEFAULT 'polygon' NOT NULL,
	"coordinates" jsonb NOT NULL,
	"color" text DEFAULT '#10b981',
	"active" boolean DEFAULT true NOT NULL,
	"alert_on_entry" boolean DEFAULT true,
	"alert_on_exit" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar,
	"activity_id" varchar,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"altitude" numeric(7, 2),
	"speed" numeric(6, 2),
	"heading" numeric(5, 2),
	"address" text,
	"accuracy" numeric(6, 2),
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pois" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"category" text,
	"icon" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"coordinates" jsonb NOT NULL,
	"color" text DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trips" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vehicle_id" varchar NOT NULL,
	"start_time" timestamp NOT NULL,
	"end_time" timestamp,
	"start_location" jsonb,
	"end_location" jsonb,
	"distance" numeric(10, 2),
	"duration" integer,
	"max_speed" numeric(6, 2),
	"avg_speed" numeric(6, 2)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"parent_user_id" varchar,
	"avatar" text,
	"phone" text,
	"department" text,
	"preferences" jsonb,
	"status" text DEFAULT 'active' NOT NULL,
	"subscription_type" text DEFAULT 'basic',
	"subscription_expiry" timestamp,
	"allowed_vehicle_ids" text[],
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"device_id" text NOT NULL,
	"type" text DEFAULT 'car' NOT NULL,
	"status" text DEFAULT 'offline' NOT NULL,
	"icon_color" text DEFAULT '#2563eb',
	"driver_name" text,
	"license_plate" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_device_id_unique" UNIQUE("device_id")
);
