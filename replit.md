# Hybrid GPS Tracking Application - Personal + Fleet Management

## Overview

This is a **hybrid GPS tracking system** that combines:
1. **Personal Activity Tracking** (GeoTracker-style) - Track your own hikes, runs, bike rides, and outdoor activities
2. **Fleet Management** - Track multiple vehicles for business purposes

Built as a React Native mobile app (Android/iOS) with an Express.js backend and PostgreSQL database. The design is inspired by GeoTracker's clean, modern, data-focused interface.

**⚠️ Important Note:** This project has been converted from a React web application to React Native. The React Native app cannot be compiled or run directly in Replit. You must move the project to a local development environment or use Expo's cloud services. See `REACT_NATIVE_SETUP.md` for detailed setup instructions.

## Architecture

### Mobile Frontend (React Native + Expo)
- **Framework:** React Native with Expo SDK
- **UI Library:** React Native Paper (Material Design)
- **Navigation:** React Navigation (Bottom Tabs + Stack Navigator)
- **State Management:** TanStack Query (React Query v5)
- **Maps:** React Native Maps
- **Real-time Updates:** WebSocket connection to backend

### Backend API (Express.js)
- **Server:** Express.js with TypeScript
- **Database:** PostgreSQL (Neon serverless)
- **ORM:** Drizzle ORM
- **Real-time:** WebSocket server for live location updates
- **APIs:** RESTful endpoints for all data operations

### Shared Types
- **Location:** `shared/schema.ts` - Shared TypeScript types between mobile and backend
- **Validation:** Zod schemas for runtime type validation

## Project Structure

```
/
├── App.tsx                   # Main React Native app entry point
├── app.json                  # Expo configuration (permissions, bundle IDs)
├── package-mobile.json       # React Native dependencies
├── REACT_NATIVE_SETUP.md     # Complete setup guide
│
├── src/                      # Mobile app source code
│   ├── screens/             # Screen components
│   │   ├── DashboardScreen.tsx    # Fleet overview with live map
│   │   ├── TrackingScreen.tsx     # Real-time vehicle tracking
│   │   ├── HistoryScreen.tsx      # Route playback
│   │   └── MoreScreen.tsx         # Settings and additional features
│   ├── services/            # Business logic
│   │   └── api.ts          # Backend API client
│   └── components/          # Reusable UI components (to be added)
│
├── server/                  # Express backend (unchanged from web app)
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # API endpoints
│   ├── storage.ts          # Database operations
│   ├── geofence-monitor.ts # Geofence detection logic
│   └── db.ts               # Database connection
│
├── shared/                  # Shared between mobile and backend
│   └── schema.ts           # Database schema and types
│
└── migrations/             # Database migrations
```

## Features

### Personal Activity Tracking (GeoTracker-Inspired)
- 🚧 **Live Recording** - Start/stop tracking with large FAB button
- 🚧 **Real-time Statistics** - Distance, duration, speed, elevation gain/loss
- 🚧 **Activity History** - List of all recorded activities with filtering
- 🚧 **Detailed Analytics** - Charts for speed, elevation, slope over time
- 🚧 **Activity Types** - Walking, running, cycling, hiking, driving
- 🚧 **GPX/KML Export** - Export tracks for use in other apps
- 🚧 **Offline Maps** - Cached map tiles for offline use
- 🚧 **Background Tracking** - Continue recording when app is backgrounded

### Fleet Management
- ✅ **Vehicle Management** - CRUD operations for fleet vehicles
- ✅ **Live Location Tracking** - Real-time GPS updates via WebSocket
- ✅ **Trip Tracking** - Comprehensive trip management with:
  - Last trip details (most recent trip highlighted)
  - Past trips list with full statistics
  - Date-wise filtering (7/30/90 days or custom range)
  - Vehicle-specific filtering
  - Summary statistics (total trips, distance, duration, avg speed)
- ✅ **Historical Playback** - Replay vehicle routes by date
- ✅ **Geofencing** - Create circular/polygon zones with entry/exit alerts
- ✅ **Event System** - Automatic alerts for geofence violations, speed limits
- 🚧 **Fleet Dashboard** - Overview of all vehicles with status
- 🚧 **Vehicle Detail View** - Individual vehicle tracking and history

### Shared Features
- 🚧 **Points of Interest** - Mark and save important locations
- 🚧 **Map Layers** - OSM street maps, satellite imagery, dark mode
- 🚧 **User Profiles** - Personal settings and preferences
- 🚧 **Statistics Dashboard** - Comprehensive analytics for both modes

## Backend Features (Fully Implemented)

- ✅ PostgreSQL database with Drizzle ORM
- ✅ RESTful API for all resources (vehicles, locations, geofences, POIs, routes, events, trips)
- ✅ WebSocket server for real-time location updates
- ✅ Geofence detection (point-in-circle and point-in-polygon algorithms)
- ✅ Automatic event generation (geofence entry/exit, speed violations)
- ✅ Event broadcasting via WebSocket
- ✅ Demo data seeding
- ✅ **Secure Authentication & Authorization:**
  - Passport.js with local strategy (email/password)
  - Bcrypt password hashing (10 salt rounds)
  - Session-based authentication with PostgreSQL storage
  - Role-based access control (user/admin)
  - Fresh privilege verification on every admin request
  - Protected API routes with requireAuth/requireAdmin middleware
  - Secure user signup, login, logout endpoints

## Development Workflow

### Running the Backend (in Replit or locally)

The Express backend can run in Replit or locally:

```bash
# Install dependencies
npm install

# Push database schema
npm run db:push

# Seed demo data
tsx server/seed.ts

# Start server
npm run dev
```

Backend runs on `http://localhost:5000`

### Running the Mobile App (Local environment required)

See `REACT_NATIVE_SETUP.md` for complete setup instructions.

Quick start:
```bash
# Install dependencies
npm install

# Start Expo development server
npm start

# Run on Android
npm run android

# Run on iOS (macOS only)
npm run ios
```

## Database Schema

### Tables

**Personal Tracking:**
- **users** - User profiles (id, name, email, avatar, preferences)
- **activities** - Recorded activities (id, userId, name, type, startTime, endTime, distance, duration, speed metrics, elevation metrics, slope metrics, coordinates, isRecording)

**Fleet Management:**
- **vehicles** - Fleet inventory (id, name, deviceId, type, status, iconColor, driverName, licensePlate)
- **trips** - Aggregated journey data (vehicleId, startTime, endTime, distance, duration, avgSpeed, maxSpeed)
- **geofences** - Virtual boundaries (name, type, coordinates, color, active, alertOnEntry, alertOnExit)
- **events** - System events (vehicleId, type, description, severity, data, timestamp)

**Shared:**
- **locations** - GPS coordinates (vehicleId OR activityId, latitude, longitude, speed, heading, altitude, accuracy, timestamp)
- **routes** - Saved paths (name, coordinates, color)
- **pois** - Points of interest (name, latitude, longitude, category, icon)

**Key Constraint:** Every location must belong to either a vehicle OR an activity (enforced in storage layer)

## API Endpoints

### Vehicles
- `GET /api/vehicles` - List all vehicles
- `GET /api/vehicles/:id` - Get vehicle details
- `POST /api/vehicles` - Create vehicle
- `PATCH /api/vehicles/:id` - Update vehicle
- `DELETE /api/vehicles/:id` - Delete vehicle

### Locations
- `GET /api/locations` - Get locations (with query filters)
- `GET /api/locations/latest` - Get latest location for each vehicle
- `POST /api/locations` - Create location update (triggers geofence checks)

### Geofences
- `GET /api/geofences` - List all geofences
- `POST /api/geofences` - Create geofence
- `PATCH /api/geofences/:id` - Update geofence
- `DELETE /api/geofences/:id` - Delete geofence

### Events
- `GET /api/events` - Get events (filterable by vehicle and date)
- Event types: `geofence_entry`, `geofence_exit`, `speed_violation`

### WebSocket
- `ws://localhost:5000/ws` - Real-time updates
- Message types: `location` (location updates), `event` (geofence/speed events)

## Key Technologies

### Mobile
- **React Native 0.73**
- **Expo SDK ~50.0**
- **React Navigation 6.x**
- **React Native Maps**
- **React Native Paper 5.x**
- **TanStack Query 5.x**
- **TypeScript 5.6**

### Backend
- **Express.js 4.x**
- **Drizzle ORM 0.39**
- **PostgreSQL (Neon)**
- **WebSocket (ws library)**
- **Zod validation**

## Mobile App Configuration

### Permissions

**Android** (`app.json`):
- `ACCESS_FINE_LOCATION` - GPS location
- `ACCESS_COARSE_LOCATION` - Network location
- `ACCESS_BACKGROUND_LOCATION` - Background tracking

**iOS** (`app.json`):
- Location permissions requested via expo-location plugin

### Build Configuration

- **Bundle ID (iOS):** `com.gpstracker.app`
- **Package Name (Android):** `com.gpstracker.app`
- **Expo SDK:** ~50.0
- **Minimum iOS:** 13.0
- **Minimum Android:** API 21 (Android 5.0)

## Environment Variables

Create `.env` file:
```env
# Mobile App
API_URL=http://192.168.1.100:5000/api
WS_URL=ws://192.168.1.100:5000/ws

# Backend
DATABASE_URL=postgresql://user:password@host:5432/database
SESSION_SECRET=your-session-secret
```

## Building for Production

### Using Expo Application Services (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

See `REACT_NATIVE_SETUP.md` for detailed build instructions.

## Migration Notes

### From Web to React Native

This project was converted from a React web application to React Native:

**What Changed:**
- Frontend completely rebuilt with React Native
- Vite + React → Expo + React Native
- Shadcn/ui + Tailwind → React Native Paper
- Leaflet.js → React Native Maps
- Wouter → React Navigation

**What Stayed the Same:**
- Express backend (API routes, WebSocket, business logic)
- Database schema and Drizzle ORM
- Shared types in `shared/schema.ts`
- Geofence detection algorithms

**Legacy Files (can be removed):**
- `client/` directory (old web frontend)
- `vite.config.ts`
- `tailwind.config.ts`
- Web-specific dependencies in old package.json

## Known Limitations

1. **Cannot run in Replit** - React Native requires native compilation tools (Android Studio, Xcode)
2. **Requires physical device or emulator** - Use Expo Go app or configured emulator
3. **Network configuration** - Mobile app must connect to backend via local IP, not localhost
4. **Development complexity** - Requires more setup than web development

## Next Steps

1. Complete remaining mobile screens (see task list)
2. Implement offline support
3. Add push notifications
4. Implement background location tracking
5. Add comprehensive testing
6. Deploy backend to production server
7. Publish apps to App Store and Play Store

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [React Navigation](https://reactnavigation.org/)
- [React Native Maps](https://github.com/react-native-maps/react-native-maps)
- [TanStack Query](https://tanstack.com/query/)
- [React Native Paper](https://reactnativepaper.com/)
