import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";
import { neon } from "@neondatabase/serverless";
import { registerRoutes } from "./routes";
import { setupAuth, hashPassword } from "./auth";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { startGT06Server } from "./gt06-server";

// ── Incremental DB Migrations ────────────────────────────────────────────────
// Safe, idempotent ALTER TABLE statements for columns added after initial
// schema creation. Using IF NOT EXISTS means these are no-ops on environments
// that already have the column (VPS, production, etc.).
async function runMigrations() {
  try {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS ignition_on boolean`;
    await sql`ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS device_model text`;
    log("DB migrations: OK");
  } catch (err) {
    log("DB migrations warning: " + (err instanceof Error ? err.message : String(err)));
  }
}

const app = express();
app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      // COOKIE_SECURE=false lets the VPS serve over plain HTTP while still
      // running NODE_ENV=production (so static files are served correctly).
      // After adding HTTPS/certbot, set COOKIE_SECURE=true.
      secure: process.env.COOKIE_SECURE === "false"
        ? false
        : process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: (process.env.COOKIE_SECURE === "false" || process.env.NODE_ENV !== "production")
        ? "lax"
        : "none",
    },
    store: new PgSession({
      pool: pgPool,
      createTableIfMissing: true,
    }),
  })
);

setupAuth(app);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Run idempotent DB migrations before starting the server
  await runMigrations();

  const server = await registerRoutes(app);

  // Start GT06 binary TCP server (GT06N GPS tracker protocol)
  startGT06Server();

  // Seed demo users if they don't exist
  try {
    log("Seeding demo users...");
    const demoUsers = [
      { phone: "9843777277", email: "admin@gps.com", password: "admin123", name: "Admin User", role: "admin" as const },
      { phone: "9000000002", email: "user@gps.com", password: "user123", name: "Regular User", role: "user" as const },
      { phone: "9000000003", email: "test@example.com", password: "password123", name: "Test User", role: "user" as const },
    ];

    for (const demoUser of demoUsers) {
      try {
        const existingByPhone = await storage.getUserByPhone(demoUser.phone);
        const existingByEmail = await storage.getUserByEmail(demoUser.email);
        const existing = existingByPhone || existingByEmail;
        if (!existing) {
          const hashedPassword = await hashPassword(demoUser.password);
          await storage.createUser({
            name: demoUser.name,
            phone: demoUser.phone,
            email: demoUser.email,
            password: hashedPassword,
            role: demoUser.role,
            avatar: null,
            preferences: {},
          });
          log(`✓ Created: ${demoUser.phone} / ${demoUser.password}`);
        } else {
          // Ensure existing demo users have the correct current phone number
          if (existing.phone !== demoUser.phone) {
            await storage.updateUser(existing.id, { phone: demoUser.phone });
            log(`✓ Updated phone for existing user: ${existing.phone || existing.email} → ${demoUser.phone}`);
          } else {
            log(`✓ Already exists: ${demoUser.phone}`);
          }
        }
      } catch (userError) {
        log(`✗ Failed to seed ${demoUser.phone}: ${userError instanceof Error ? userError.message : "Unknown error"}`);
      }
    }
  } catch (error) {
    log("Error in user seeding: " + (error instanceof Error ? error.message : "Unknown error"));
  }

  // Seed 25 common GPS tracker device models (idempotent — only adds missing ones)
  try {
    const existingModels = await storage.getDeviceModels();
    if (existingModels.length === 0) {
      log("Seeding device models...");
      const SEED_MODELS = [
        { manufacturer: "Concox", modelName: "GT06N", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Most common GT06-compatible tracker" },
        { manufacturer: "Concox", modelName: "AT4", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "4G LTE version of GT06" },
        { manufacturer: "Teltonika", modelName: "FMB140", protocol: "teltonika", port: 5027, connectionType: "tcp", activationNotes: "Advanced tracker with GNSS" },
        { manufacturer: "Teltonika", modelName: "FMB920", protocol: "teltonika", port: 5027, connectionType: "tcp", activationNotes: "Compact 4G tracker" },
        { manufacturer: "Teltonika", modelName: "FM3001", protocol: "teltonika", port: 5027, connectionType: "tcp", activationNotes: "LTE Cat-M1 tracker" },
        { manufacturer: "Queclink", modelName: "GV300", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "GT06 compatible vehicle tracker" },
        { manufacturer: "Queclink", modelName: "GV500", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "4G LTE Queclink tracker" },
        { manufacturer: "Boxty", modelName: "VT-200", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Budget GT06 tracker" },
        { manufacturer: "Sinotrack", modelName: "ST-901", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Popular budget tracker, GT06 protocol" },
        { manufacturer: "Sinotrack", modelName: "ST-906", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Wired tracker with relay" },
        { manufacturer: "Meiligao", modelName: "MVT340", protocol: "meiligao", port: 5026, connectionType: "tcp", activationNotes: "Meiligao protocol tracker" },
        { manufacturer: "Meiligao", modelName: "MVT600", protocol: "meiligao", port: 5026, connectionType: "tcp", activationNotes: "Fleet-grade Meiligao tracker" },
        { manufacturer: "TopFlyTech", modelName: "T8803", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "GT06 compatible 4G tracker" },
        { manufacturer: "Suntech", modelName: "ST310U", protocol: "suntech", port: 5025, connectionType: "tcp", activationNotes: "Suntech protocol asset tracker" },
        { manufacturer: "Suntech", modelName: "ST600R", protocol: "suntech", port: 5025, connectionType: "tcp", activationNotes: "Suntech vehicle tracker" },
        { manufacturer: "Ruptela", modelName: "FM-Eco4+", protocol: "ruptela", port: 5028, connectionType: "tcp", activationNotes: "EU-grade Ruptela tracker" },
        { manufacturer: "CalAmp", modelName: "LMU-2630", protocol: "calamp", port: 5029, connectionType: "tcp", activationNotes: "CalAmp OBD tracker" },
        { manufacturer: "Digital Matter", modelName: "Oyster3", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Long-life battery asset tracker" },
        { manufacturer: "Trackimo", modelName: "Optimus 2.0", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Compact personal/vehicle tracker" },
        { manufacturer: "Jimi IoT", modelName: "JM-LL501", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "4G dashcam + tracker combo" },
        { manufacturer: "Jimi IoT", modelName: "VL502", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Plug-n-play OBD GT06 tracker" },
        { manufacturer: "Gosafe", modelName: "G1SE", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Wired GT06 2G tracker" },
        { manufacturer: "Gosafe", modelName: "G797", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "4G fleet tracker, GT06" },
        { manufacturer: "Neomatica", modelName: "ADM700", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Professional fleet tracker" },
        { manufacturer: "Jointech", modelName: "JT703", protocol: "gt06", port: 5023, connectionType: "tcp", activationNotes: "Cargo/container tracker GT06" },
      ];
      for (const model of SEED_MODELS) {
        await storage.createDeviceModel(model);
      }
      log(`✓ Seeded ${SEED_MODELS.length} device models`);
    } else {
      log(`✓ Device models: ${existingModels.length} exist (no seed needed)`);
    }
  } catch (seedErr) {
    log("Warning: device model seeding failed — " + (seedErr instanceof Error ? seedErr.message : String(seedErr)));
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
