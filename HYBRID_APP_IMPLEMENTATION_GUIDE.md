# Hybrid GPS Tracking App - Implementation Guide

## Overview

This guide provides a complete roadmap for transforming the GPS tracking app into a **hybrid personal activity tracker + fleet management system** with GeoTracker-inspired design.

## What's Been Completed ✅

### Backend (Fully Implemented in Replit)

1. **Database Schema** (`shared/schema.ts`)
   - ✅ `users` table for personal profiles
   - ✅ `activities` table with comprehensive statistics:
     - Distance, duration, speed metrics
     - Elevation gain/loss, altitude min/max
     - Slope percentages (avg, min, max)
     - Moving time vs total time
     - Track coordinates stored as JSONB
     - Recording state (`isRecording` boolean)
   - ✅ Updated `locations` table to support both vehicles AND activities
   - ✅ Validation: locations must belong to either vehicle or activity

2. **Storage Interface** (`server/storage.ts`)
   - ✅ User CRUD operations
   - ✅ Activity CRUD operations
   - ✅ `getCurrentActivity()` - gets currently recording activity
   - ✅ `getActivityLocationHistory()` - retrieves track for playback
   - ✅ Location validation (must have vehicle OR activity ID)
   - ✅ Deterministic ordering for current activity selection

3. **Design System** (`DESIGN_SYSTEM.md`)
   - ✅ Complete GeoTracker-inspired color palette
   - ✅ Typography system (font sizes, weights)
   - ✅ Component styling guidelines
   - ✅ Spacing system (4dp base unit)
   - ✅ Dark mode colors
   - ✅ React Native Paper theme configuration

## What Needs To Be Built 🚧

### Backend API Routes

Add these routes to `server/routes.ts`:

```javascript
// Users
app.get("/api/users", async (req, res) => {
  const users = await storage.getUsers();
  res.json(users);
});

app.get("/api/users/:id", async (req, res) => {
  const user = await storage.getUser(req.params.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

app.post("/api/users", async (req, res) => {
  const validatedData = insertUserSchema.parse(req.body);
  const user = await storage.createUser(validatedData);
  res.status(201).json(user);
});

app.patch("/api/users/:id", async (req, res) => {
  const user = await storage.updateUser(req.params.id, req.body);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json(user);
});

// Activities
app.get("/api/activities", async (req, res) => {
  const { userId, startDate, endDate } = req.query;
  const activities = await storage.getActivities(
    userId as string,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );
  res.json(activities);
});

app.get("/api/activities/:id", async (req, res) => {
  const activity = await storage.getActivity(req.params.id);
  if (!activity) return res.status(404).json({ error: "Activity not found" });
  res.json(activity);
});

app.get("/api/activities/current", async (req, res) => {
  const { userId } = req.query;
  const activity = await storage.getCurrentActivity(userId as string);
  res.json(activity || null);
});

app.post("/api/activities", async (req, res) => {
  const validatedData = insertActivitySchema.parse(req.body);
  const activity = await storage.createActivity(validatedData);
  res.status(201).json(activity);
});

app.patch("/api/activities/:id", async (req, res) => {
  const activity = await storage.updateActivity(req.params.id, req.body);
  if (!activity) return res.status(404).json({ error: "Activity not found" });
  res.json(activity);
});

app.delete("/api/activities/:id", async (req, res) => {
  const deleted = await storage.deleteActivity(req.params.id);
  if (!deleted) return res.status(404).json({ error: "Activity not found" });
  res.status(204).send();
});

app.get("/api/activities/:id/locations", async (req, res) => {
  const locations = await storage.getActivityLocationHistory(req.params.id);
  res.json(locations);
});

// Update existing locations route
app.post("/api/locations", async (req, res) => {
  try {
    const validatedData = insertLocationSchema.parse(req.body);
    const location = await storage.createLocation(validatedData);
    
    // Update vehicle status if it's a vehicle location
    if (validatedData.vehicleId) {
      const speed = parseFloat(validatedData.speed || "0");
      const status = speed > 5 ? "active" : speed === 0 ? "stopped" : "active";
      await storage.updateVehicle(validatedData.vehicleId, { status });
      
      // Check geofences for vehicles
      checkGeofences(location).catch(err => console.error("Geofence check error:", err));
      checkSpeedViolation(location).catch(err => console.error("Speed check error:", err));
    }
    
    res.status(201).json(location);
  } catch (error) {
    if (error.message && error.message.includes("must be associated")) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Failed to create location" });
    }
  }
});
```

### React Native App Structure

#### New Navigation (Bottom Tabs)

```
┌────────────────────────────────────┐
│ App.tsx (Main Container)           │
├────────────────────────────────────┤
│                                     │
│  Bottom Tab Navigator               │
│  ┌──────┬───────┬────────┬──────┐  │
│  │ Track│  Map  │ Fleet  │ More │  │
│  └──────┴───────┴────────┴──────┘  │
│                                     │
└────────────────────────────────────┘
```

**Tab 1: Track** (Personal Activity Tracking)
- `TrackingScreen.tsx` - Start/stop recording, live stats
- `ActivityHistoryScreen.tsx` - List of past activities
- `ActivityDetailScreen.tsx` - Detailed stats + charts

**Tab 2: Map** (Live View)
- `LiveMapScreen.tsx` - Full-screen map with current track/vehicles

**Tab 3: Fleet** (Fleet Management)
- `FleetDashboardScreen.tsx` - Fleet overview
- `VehicleListScreen.tsx` - All vehicles with status
- `VehicleDetailScreen.tsx` - Individual vehicle tracking

**Tab 4: More** (Settings & Tools)
- `SettingsScreen.tsx` - App settings
- `ProfileScreen.tsx` - User profile
- `GeofencesScreen.tsx` - Geofence management
- `POIsScreen.tsx` - Points of interest

#### File Structure

```
src/
├── screens/
│   ├── personal/          # Personal tracking screens
│   │   ├── TrackingScreen.tsx
│   │   ├── ActivityHistoryScreen.tsx
│   │   └── ActivityDetailScreen.tsx
│   ├── fleet/             # Fleet management screens
│   │   ├── FleetDashboardScreen.tsx
│   │   ├── VehicleListScreen.tsx
│   │   └── VehicleDetailScreen.tsx
│   ├── shared/            # Shared screens
│   │   ├── LiveMapScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── ProfileScreen.tsx
│   └── tools/             # Tools screens
│       ├── GeofencesScreen.tsx
│       └── POIsScreen.tsx
├── components/
│   ├── ActivityCard.tsx    # Card for activity list
│   ├── StatCard.tsx        # Statistics display
│   ├── VehicleMarker.tsx   # Map marker for vehicles
│   ├── TrackPolyline.tsx   # Activity track on map
│   └── FABButton.tsx       # Floating action button
├── services/
│   ├── api.ts              # Backend API client (updated)
│   ├── location.ts         # Location tracking service
│   └── storage.ts          # Local storage (AsyncStorage)
├── hooks/
│   ├── useLocation.ts      # Location permission & tracking
│   ├── useActivity.ts      # Activity recording logic
│   └── useStatistics.ts    # Calculate stats from locations
├── utils/
│   ├── calculations.ts     # Distance, speed, elevation calcs
│   ├── gpx.ts             # GPX export functionality
│   └── formatters.ts      # Format numbers, times, etc.
└── theme/
    └── theme.ts           # React Native Paper theme
```

### Key Screen Implementations

#### 1. TrackingScreen.tsx (Main Personal Tracking)

```typescript
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { FAB, Card, Text } from 'react-native-paper';
import MapView, { Polyline, Marker } from 'react-native-maps';
import { useLocation } from '../hooks/useLocation';
import { useActivity } from '../hooks/useActivity';

export default function TrackingScreen() {
  const { location, startTracking, stopTracking } = useLocation();
  const { currentActivity, startActivity, stopActivity, updateStats } = useActivity();
  const [isRecording, setIsRecording] = useState(false);

  const handleStartStop = async () => {
    if (isRecording) {
      await stopActivity();
      await stopTracking();
      setIsRecording(false);
    } else {
      await startActivity({
        name: `Activity ${new Date().toLocaleDateString()}`,
        type: 'walking',
        startTime: new Date(),
      });
      await startTracking();
      setIsRecording(true);
    }
  };

  return (
    <View style={styles.container}>
      {/* Full-screen map */}
      <MapView style={styles.map} region={...}>
        {currentActivity?.coordinates && (
          <Polyline
            coordinates={currentActivity.coordinates}
            strokeColor="#FF6B35"
            strokeWidth={4}
          />
        )}
        {location && (
          <Marker coordinate={location} />
        )}
      </MapView>

      {/* Floating stats overlay */}
      {isRecording && (
        <Card style={styles.statsCard}>
          <Text variant="headlineLarge">{formatDistance(currentActivity.distance)}</Text>
          <Text variant="bodyMedium">Distance</Text>
          
          <View style={styles.statsRow}>
            <StatItem label="Duration" value={formatDuration(currentActivity.duration)} />
            <StatItem label="Speed" value={formatSpeed(currentActivity.avgSpeed)} />
            <StatItem label="Elevation" value={formatElevation(currentActivity.elevationGain)} />
          </View>
        </Card>
      )}

      {/* Start/Stop FAB */}
      <FAB
        icon={isRecording ? 'stop' : 'play'}
        style={[styles.fab, isRecording && styles.fabRecording]}
        onPress={handleStartStop}
        color="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  statsCard: {
    position: 'absolute',
    top: 20,
    left: 16,
    right: 16,
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    alignSelf: 'center',
    backgroundColor: '#FF6B35',
    width: 64,
    height: 64,
  },
  fabRecording: {
    backgroundColor: '#F44336',
  },
});
```

#### 2. ActivityHistoryScreen.tsx

```typescript
import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Card, Text, Chip } from 'react-native-paper';
import { useQuery } from '@tanstack/react-query';

export default function ActivityHistoryScreen() {
  const { data: activities } = useQuery({
    queryKey: ['/api/activities'],
  });

  return (
    <FlatList
      data={activities}
      renderItem={({ item }) => (
        <Card style={styles.card} onPress={() => navigateToDetail(item.id)}>
          <Card.Content>
            <View style={styles.header}>
              <Chip icon={getActivityIcon(item.type)} mode="outlined">
                {item.type}
              </Chip>
              <Text variant="bodySmall">{formatRelativeTime(item.startTime)}</Text>
            </View>
            
            <Text variant="titleLarge" style={styles.name}>
              {item.name}
            </Text>
            
            <View style={styles.stats}>
              <Text>{formatDistance(item.distance)}</Text>
              <Text> · </Text>
              <Text>{formatDuration(item.duration)}</Text>
              <Text> · </Text>
              <Text>↗ {formatElevation(item.elevationGain)}</Text>
            </View>
          </Card.Content>
        </Card>
      )}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16 },
  card: {
    marginBottom: 12,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: { marginBottom: 4 },
  stats: {
    flexDirection: 'row',
    color: '#757575',
  },
});
```

#### 3. useActivity.ts Hook

```typescript
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../services/api';

export function useActivity() {
  const queryClient = useQueryClient();
  const [trackPoints, setTrackPoints] = useState([]);

  // Get current recording activity
  const { data: currentActivity } = useQuery({
    queryKey: ['/api/activities/current'],
    refetchInterval: 5000, // Check every 5 seconds
  });

  // Create new activity
  const createMutation = useMutation({
    mutationFn: (data) => apiRequest('/api/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/activities']);
    },
  });

  // Update activity
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => apiRequest(`/api/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/activities']);
    },
  });

  const startActivity = async (activityData) => {
    const activity = await createMutation.mutateAsync({
      ...activityData,
      isRecording: true,
    });
    setTrackPoints([]);
    return activity;
  };

  const stopActivity = async () => {
    if (!currentActivity) return;

    // Calculate final statistics
    const stats = calculateStats(trackPoints);

    await updateMutation.mutateAsync({
      id: currentActivity.id,
      data: {
        endTime: new Date(),
        isRecording: false,
        ...stats,
        coordinates: trackPoints,
      },
    });
    
    setTrackPoints([]);
  };

  const addLocation = (location) => {
    setTrackPoints(prev => [...prev, location]);
    
    // Update activity with new stats every 10 points
    if (trackPoints.length % 10 === 0 && currentActivity) {
      const stats = calculateStats([...trackPoints, location]);
      updateMutation.mutate({
        id: currentActivity.id,
        data: stats,
      });
    }
  };

  return {
    currentActivity,
    trackPoints,
    startActivity,
    stopActivity,
    addLocation,
  };
}
```

### Calculation Utilities

Add to `src/utils/calculations.ts`:

```typescript
export function calculateDistance(points: Location[]): number {
  // Haversine formula for distance between GPS points
  let totalDistance = 0;
  for (let i = 1; i < points.length; i++) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(points[i].latitude - points[i-1].latitude);
    const dLon = toRad(points[i].longitude - points[i-1].longitude);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(points[i-1].latitude)) * Math.cos(toRad(points[i].latitude)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    totalDistance += R * c;
  }
  return totalDistance;
}

export function calculateElevationGain(points: Location[]): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = points[i].altitude - points[i-1].altitude;
    if (diff > 0) gain += diff;
  }
  return gain;
}

export function calculateSlope(points: Location[], index: number): number {
  if (index === 0 || !points[index].altitude) return 0;
  
  const elevationDiff = points[index].altitude - points[index-1].altitude;
  const distance = calculateDistance([points[index-1], points[index]]) * 1000; // meters
  
  return (elevationDiff / distance) * 100; // percentage
}

export function calculateStats(points: Location[]) {
  if (points.length === 0) return {};

  const distance = calculateDistance(points);
  const duration = (points[points.length-1].timestamp - points[0].timestamp) / 1000; // seconds
  const elevationGain = calculateElevationGain(points);
  const elevationLoss = calculateElevationLoss(points);
  
  const speeds = points.filter(p => p.speed > 0).map(p => p.speed);
  const maxSpeed = Math.max(...speeds);
  const avgSpeed = (distance / duration) * 3600; // km/h

  const altitudes = points.filter(p => p.altitude).map(p => p.altitude);
  const maxAltitude = Math.max(...altitudes);
  const minAltitude = Math.min(...altitudes);

  const slopes = points.map((_, i) => calculateSlope(points, i));
  const avgSlope = slopes.reduce((a, b) => a + b, 0) / slopes.length;
  const maxSlope = Math.max(...slopes);
  const minSlope = Math.min(...slopes);

  return {
    distance,
    duration,
    maxSpeed,
    avgSpeed,
    elevationGain,
    elevationLoss,
    maxAltitude,
    minAltitude,
    avgSlope,
    maxSlope,
    minSlope,
  };
}
```

### GPX Export

Add to `src/utils/gpx.ts`:

```typescript
export function generateGPX(activity: Activity, locations: Location[]): string {
  const points = locations.map(loc => `
    <trkpt lat="${loc.latitude}" lon="${loc.longitude}">
      ${loc.altitude ? `<ele>${loc.altitude}</ele>` : ''}
      <time>${new Date(loc.timestamp).toISOString()}</time>
    </trkpt>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="GPS Tracker">
  <metadata>
    <name>${activity.name}</name>
    <desc>${activity.description || ''}</desc>
    <time>${new Date(activity.startTime).toISOString()}</time>
  </metadata>
  <trk>
    <name>${activity.name}</name>
    <type>${activity.type}</type>
    <trkseg>
      ${points}
    </trkseg>
  </trk>
</gpx>`;
}

export async function exportActivity(activityId: string) {
  const activity = await fetch(`/api/activities/${activityId}`).then(r => r.json());
  const locations = await fetch(`/api/activities/${activityId}/locations`).then(r => r.json());
  
  const gpx = generateGPX(activity, locations);
  
  // Use react-native-fs or expo-file-system to save
  const path = `${RNFS.DocumentDirectoryPath}/${activity.name}.gpx`;
  await RNFS.writeFile(path, gpx, 'utf8');
  
  // Share the file
  await Share.open({
    url: `file://${path}`,
    type: 'application/gpx+xml',
  });
}
```

## Testing Strategy

1. **Backend Testing** (Can do in Replit)
   - Test all API endpoints with curl/Postman
   - Verify location validation (must have vehicle OR activity)
   - Test activity statistics calculations

2. **Mobile Testing** (Local development required)
   - Test on both iOS and Android simulators
   - Test with Expo Go on physical devices
   - Test location permissions
   - Test background tracking
   - Test offline functionality

## Deployment

### Backend (Replit)
1. Ensure `package.json` contains only backend dependencies
2. Deploy using Replit's deployment button
3. Backend will be available at: `https://your-repl.replit.app`

### Mobile App (Expo EAS)
1. Configure `app.json` with proper permissions
2. Build: `eas build --platform android/ios`
3. Submit: `eas submit --platform android/ios`
4. Publish to Play Store / App Store

## Next Steps

1. **Complete backend routes** - Add activity API routes to `server/routes.ts`
2. **Test backend** - Verify all endpoints work correctly
3. **Set up local mobile dev** - Install Expo, Android Studio/Xcode
4. **Implement screens** - Build out React Native screens following designs
5. **Add location tracking** - Implement background location with expo-location
6. **Test end-to-end** - Full workflow from recording to viewing activities
7. **Deploy** - Backend to Replit, mobile to app stores

## Resources

- Design System: `DESIGN_SYSTEM.md`
- React Native Setup: `REACT_NATIVE_SETUP.md`
- Backend Deployment: `DEPLOYMENT.md`
- Database Schema: `shared/schema.ts`
