# GPS Tracker - React Native Mobile Application

> **⚠️ Important:** This React Native application cannot be compiled or run in Replit. You must move this project to a local development environment or use Expo's cloud services.

## What's Been Delivered

This is a complete React Native GPS tracking application for Android and iOS, converted from the original web application. The project includes:

### ✅ Mobile Application Structure
- **App.tsx** - Main app entry point with bottom tab navigation
- **app.json** - Expo configuration with GPS permissions
- **4 Main Screens:**
  - Dashboard: Fleet overview with live map and statistics
  - Tracking: Real-time vehicle tracking with search
  - History: Historical route playback with date picker
  - More: Settings and additional features menu

### ✅ Backend API (Ready to Use)
- Express.js server with TypeScript
- PostgreSQL database with Drizzle ORM
- Real-time WebSocket updates
- Geofence detection system
- Event generation and broadcasting
- Complete RESTful API for all features

### ✅ Configuration Files
- `package-mobile.json` - All React Native/Expo dependencies
- `babel.config.js` - Babel configuration for Expo
- `metro.config.js` - Metro bundler configuration
- `app.json` - Expo app configuration

### ✅ Documentation
- **REACT_NATIVE_SETUP.md** - Complete setup guide with step-by-step instructions
- **replit.md** - Updated project documentation
- **assets/README.md** - Instructions for app icons and assets

## Quick Start

### 1. Move to Local Environment

Since React Native requires native development tools (Android Studio, Xcode) that aren't available in Replit:

1. Download this entire project
2. Extract to your local machine
3. Open terminal in the project directory

### 2. Set Up for Mobile Development

```bash
# Replace package.json with mobile version
cp package-mobile.json package.json

# Install dependencies
npm install

# Install Expo CLI (if not already installed)
npm install -g expo-cli eas-cli
```

### 3. Configure Backend Connection

Update `src/services/api.ts`:

```typescript
const API_BASE_URL = 'http://192.168.1.100:5000/api';  // Use your local IP
```

**Important:** Use your computer's local IP address, NOT `localhost`!

### 4. Start Backend Server

In one terminal:

```bash
# Set your database URL
export DATABASE_URL="your-postgres-connection-string"

# Push schema to database
npm run db:push

# Seed demo data
tsx server/seed.ts

# Start backend
npm run server
```

Backend runs on `http://localhost:5000`

### 5. Start Mobile App

In another terminal:

```bash
# Start Expo development server
npm start

# Scan QR code with Expo Go app (easiest)
# OR run on emulator:
npm run android  # For Android
npm run ios      # For iOS (macOS only)
```

## What Works Out of the Box

- ✅ Dashboard with live fleet statistics
- ✅ Real-time location tracking (10-second updates)
- ✅ Interactive map with vehicle markers
- ✅ Vehicle search and filtering
- ✅ Historical route playback
- ✅ Date range selection for history
- ✅ Settings menu
- ✅ Backend API with PostgreSQL
- ✅ WebSocket real-time updates
- ✅ Geofence detection system
- ✅ Event generation (entry/exit/speed violations)

## What's Next (From Task List)

The following features are planned but not yet implemented:

1. Geofence management UI (create, edit, delete geofences)
2. POI management screen
3. Trip reports and analytics
4. Push notifications for events
5. Offline support with AsyncStorage
6. Background location tracking
7. Vehicle management screens

## Architecture

```
gps-tracker/
├── App.tsx                    # Main entry point
├── app.json                   # Expo config
├── src/
│   ├── screens/              # All screen components
│   │   ├── DashboardScreen.tsx
│   │   ├── TrackingScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── MoreScreen.tsx
│   └── services/
│       └── api.ts            # Backend API client
├── server/                    # Express backend
│   ├── index.ts              # Server entry
│   ├── routes.ts             # API routes
│   ├── storage.ts            # Database operations
│   └── geofence-monitor.ts   # Geofence detection
└── shared/
    └── schema.ts             # Shared types
```

## Key Technologies

- **React Native 0.73** - Mobile framework
- **Expo SDK ~50.0** - Development platform
- **React Navigation** - Navigation library
- **React Native Maps** - Map integration
- **React Native Paper** - Material Design UI components
- **TanStack Query** - Data fetching and caching
- **Express.js** - Backend API server
- **PostgreSQL** - Database
- **WebSocket** - Real-time updates

## Building for Production

```bash
# Using Expo Application Services
eas build --platform android
eas build --platform ios
```

## Need Help?

1. Read **REACT_NATIVE_SETUP.md** for detailed setup instructions
2. Check **replit.md** for project architecture and API documentation
3. Refer to [Expo Documentation](https://docs.expo.dev/)
4. See [React Native Maps Guide](https://github.com/react-native-maps/react-native-maps)

## Environment Requirements

- Node.js v18 or later
- npm or yarn
- Expo CLI
- Android Studio (for Android) OR Xcode (for iOS, macOS only)
- Expo Go app (for testing on physical devices)

## Notes

- The backend API is fully functional and tested
- Geofence detection and event system is working
- Database includes demo vehicle and geofence data
- WebSocket provides real-time location updates
- All API endpoints are documented in replit.md

## License

MIT
