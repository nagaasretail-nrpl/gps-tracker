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
