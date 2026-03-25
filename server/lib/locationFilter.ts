export type RawLocationInput = {
  imei: string;
  lat: number;
  lng: number;
  timestamp?: Date | string | number;
  speedKph?: number | null;
  heading?: number | null;
  satellites?: number | null;
  ignition?: boolean | null;
};

export type LastKnownLocation = {
  lat: number;
  lng: number;
  timestamp: Date;
  speedKph?: number | null;
  heading?: number | null;
  stationarySince?: Date | null;
};

export type FilterDecision =
  | {
      accepted: true;
      reason: "accepted";
      location: FilteredLocation;
    }
  | {
      accepted: false;
      reason:
        | "invalid_coords"
        | "out_of_bounds"
        | "duplicate"
        | "stale_packet"
        | "jump_guard"
        | "speed_spike"
        | "drift_while_stationary";
      details?: string;
    };

export type FilteredLocation = {
  lat: number;
  lng: number;
  timestamp: Date;
  speedKph: number | null;
  heading: number | null;
  isStationary: boolean;
  accuracyScore: number;
};

const INDIA_BOUNDS = {
  minLat: 5,
  maxLat: 37,
  minLng: 65,
  maxLng: 100,
};

const MAX_JUMP_KM = 500;
const MAX_SPEED_KPH = 160;
const STATIONARY_SPEED_KPH = 2;
const STATIONARY_DRIFT_METERS = 20;
const DUPLICATE_DISTANCE_METERS = 3;
const STALE_PACKET_SECONDS = 60 * 60 * 6;
const MIN_TIME_DELTA_SECONDS = 1;
const SOFT_SMOOTHING_ALPHA = 0.35;

class Kalman1D {
  private q: number;
  private r: number;
  private x: number;
  private p: number;
  private initialized = false;

  constructor(processNoise = 0.00001, measurementNoise = 0.0001) {
    this.q = processNoise;
    this.r = measurementNoise;
    this.x = 0;
    this.p = 1;
  }

  filter(z: number): number {
    if (!this.initialized) {
      this.x = z;
      this.initialized = true;
      return this.x;
    }
    this.p = this.p + this.q;
    const k = this.p / (this.p + this.r);
    this.x = this.x + k * (z - this.x);
    this.p = (1 - k) * this.p;
    return this.x;
  }

  setState(value: number) {
    this.x = value;
    this.initialized = true;
  }
}

type DeviceFilterState = {
  latKalman: Kalman1D;
  lngKalman: Kalman1D;
  lastAccepted?: FilteredLocation;
};

const deviceState = new Map<string, DeviceFilterState>();

function getDeviceState(imei: string): DeviceFilterState {
  let state = deviceState.get(imei);
  if (!state) {
    state = {
      latKalman: new Kalman1D(0.00001, 0.00015),
      lngKalman: new Kalman1D(0.00001, 0.00015),
    };
    deviceState.set(imei, state);
  }
  return state;
}

function toDate(value?: Date | string | number): Date {
  if (!value) return new Date();
  return value instanceof Date ? value : new Date(value);
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

function isValidLatLng(lat: number, lng: number): boolean {
  return (
    isFiniteNumber(lat) &&
    isFiniteNumber(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

function isWithinIndia(lat: number, lng: number): boolean {
  return (
    lat >= INDIA_BOUNDS.minLat &&
    lat <= INDIA_BOUNDS.maxLat &&
    lng >= INDIA_BOUNDS.minLng &&
    lng <= INDIA_BOUNDS.maxLng
  );
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeDerivedSpeedKph(
  prev: { lat: number; lng: number; timestamp: Date },
  next: { lat: number; lng: number; timestamp: Date }
): number {
  const meters = haversineMeters(prev.lat, prev.lng, next.lat, next.lng);
  const seconds = Math.max(
    (next.timestamp.getTime() - prev.timestamp.getTime()) / 1000,
    MIN_TIME_DELTA_SECONDS
  );
  return (meters / seconds) * 3.6;
}

function softSmooth(prev: number, next: number, alpha = SOFT_SMOOTHING_ALPHA) {
  return prev + (next - prev) * alpha;
}

function clampHeading(heading?: number | null): number | null {
  if (!isFiniteNumber(heading as number)) return null;
  let h = heading as number;
  while (h < 0) h += 360;
  while (h >= 360) h -= 360;
  return h;
}

function computeAccuracyScore(params: {
  rawDistanceMetersFromLast?: number;
  derivedSpeedKph?: number;
  satellites?: number | null;
  isStationary: boolean;
}): number {
  let score = 100;
  if ((params.satellites ?? 0) > 0) {
    if ((params.satellites ?? 0) < 4) score -= 25;
    else if ((params.satellites ?? 0) < 6) score -= 12;
  }
  if ((params.rawDistanceMetersFromLast ?? 0) > 1000) score -= 20;
  if ((params.derivedSpeedKph ?? 0) > 100) score -= 15;
  if (params.isStationary) score += 5;
  return Math.max(0, Math.min(100, score));
}

export function filterIncomingLocation(
  input: RawLocationInput,
  lastKnown?: LastKnownLocation | null
): FilterDecision {
  const timestamp = toDate(input.timestamp);

  if (!isValidLatLng(input.lat, input.lng)) {
    return { accepted: false, reason: "invalid_coords" };
  }

  if (!isWithinIndia(input.lat, input.lng)) {
    return {
      accepted: false,
      reason: "out_of_bounds",
      details: `Outside India bounds: ${input.lat}, ${input.lng}`,
    };
  }

  const state = getDeviceState(input.imei);
  const previous = lastKnown ?? state.lastAccepted;

  const ageSeconds = (Date.now() - timestamp.getTime()) / 1000;
  if (ageSeconds > STALE_PACKET_SECONDS) {
    return {
      accepted: false,
      reason: "stale_packet",
      details: `Packet is ${Math.round(ageSeconds)} seconds old`,
    };
  }

  if (previous) {
    const deltaMs = timestamp.getTime() - previous.timestamp.getTime();
    if (deltaMs < 0) {
      return {
        accepted: false,
        reason: "stale_packet",
        details: "Older than last accepted packet",
      };
    }

    const rawDistanceMeters = haversineMeters(
      previous.lat,
      previous.lng,
      input.lat,
      input.lng
    );

    if (rawDistanceMeters <= DUPLICATE_DISTANCE_METERS) {
      return {
        accepted: false,
        reason: "duplicate",
        details: `Only moved ${rawDistanceMeters.toFixed(2)}m`,
      };
    }

    if (rawDistanceMeters > MAX_JUMP_KM * 1000) {
      return {
        accepted: false,
        reason: "jump_guard",
        details: `Jumped ${(rawDistanceMeters / 1000).toFixed(2)} km`,
      };
    }

    const derivedSpeed = computeDerivedSpeedKph(
      { lat: previous.lat, lng: previous.lng, timestamp: previous.timestamp },
      { lat: input.lat, lng: input.lng, timestamp }
    );

    const reportedSpeed = input.speedKph ?? null;
    const effectiveSpeed = Math.max(reportedSpeed ?? 0, derivedSpeed);

    if (effectiveSpeed > MAX_SPEED_KPH) {
      return {
        accepted: false,
        reason: "speed_spike",
        details: `Effective speed too high: ${effectiveSpeed.toFixed(2)} km/h`,
      };
    }

    const stationary =
      (reportedSpeed ?? derivedSpeed) <= STATIONARY_SPEED_KPH &&
      rawDistanceMeters <= STATIONARY_DRIFT_METERS;

    if (stationary) {
      return {
        accepted: false,
        reason: "drift_while_stationary",
        details: `Stationary drift: ${rawDistanceMeters.toFixed(2)}m`,
      };
    }
  }

  let filteredLat = input.lat;
  let filteredLng = input.lng;

  if (previous && !state.lastAccepted) {
    state.latKalman.setState(previous.lat);
    state.lngKalman.setState(previous.lng);
  }

  filteredLat = state.latKalman.filter(filteredLat);
  filteredLng = state.lngKalman.filter(filteredLng);

  if (previous) {
    filteredLat = softSmooth(previous.lat, filteredLat);
    filteredLng = softSmooth(previous.lng, filteredLng);
  }

  const finalDerivedSpeed = previous
    ? computeDerivedSpeedKph(
        { lat: previous.lat, lng: previous.lng, timestamp: previous.timestamp },
        { lat: filteredLat, lng: filteredLng, timestamp }
      )
    : input.speedKph ?? 0;

  const isStationary = finalDerivedSpeed <= STATIONARY_SPEED_KPH;

  const accepted: FilteredLocation = {
    lat: filteredLat,
    lng: filteredLng,
    timestamp,
    speedKph: input.speedKph ?? Math.round(finalDerivedSpeed * 100) / 100,
    heading: clampHeading(input.heading),
    isStationary,
    accuracyScore: computeAccuracyScore({
      rawDistanceMetersFromLast: previous
        ? haversineMeters(previous.lat, previous.lng, input.lat, input.lng)
        : 0,
      derivedSpeedKph: finalDerivedSpeed,
      satellites: input.satellites,
      isStationary,
    }),
  };

  state.lastAccepted = accepted;

  return {
    accepted: true,
    reason: "accepted",
    location: accepted,
  };
}
