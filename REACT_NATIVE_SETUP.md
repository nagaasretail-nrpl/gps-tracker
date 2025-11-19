# GPS Tracker - React Native Mobile App Setup Guide

This guide will help you convert the GPS tracking application from a web app to React Native mobile apps for Android and iOS.

## Prerequisites

Before you begin, ensure you have the following installed:

### For Development:
- Node.js (v18 or later)
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### For Testing:
- Expo Go app on your mobile device (available on App Store and Play Store)
- OR Android/iOS emulator

## Project Structure

```
gps-tracker/
├── App.tsx                 # Main app entry point
├── app.json               # Expo configuration
├── package-mobile.json    # React Native dependencies
├── src/
│   ├── screens/          # All screen components
│   │   ├── DashboardScreen.tsx
│   │   ├── TrackingScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── MoreScreen.tsx
│   ├── services/         # API and business logic
│   │   └── api.ts       # Backend API client
│   └── components/       # Reusable components (to be added)
├── server/               # Express backend (unchanged)
│   ├── index.ts
│   ├── routes.ts
│   ├── storage.ts
│   └── geofence-monitor.ts
└── shared/              # Shared types and schemas
    └── schema.ts
```

## Setup Instructions

### Step 1: Move Project to Local Environment

Since React Native requires native compilation tools not available in Replit, you'll need to move the project to your local machine or use Expo's cloud services.

1. Download the entire project from Replit
2. Extract to a local directory
3. Open terminal in the project directory

### Step 2: Install Dependencies

```bash
# Rename the mobile package.json
mv package-mobile.json package.json

# Install dependencies
npm install

# Install Expo CLI globally if not already installed
npm install -g expo-cli
```

### Step 3: Configure Backend API URL

Update the API base URL in `src/services/api.ts`:

```typescript
const API_BASE_URL = __DEV__ 
  ? 'http://YOUR_LOCAL_IP:5000/api'  // Use your computer's local IP (e.g., 192.168.1.100)
  ? 'https://your-production-api.com/api';
```

**Important:** For mobile development, you CANNOT use `localhost` because the mobile device/emulator runs in a separate network context. Use your computer's local IP address instead.

### Step 4: Update Backend CORS Configuration

In `server/index.ts`, ensure CORS is configured to accept mobile requests:

```typescript
import cors from 'cors';

app.use(cors({
  origin: '*', // In production, specify your mobile app's domain
  credentials: true,
}));
```

### Step 5: Start the Backend Server

In a separate terminal:

```bash
# Ensure DATABASE_URL is set
export DATABASE_URL="your-postgres-connection-string"

# Start the backend
npm run server
```

The backend will run on `http://localhost:5000`

### Step 6: Start Expo Development Server

```bash
npm start
```

This will:
- Start the Expo development server
- Display a QR code
- Open Expo Dev Tools in your browser

### Step 7: Run on Device or Emulator

#### Option A: Physical Device (Easiest)
1. Install "Expo Go" app from App Store (iOS) or Play Store (Android)
2. Scan the QR code from Step 6
3. The app will load on your device

#### Option B: Android Emulator
```bash
npm run android
```

Requirements:
- Android Studio installed
- Android emulator configured and running

#### Option C: iOS Simulator (macOS only)
```bash
npm run ios
```

Requirements:
- Xcode installed
- iOS Simulator configured

## Configuration

### App Configuration (`app.json`)

The `app.json` file contains important configurations:

```json
{
  "expo": {
    "name": "GPS Tracker",
    "slug": "gps-tracker",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.gpstracker.app"
    },
    "android": {
      "package": "com.gpstracker.app",
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION"
      ]
    }
  }
}
```

### Location Permissions

The app requires location permissions. Users will be prompted when first accessing location features.

**iOS:** Permissions are automatically requested based on `expo-location` plugin configuration.

**Android:** Permissions are declared in `app.json` and requested at runtime.

## Building for Production

### Using Expo Application Services (EAS)

1. Install EAS CLI:
```bash
npm install -g eas-cli
```

2. Login to Expo:
```bash
eas login
```

3. Configure build:
```bash
eas build:configure
```

4. Build for Android:
```bash
eas build --platform android
```

5. Build for iOS:
```bash
eas build --platform ios
```

### Standalone Builds

For standalone APK/IPA files without Expo services:

```bash
# Android APK
eas build --platform android --profile production

# iOS IPA (requires Apple Developer account)
eas build --platform ios --profile production
```

## Environment Variables

Create a `.env` file in the project root:

```env
# Backend API
API_URL=http://192.168.1.100:5000/api
WS_URL=ws://192.168.1.100:5000/ws

# Database (for backend server)
DATABASE_URL=postgresql://user:password@host:5432/database

# Push Notifications (Expo)
EXPO_PROJECT_ID=your-expo-project-id
```

## Features Implemented

### ✅ Current Features
- Dashboard with fleet statistics and live map
- Real-time vehicle tracking with 10-second updates
- Historical route playback with date range selection
- Vehicle list with search and filtering
- Settings and preferences

### 🚧 Coming Soon
- Geofence management (create, edit, delete)
- POI management
- Trip reports and analytics
- Push notifications for geofence events
- Offline support with data caching
- Background location tracking

## Troubleshooting

### "Cannot connect to backend"
- Ensure backend server is running on the correct port
- Use your computer's local IP address, not `localhost`
- Check firewall settings
- Verify CORS configuration in backend

### "Location services not available"
- Check that location permissions are granted
- Ensure device has GPS enabled
- For iOS simulator, set a custom location in Features > Location

### "Map not showing"
- Ensure `react-native-maps` is properly installed
- For Android, verify Google Maps API key is configured
- Check internet connection for map tiles

### Build Errors
```bash
# Clear cache and rebuild
expo start -c

# Or
rm -rf node_modules
npm install
```

## API Documentation

The mobile app communicates with the Express backend API:

### Endpoints Used

```
GET  /api/vehicles           - List all vehicles
GET  /api/vehicles/:id       - Get vehicle details
POST /api/vehicles           - Create new vehicle
GET  /api/locations/latest   - Get latest location for all vehicles
GET  /api/locations          - Get location history (with query params)
GET  /api/geofences          - List all geofences
GET  /api/events             - Get events (geofence entries, exits, alerts)
GET  /api/trips              - Get trip data
```

### WebSocket Connection

Real-time updates are received via WebSocket:

```
ws://YOUR_API_URL:5000/ws
```

Message format:
```json
{
  "type": "location",
  "data": {
    "id": "location-id",
    "vehicleId": "vehicle-id",
    "latitude": "40.7580",
    "longitude": "-73.9855",
    "speed": "45.5",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

## Next Steps

1. **Complete remaining screens:**
   - Geofence management
   - POI management
   - Reports and analytics
   - Vehicle management

2. **Add offline support:**
   - Implement AsyncStorage caching
   - Queue location updates when offline
   - Sync when connection restored

3. **Push notifications:**
   - Configure Expo push notifications
   - Implement notification handlers
   - Add notification preferences

4. **Background location tracking:**
   - Implement background tasks
   - Handle location updates when app is backgrounded
   - Optimize battery usage

5. **Testing:**
   - Test on physical Android devices
   - Test on physical iOS devices
   - Test offline scenarios
   - Test background location tracking

## Support

For issues or questions:
- Check Expo documentation: https://docs.expo.dev/
- React Native Maps: https://github.com/react-native-maps/react-native-maps
- React Navigation: https://reactnavigation.org/

## License

MIT
