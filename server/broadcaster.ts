type LocationFn = (location: any) => void;
type VehicleFn  = (vehicle: any) => void;

let broadcastFn: LocationFn = () => {};
let vehicleFn: VehicleFn    = () => {};

export function setLocationBroadcaster(fn: LocationFn) {
  broadcastFn = fn;
}

export function setVehicleBroadcaster(fn: VehicleFn) {
  vehicleFn = fn;
}

export function broadcastLocationUpdate(location: any) {
  broadcastFn(location);
}

export function broadcastVehicleUpdate(vehicle: any) {
  vehicleFn(vehicle);
}
