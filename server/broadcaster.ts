type LocationFn = (location: any) => void;

let broadcastFn: LocationFn = () => {};

export function setLocationBroadcaster(fn: LocationFn) {
  broadcastFn = fn;
}

export function broadcastLocationUpdate(location: any) {
  broadcastFn(location);
}
