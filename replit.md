# GPS Fleet Tracker - Web Application

## Overview

A **GPS fleet management web application** for real-time vehicle tracking, geofencing, route history, and fleet management.

## Architecture

### Frontend (React + TypeScript + Vite)
- **Framework:** React with TypeScript
- **UI:** shadcn/ui components + Tailwind CSS
- **Routing:** wouter
- **State:** TanStack Query v5 (React Query)
- **Real-time:** WebSocket client for live GPS updates
- **Build tool:** Vite

### Backend (Express.js + Node.js)
- **Server:** Express.js with TypeScript (tsx)
- **Database:** PostgreSQL via Neon serverless (`@neondatabase/serverless`)
- **ORM:** Drizzle ORM with drizzle-zod validation
- **Real-time:** WebSocket server (ws) broadcasting location updates
- **Auth:** Session-based auth with `express-session` + `connect-pg-simple`
- **Port:** 5000

### Shared Types
- `shared/schema.ts` — Drizzle table definitions + Zod insert schemas + TypeScript types

## Key Features

1. **Real-time vehicle tracking** via WebSocket
2. **Geofencing** with polygon and circle zone alerts
3. **Route/trip history** with playback
4. **Fleet management** — add/edit/delete vehicles
5. **User authentication** with role-based access (admin/user)
6. **Personal activity tracking** (hikes, runs, etc.)

## Device Data Ingestion

GPS hardware devices can send location data directly to the app **without session auth** using the device's ID (IMEI):

```
POST /api/device/location
Content-Type: application/json

{
  "deviceId": "<vehicle's Device ID (IMEI)>",
  "latitude": 37.7749,
  "longitude": -122.4194,
  "speed": 60,
  "altitude": 120.5,     // optional
  "accuracy": 5.0,        // optional
  "timestamp": "2026-01-01T12:00:00Z"  // optional, defaults to now
}
```

- Vehicle status updates to `"active"` when speed > 5 km/h, `"stopped"` when speed ≤ 5
- Returns 404 if the `deviceId` doesn't match any registered vehicle

## Demo Credentials
- Admin: `admin@gps.com` / `admin123`
- User: `user@gps.com` / `user123`

## Project Structure

```
/
├── client/                   # React frontend
│   ├── src/
│   │   ├── App.tsx           # Router + layout
│   │   ├── pages/            # Page components (dashboard, vehicles, map, etc.)
│   │   ├── components/       # Shared UI components
│   │   └── lib/              # queryClient, utilities
│   └── public/sw.js          # Service worker (PWA caching)
│
├── server/                   # Express backend
│   ├── index.ts              # Express setup, session, WebSocket
│   ├── routes.ts             # All API routes (+ public device endpoint)
│   ├── auth-routes.ts        # Login/logout/register
│   ├── auth.ts               # requireAuth / requireAdmin middleware
│   ├── storage.ts            # IStorage interface + DbStorage (Drizzle)
│   ├── db.ts                 # Neon + Drizzle client
│   └── geofence-monitor.ts   # Geofence entry/exit detection
│
└── shared/
    └── schema.ts             # DB schema, Zod schemas, types
```

## Known Neon Driver Quirks

The `@neondatabase/serverless` v0.10.4 HTTP driver has two bugs:
1. **Empty result sets:** Parameterized queries that return 0 rows throw `Cannot read properties of null (reading 'map')`. Workaround: fetch all and filter in-memory for lookups that may return nothing.
2. **Null in params array (function-call form):** Passing `null` in the params array `sql('query', [null])` sends `''` (empty string) to PostgreSQL, causing numeric type errors. Workaround: use template literal form `sql\`...\`` and omit columns with null values from the INSERT.

## Running the App

The `Start application` workflow runs `npm run dev` which starts both the Express backend (port 5000) and the Vite dev server proxied through it.
