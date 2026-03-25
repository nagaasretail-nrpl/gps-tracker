export type BroadcastLocation = {
  id: string;
  vehicleId: string;
  latitude: string;
  longitude: string;
  speed: string | null;
  heading: string | null;
  altitude: string | null;
  accuracy: string | null;
  satellites: number | null;
  isStationary: boolean | null;
  accuracyScore: number | null;
  timestamp: Date;
  [key: string]: unknown;
};

type LocationFn = (location: BroadcastLocation) => void;
type VehicleFn  = (vehicle: any) => void;

let broadcastFn: LocationFn = () => {};
let vehicleFn: VehicleFn    = () => {};

export function setLocationBroadcaster(fn: LocationFn) {
  broadcastFn = fn;
}

export function setVehicleBroadcaster(fn: VehicleFn) {
  vehicleFn = fn;
}

export function broadcastLocationUpdate(location: BroadcastLocation) {
  broadcastFn(location);
}

export function broadcastVehicleUpdate(vehicle: any) {
  vehicleFn(vehicle);
}
