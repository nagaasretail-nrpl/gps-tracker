import { storage } from "./storage";
import type { Geofence, Location } from "@shared/schema";
import { sendPushToUser, canSendPush, markPushSent } from "./push-notifications";

interface Point {
  lat: number;
  lng: number;
}

// Track which vehicles are currently inside which geofences
const vehicleGeofenceState = new Map<string, Set<string>>();

// Check if a point is inside a circular geofence
function isPointInCircle(point: Point, center: Point, radius: number): boolean {
  const R = 6371000; // Earth's radius in meters
  const dLat = (center.lat - point.lat) * Math.PI / 180;
  const dLon = (center.lng - point.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(point.lat * Math.PI / 180) * Math.cos(center.lat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance <= radius;
}

// Check if a point is inside a polygon using ray casting algorithm
function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;

    const intersect = ((yi > point.lat) !== (yj > point.lat))
      && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Check if a location is inside a geofence
function isInsideGeofence(location: Location, geofence: Geofence): boolean {
  const point = {
    lat: parseFloat(location.latitude),
    lng: parseFloat(location.longitude),
  };

  const coords = geofence.coordinates as any;

  if (geofence.type === 'circle' && coords.center && coords.radius) {
    const center = coords.center as { lat: number; lng: number };
    return isPointInCircle(point, center, coords.radius);
  } else if (geofence.type === 'polygon' && Array.isArray(coords)) {
    const polygon = coords as Point[];
    return isPointInPolygon(point, polygon);
  }

  return false;
}

// Type for event broadcast callback
type EventBroadcaster = (event: any) => void;
let eventBroadcaster: EventBroadcaster | null = null;

export function setEventBroadcaster(broadcaster: EventBroadcaster): void {
  eventBroadcaster = broadcaster;
}

// Check location against all geofences and generate events
export async function checkGeofences(location: Location): Promise<void> {
  const geofences = await storage.getGeofences();
  const vehicleId = location.vehicleId;

  // Get current state for this vehicle
  if (!vehicleGeofenceState.has(vehicleId)) {
    vehicleGeofenceState.set(vehicleId, new Set());
  }
  const currentState = vehicleGeofenceState.get(vehicleId)!;
  const newState = new Set<string>();

  // Check each active geofence
  for (const geofence of geofences.filter(g => g.active)) {
    const inside = isInsideGeofence(location, geofence);

    if (inside) {
      newState.add(geofence.id);

      // Generate entry event if not previously inside and alerts are enabled
      if (!currentState.has(geofence.id) && geofence.alertOnEntry) {
        const event = await storage.createEvent({
          vehicleId,
          type: 'geofence_entry',
          description: `Entered geofence: ${geofence.name}`,
          data: {
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
        console.log(`Vehicle ${vehicleId} entered geofence ${geofence.name}`);
        
        // Broadcast event to WebSocket clients
        if (eventBroadcaster) {
          eventBroadcaster(event);
        }

        // Send push notifications to users with geofence alerts enabled
        sendGeofencePush(vehicleId, geofence.name, "entered").catch(() => {});
      }
    } else {
      // Generate exit event if previously inside and alerts are enabled
      if (currentState.has(geofence.id) && geofence.alertOnExit) {
        const event = await storage.createEvent({
          vehicleId,
          type: 'geofence_exit',
          description: `Exited geofence: ${geofence.name}`,
          data: {
            geofenceId: geofence.id,
            geofenceName: geofence.name,
            latitude: location.latitude,
            longitude: location.longitude,
          },
        });
        console.log(`Vehicle ${vehicleId} exited geofence ${geofence.name}`);
        
        // Broadcast event to WebSocket clients
        if (eventBroadcaster) {
          eventBroadcaster(event);
        }

        // Send push notifications to users with geofence alerts enabled
        sendGeofencePush(vehicleId, geofence.name, "exited").catch(() => {});
      }
    }
  }

  // Update state for this vehicle
  vehicleGeofenceState.set(vehicleId, newState);
}

// Send geofence push notifications to all users with geofence alerts enabled
async function sendGeofencePush(vehicleId: string, geofenceName: string, action: "entered" | "exited"): Promise<void> {
  const allSubs = await storage.getAllPushSubscriptions();
  const userIds = [...new Set(allSubs.map(s => s.userId))];

  // Look up vehicle name
  const vehicle = await storage.getVehicle(vehicleId);
  const vehicleName = vehicle?.name ?? vehicleId;

  for (const userId of userIds) {
    // Enforce per-user vehicle access control — admins see all vehicles, non-admins only their allowed list
    const userRecord = await storage.getUserById(userId);
    if (!userRecord) continue;
    if (userRecord.role !== "admin") {
      const allowed = userRecord.allowedVehicleIds ?? [];
      if (allowed.length === 0 || !allowed.includes(vehicleId)) continue;
    }

    // Use persisted settings or synthesize defaults so first-time users get geofence alerts
    const settings = await storage.getUserAlertSettings(userId) ?? {
      geofenceAlertEnabled: true,
    };
    if (!settings.geofenceAlertEnabled) continue;

    const alertKey = `geofence:${vehicleId}:${geofenceName}:${action}`;
    if (canSendPush(userId, alertKey)) {
      await sendPushToUser(userId, {
        title: `Geofence Alert — ${vehicleName}`,
        body: `${vehicleName} ${action} geofence: ${geofenceName}`,
        url: "/tracking",
      });
      markPushSent(userId, alertKey);
    }
  }
}

// Check for speed limit violations
export async function checkSpeedViolation(location: Location): Promise<void> {
  if (!location.speed) return;

  const speed = parseFloat(location.speed);
  const SPEED_LIMIT = 120; // km/h - configurable threshold

  if (speed > SPEED_LIMIT) {
    const event = await storage.createEvent({
      vehicleId: location.vehicleId,
      type: 'speed_violation',
      description: `Speed violation: ${speed.toFixed(1)} km/h (limit: ${SPEED_LIMIT} km/h)`,
      severity: 'warning',
      data: {
        speed,
        limit: SPEED_LIMIT,
        latitude: location.latitude,
        longitude: location.longitude,
      },
    });
    console.log(`Vehicle ${location.vehicleId} exceeded speed limit: ${speed} km/h`);
    
    // Broadcast event to WebSocket clients
    if (eventBroadcaster) {
      eventBroadcaster(event);
    }
  }
}
