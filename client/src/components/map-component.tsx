import { useEffect, useRef, useState, useCallback } from "react";
import type { Vehicle, Location, Geofence, Route as RouteType, Poi } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Locate, Layers, MapPinOff } from "lucide-react";
import { getMarkerSvg, getIconAnchor, getVehicleImg } from "@/lib/vehicleIcons";
import { isIndiaCoord } from "@/lib/gpsUtils";

// ── Types ──────────────────────────────────────────────────────────────────

interface RoutePolyline {
  vehicleId: string;
  coords: [number, number][];
  color?: string;
}

export interface ParkingEvent {
  vehicleId: string;
  startTime: string;
  endTime: string;
  durationMin: number;
  lat: number;
  lng: number;
  address: string | null;
  pointCount: number;
}

interface MapComponentProps {
  vehicles?: Vehicle[];
  locations?: Location[];
  geofences?: Geofence[];
  routes?: RouteType[];
  pois?: Poi[];
  center?: [number, number];
  zoom?: number;
  onVehicleClick?: (vehicleId: string) => void;
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
  routePolylines?: RoutePolyline[];
  bearingData?: Record<string, [number, number][]>;
  focusVehicleId?: string | null;
  connectedImeis?: Set<string>; // set of device IMEIs with live TCP connections
  parkingEvents?: ParkingEvent[];
}

// Augment Window to include the optional google namespace and dynamic callbacks.
declare global {
  interface Window {
    google?: typeof google;
    [key: string]: unknown;
  }
}

// Typed union of all overlay objects we push / clear.
type MapOverlay =
  | google.maps.Marker
  | google.maps.Polyline
  | google.maps.Polygon
  | google.maps.InfoWindow;

// ── Helpers ────────────────────────────────────────────────────────────────

/** Format a parking duration from a Date into "Xh Ym" or "Ym" string */
function formatParkingDuration(parkedSince: Date | string | null | undefined): string {
  if (!parkedSince) return "";
  const ms = Date.now() - new Date(parkedSince).getTime();
  if (ms < 0) return "";
  const totalMinutes = Math.floor(ms / 60000);
  if (totalMinutes < 1) return "< 1m";
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/** Escape HTML for InfoWindow content */
function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape text for embedding inside SVG attributes/content */
function escSvg(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function computeBearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/** Render signal bars as inline SVG HTML for use inside InfoWindow */
function signalBarsHtml(level: number, color: string, offColor = "#d1d5db"): string {
  const bars = [1, 2, 3, 4];
  const svgBars = bars.map((b) => {
    const h = b * 5;
    const y = 20 - h;
    const fill = b <= level ? color : offColor;
    return `<rect x="${(b - 1) * 6}" y="${y}" width="4" height="${h}" rx="1" fill="${fill}"/>`;
  }).join("");
  return `<svg width="28" height="20" viewBox="0 0 24 20" style="display:inline-block;vertical-align:middle;">${svgBars}</svg>`;
}

/** Convert satellite count to 0-4 signal bars */
function satsToLevel(sats: number | null | undefined): number {
  const n = sats ?? 0;
  if (n >= 10) return 4;
  if (n >= 8) return 3;
  if (n >= 6) return 2;
  if (n >= 4) return 1;
  return 0;
}

/** Build styled HTML for the vehicle InfoWindow popup */
function buildVehicleInfoHtml(
  vehicle: Vehicle,
  location: Location,
  speed: number,
  lat: number,
  lng: number,
  heading: number,
  isConnected: boolean
): string {
  const headerColor = vehicle.iconColor ?? "#e4006e";
  const ts = new Date(location.timestamp);
  const timeStr = ts.toLocaleString();
  const address = String(location.address ?? "").trim();
  const isStopped = speed <= 3;
  const parkingDuration = isStopped ? formatParkingDuration(vehicle.parkedSince) : "";
  const parkedSinceStr = isStopped && vehicle.parkedSince
    ? new Date(vehicle.parkedSince).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const parkingRow = parkingDuration
    ? `<div style="background:#fff8e1;border-radius:4px;padding:6px 8px;margin-top:4px;display:flex;align-items:flex-start;gap:6px;">
        <span style="background:#f59e0b;color:#fff;font-size:10px;font-weight:700;padding:1px 5px;border-radius:3px;margin-top:1px;flex-shrink:0;">P</span>
        <div>
          <div style="font-weight:600;color:#92400e;">Parked since: ${esc(parkedSinceStr)}</div>
          <div style="font-size:11px;color:#b45309;">${esc(parkingDuration)}</div>
        </div>
       </div>`
    : "";
  const sats = typeof location.satellites === "number" ? location.satellites : null;
  const gpsBars = signalBarsHtml(satsToLevel(sats), "#22c55e");
  const gprsBars = signalBarsHtml(isConnected ? 4 : 0, "#3b82f6");
  const altStr = location.altitude ? `${parseFloat(String(location.altitude)).toFixed(0)} m` : "—";
  return `
    <div style="min-width:240px;max-width:300px;font-family:sans-serif;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.18);">
      <div style="background:${headerColor};color:#fff;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(vehicle.name)}</span>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
          <span style="display:flex;flex-direction:column;align-items:center;gap:1px;">
            ${gpsBars}
            <span style="font-size:9px;opacity:0.85;">GPS</span>
          </span>
          <span style="display:flex;flex-direction:column;align-items:center;gap:1px;">
            ${gprsBars}
            <span style="font-size:9px;opacity:0.85;">GPRS</span>
          </span>
        </div>
      </div>
      <div style="background:#fff;padding:10px 14px;font-size:12px;line-height:1.75;color:#222;">
        ${address ? `<div><b style="color:#666;min-width:85px;display:inline-block;">Address:</b> ${esc(address)}</div>` : ""}
        <div><b style="color:#666;min-width:85px;display:inline-block;">Position:</b> <span style="color:#1a6bc7;font-family:monospace;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>
        <div><b style="color:#666;min-width:85px;display:inline-block;">Altitude:</b> ${altStr}</div>
        <div><b style="color:#666;min-width:85px;display:inline-block;">Speed:</b> ${speed.toFixed(0)} km/h</div>
        <div><b style="color:#666;min-width:85px;display:inline-block;">Heading:</b> ${heading.toFixed(0)}&deg;</div>
        <div><b style="color:#666;min-width:85px;display:inline-block;">Satellites:</b> ${sats !== null ? sats : "—"}</div>
        <div><b style="color:#666;min-width:85px;display:inline-block;">Status:</b> ${esc(vehicle.status)}</div>
        <div style="color:#888;font-size:11px;margin-top:4px;"><b style="color:#666;min-width:85px;display:inline-block;">Last update:</b> ${esc(timeStr)}</div>
        ${parkingRow}
      </div>
    </div>
  `;
}

// ── PNG base64 cache (module-level singleton) ─────────────────────────────
// We embed PNGs as base64 inside composite SVG markers so that
// data: URI SVGs can reference them (cross-origin-safe).

const _pngBase64Cache = new Map<string, string>();

async function _fetchBase64(url: string): Promise<string> {
  if (_pngBase64Cache.has(url)) return _pngBase64Cache.get(url)!;
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        _pngBase64Cache.set(url, result);
        resolve(result);
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

async function preloadVehicleImages(urls: string[]): Promise<void> {
  await Promise.all(urls.filter(Boolean).map(_fetchBase64));
}

// ── Composite marker icon builders ────────────────────────────────────────

const ICON_W = 44;
const ICON_H = 44;
const LABEL_GAP = 6;
const LABEL_H = 22;
const LABEL_PAD_X = 8;
const FONT_SIZE = 11;

/** Approximate pixel width of a label string at FONT_SIZE px in sans-serif */
function approxTextWidth(text: string): number {
  return Math.ceil(text.length * FONT_SIZE * 0.58) + LABEL_PAD_X * 2;
}

/**
 * Build a composite Google Maps icon that shows the PNG vehicle image on the
 * left and a white pill label (name + speed) to the right.
 * Requires the PNG base64 data URL to already be in cache.
 */
function buildPngCompositeIcon(
  pngUrl: string,
  labelText: string,
): google.maps.Icon {
  const base64 = _pngBase64Cache.get(pngUrl) ?? "";
  const labelW = Math.max(80, approxTextWidth(labelText));
  const totalW = ICON_W + LABEL_GAP + labelW;
  const labelX = ICON_W + LABEL_GAP;
  const labelY = (ICON_H - LABEL_H) / 2;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${ICON_H}">
    ${base64 ? `<image href="${base64}" x="0" y="0" width="${ICON_W}" height="${ICON_H}"/>` : ""}
    <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${LABEL_H}" rx="3"
      fill="rgba(255,255,255,0.95)" stroke="#bbb" stroke-width="0.8"/>
    <text x="${labelX + labelW / 2}" y="${ICON_H / 2}"
      text-anchor="middle" dominant-baseline="middle"
      font-size="${FONT_SIZE}" font-weight="600" font-family="sans-serif" fill="#111"
    >${escSvg(labelText)}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    anchor: new google.maps.Point(22, 22), // center of the vehicle icon area
    size: new google.maps.Size(totalW, ICON_H),
    scaledSize: new google.maps.Size(totalW, ICON_H),
  };
}

/**
 * Build a composite Google Maps icon that inlines an SVG vehicle icon on the
 * left and adds a white pill label (name + speed) to the right.
 */
function buildSvgCompositeIcon(
  vehicleSvgStr: string,
  labelText: string,
  anchorX: number,
  anchorY: number,
): google.maps.Icon {
  const SVG_W = 40;
  const SVG_H = 40;
  const labelW = Math.max(80, approxTextWidth(labelText));
  const totalW = SVG_W + LABEL_GAP + labelW;
  const labelX = SVG_W + LABEL_GAP;
  const labelY = (SVG_H - LABEL_H) / 2;

  // Strip outer <svg ...> tags so we can nest the content inside our composite SVG
  const innerContent = vehicleSvgStr
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>\s*$/, "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${SVG_H}">
    <svg width="${SVG_W}" height="${SVG_H}" viewBox="0 0 ${SVG_W} ${SVG_H}">${innerContent}</svg>
    <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${LABEL_H}" rx="3"
      fill="rgba(255,255,255,0.95)" stroke="#bbb" stroke-width="0.8"/>
    <text x="${labelX + labelW / 2}" y="${SVG_H / 2}"
      text-anchor="middle" dominant-baseline="middle"
      font-size="${FONT_SIZE}" font-weight="600" font-family="sans-serif" fill="#111"
    >${escSvg(labelText)}</text>
  </svg>`;

  return {
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
    anchor: new google.maps.Point(anchorX, anchorY),
    size: new google.maps.Size(totalW, SVG_H),
    scaledSize: new google.maps.Size(totalW, SVG_H),
  };
}

// ── Script loader (singleton, works even if component remounts) ────────────

let _loadPromise: Promise<void> | null = null;
let _loadedKey: string | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.Map) return Promise.resolve();
  if (_loadPromise && _loadedKey === apiKey) return _loadPromise;

  _loadedKey = apiKey;
  _loadPromise = new Promise<void>((resolve, reject) => {
    const callbackName = `__gmaps_${Date.now()}`;
    window[callbackName] = () => {
      delete window[callbackName];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&callback=${callbackName}`;
    script.async = true;
    script.onerror = () => {
      _loadPromise = null;
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return _loadPromise;
}

// ── Smooth marker animation helper ─────────────────────────────────────────

function animateMarkerTo(
  marker: google.maps.Marker,
  toLat: number,
  toLng: number,
  durationMs: number,
  animRef: { current: Map<string, number> },
  vehicleId: string,
) {
  const existingId = animRef.current.get(vehicleId);
  if (existingId !== undefined) cancelAnimationFrame(existingId);

  const fromPos = marker.getPosition();
  if (!fromPos) {
    marker.setPosition({ lat: toLat, lng: toLng });
    return;
  }
  const fromLat = fromPos.lat();
  const fromLng = fromPos.lng();

  const dist = Math.hypot(toLat - fromLat, toLng - fromLng);
  if (dist < 0.000009) {
    marker.setPosition({ lat: toLat, lng: toLng });
    animRef.current.delete(vehicleId);
    return;
  }

  const start = performance.now();
  function step(now: number) {
    const t = Math.min((now - start) / durationMs, 1);
    const lat = fromLat + (toLat - fromLat) * t;
    const lng = fromLng + (toLng - fromLng) * t;
    marker.setPosition({ lat, lng });
    if (t < 1) {
      animRef.current.set(vehicleId, requestAnimationFrame(step));
    } else {
      animRef.current.delete(vehicleId);
    }
  }
  animRef.current.set(vehicleId, requestAnimationFrame(step));
}

// ── Component ──────────────────────────────────────────────────────────────

type MapStatus = "loading" | "no-key" | "ready" | "error";

export function MapComponent({
  vehicles = [],
  locations = [],
  geofences = [],
  routes = [],
  pois = [],
  center = [20.5937, 78.9629],
  zoom = 5,
  onVehicleClick,
  onMapClick,
  className = "",
  routePolylines = [],
  bearingData = {},
  focusVehicleId,
  connectedImeis,
  parkingEvents = [],
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<MapOverlay[]>([]);
  const vehicleMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const vehicleInfoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const openInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const hasFittedRef = useRef(false);
  const markerAnimationsRef = useRef<Map<string, number>>(new Map());
  const [status, setStatus] = useState<MapStatus>("loading");
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");
  // Triggers marker rebuild after PNG base64 images finish pre-loading
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // ── 1. Load Google Maps API key and initialize map ──────────────────────

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const res = await fetch("/api/settings/public");
        if (!res.ok) throw new Error("Failed to fetch settings");
        const settings = await res.json() as { googleMapsKey?: string };
        const apiKey = settings.googleMapsKey;

        if (!apiKey || apiKey.trim() === "") {
          if (!cancelled) setStatus("no-key");
          return;
        }

        await loadGoogleMapsScript(apiKey);
        if (cancelled || !mapRef.current) return;

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center[0], lng: center[1] },
          zoom,
          mapTypeId: "roadmap",
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
          ],
        });

        mapInstanceRef.current = map;
        if (!cancelled) setStatus("ready");
      } catch (_err) {
        if (!cancelled) setStatus("error");
      }
    }

    init();

    return () => {
      cancelled = true;
      mapInstanceRef.current = null;
      hasFittedRef.current = false;
      markerAnimationsRef.current.forEach((rafId) => cancelAnimationFrame(rafId));
      markerAnimationsRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 1b. Pre-load vehicle PNG images as base64 once map is ready ──────────

  useEffect(() => {
    if (status !== "ready") return;
    // Collect unique PNG URLs for all vehicle types
    const types = ["car", "hatchback", "taxi", "tricycle", "truck", "van", "bus"];
    const urls = types.map((t) => getVehicleImg(t)).filter(Boolean) as string[];
    preloadVehicleImages(urls).then(() => setImagesLoaded(true));
  }, [status]);

  // ── 2a. Always-on map click: close open InfoWindow unconditionally ────────

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    const listener = map.addListener("click", () => {
      if (openInfoWindowRef.current) {
        openInfoWindowRef.current.close();
        openInfoWindowRef.current = null;
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [status]);

  // ── 2b. Attach/detach optional onMapClick callback listener ──────────────

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    if (clickListenerRef.current) {
      google.maps.event.removeListener(clickListenerRef.current);
      clickListenerRef.current = null;
    }

    if (onMapClick) {
      clickListenerRef.current = map.addListener(
        "click",
        (e: google.maps.MapMouseEvent) => {
          if (e.latLng) onMapClick(e.latLng.lat(), e.latLng.lng());
        }
      );
    }

    return () => {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [onMapClick, status]);

  // ── 3a. Update vehicle markers in-place (no blink) ──────────────────────

  const updateVehicleMarkers = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    const currentVehicleIds = new Set<string>();
    const boundsForFit = new google.maps.LatLngBounds();

    locations.forEach((location) => {
      const vehicle = vehicles.find((v) => v.id === location.vehicleId);
      if (!vehicle) return;

      const lat = parseFloat(String(location.latitude));
      const lng = parseFloat(String(location.longitude));
      if (!isIndiaCoord(lat, lng)) return;

      currentVehicleIds.add(vehicle.id);

      const speed = parseFloat(String(location.speed ?? "0"));
      // Non-arrow icons always use the user's chosen iconColor.
      // Arrow icon overrides this below with status-based colors.
      const markerColor = vehicle.iconColor ?? "#e4006e";

      let heading = parseFloat(String(location.heading ?? "0")) || 0;
      if (!heading) {
        const bCoords = location.vehicleId ? bearingData[location.vehicleId] : undefined;
        if (bCoords && bCoords.length >= 2) {
          const prev = bCoords[bCoords.length - 2];
          const curr = bCoords[bCoords.length - 1];
          heading = computeBearing(prev[0], prev[1], curr[0], curr[1]);
        } else {
          const vehicleRoute = routePolylines.find((r) => r.vehicleId === location.vehicleId);
          if (vehicleRoute && vehicleRoute.coords.length >= 2) {
            const last = vehicleRoute.coords[vehicleRoute.coords.length - 1];
            const prev = vehicleRoute.coords[vehicleRoute.coords.length - 2];
            heading = computeBearing(prev[0], prev[1], last[0], last[1]);
          }
        }
      }

      const iconType = vehicle.type ?? "car";
      const [anchorX, anchorY] = getIconAnchor(iconType);
      const pngUrl = getVehicleImg(iconType);

      // For "arrow" icon type, override color based on vehicle status semantics:
      // active (moving) → green, idle → orange, stopped / offline → red
      let effectiveMarkerColor = markerColor;
      if (iconType === "arrow") {
        if (vehicle.status === "active" || speed > 3) {
          effectiveMarkerColor = "#22c55e"; // moving → green
        } else if (vehicle.status === "idle") {
          effectiveMarkerColor = "#f97316"; // ignition on, not moving → orange
        } else {
          effectiveMarkerColor = "#ef4444"; // stopped / offline → red
        }
      }

      // Label text: for stopped vehicles show parking duration, else show speed
      const displayName =
        vehicle.name.length > 14 ? vehicle.name.slice(0, 13) + "…" : vehicle.name;
      const isStopped = speed <= 3;
      const parkDur = isStopped ? formatParkingDuration(vehicle.parkedSince) : "";
      const labelText = isStopped && parkDur
        ? `${displayName} | P ${parkDur}`
        : `${displayName} (${speed.toFixed(0)} km/h)`;

      // Build composite marker icon (vehicle image + label pill to the right)
      let markerIcon: google.maps.Icon;
      if (pngUrl && _pngBase64Cache.has(pngUrl)) {
        // PNG vehicle: embed base64 image + label in one SVG
        markerIcon = buildPngCompositeIcon(pngUrl, labelText);
      } else if (pngUrl) {
        // PNG vehicle but base64 not loaded yet — fall back to plain PNG icon
        markerIcon = {
          url: pngUrl,
          anchor: new google.maps.Point(22, 22),
          size: new google.maps.Size(44, 44),
          scaledSize: new google.maps.Size(44, 44),
        };
      } else {
        // SVG-only vehicle type: inline SVG content + label
        const svgStr = getMarkerSvg(iconType, effectiveMarkerColor, heading);
        markerIcon = buildSvgCompositeIcon(svgStr, labelText, anchorX, anchorY);
      }

      // Build InfoWindow popup content
      const isConnected = connectedImeis ? connectedImeis.has(vehicle.deviceId) : false;
      const infoHtml = buildVehicleInfoHtml(vehicle, location, speed, lat, lng, heading, isConnected);

      const existingMarker = vehicleMarkersRef.current.get(vehicle.id);
      if (existingMarker) {
        animateMarkerTo(existingMarker, lat, lng, 800, markerAnimationsRef, vehicle.id);
        existingMarker.setIcon(markerIcon);
        existingMarker.setTitle(vehicle.name);
        const existingIW = vehicleInfoWindowsRef.current.get(vehicle.id);
        if (existingIW) existingIW.setContent(infoHtml);
      } else {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: vehicle.name,
          icon: markerIcon,
        });

        const infoWindow = new google.maps.InfoWindow({
          content: infoHtml,
          disableAutoPan: false,
        });

        marker.addListener("click", () => {
          if (openInfoWindowRef.current && openInfoWindowRef.current !== infoWindow) {
            openInfoWindowRef.current.close();
          }
          infoWindow.open(map, marker);
          openInfoWindowRef.current = infoWindow;
          if (onVehicleClick) onVehicleClick(vehicle.id);
        });

        vehicleMarkersRef.current.set(vehicle.id, marker);
        vehicleInfoWindowsRef.current.set(vehicle.id, infoWindow);
      }

      boundsForFit.extend({ lat, lng });
    });

    // Remove markers for vehicles no longer in the locations list
    vehicleMarkersRef.current.forEach((marker, vid) => {
      if (!currentVehicleIds.has(vid)) {
        const rafId = markerAnimationsRef.current.get(vid);
        if (rafId !== undefined) {
          cancelAnimationFrame(rafId);
          markerAnimationsRef.current.delete(vid);
        }
        marker.setMap(null);
        vehicleMarkersRef.current.delete(vid);
        const iw = vehicleInfoWindowsRef.current.get(vid);
        if (iw) { iw.close(); vehicleInfoWindowsRef.current.delete(vid); }
      }
    });

    // Initial fit to vehicle markers (only once)
    if (currentVehicleIds.size > 0 && !hasFittedRef.current) {
      if (currentVehicleIds.size === 1) {
        map.setCenter(boundsForFit.getCenter()!);
        map.setZoom(14);
      } else {
        map.fitBounds(boundsForFit);
        const listener = map.addListener("idle", () => {
          if ((map.getZoom() ?? 0) > 15) map.setZoom(15);
          google.maps.event.removeListener(listener);
        });
      }
      hasFittedRef.current = true;
    }
  }, [status, vehicles, locations, bearingData, routePolylines, onVehicleClick, imagesLoaded]);

  // ── 3b. Render non-vehicle overlays (polylines, geofences, routes, POIs) ──

  const renderOverlays = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    overlaysRef.current.forEach((o) => {
      if (o instanceof google.maps.InfoWindow) o.close();
      else o.setMap(null);
    });
    overlaysRef.current = [];

    // ── Route polylines (vehicle history trails) ──────────────────────────
    routePolylines.forEach(({ vehicleId: trailVehicleId, coords, color }) => {
      if (coords.length < 2) return;
      const isSelected = focusVehicleId === trailVehicleId;
      const lineColor = color ?? "#3b82f6";
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const poly = new google.maps.Polyline({
        path, map,
        strokeColor: lineColor,
        strokeWeight: isSelected ? 4 : 2,
        strokeOpacity: isSelected ? 0.85 : 0.35,
      });
      overlaysRef.current.push(poly);
    });

    // ── Geofence polygons ─────────────────────────────────────────────────
    geofences.forEach((geofence) => {
      if (geofence.type !== "polygon") return;
      const coords = geofence.coordinates as unknown as [number, number][];
      if (!Array.isArray(coords) || coords.length < 3) return;
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const color = geofence.color ?? "#10b981";
      const polygon = new google.maps.Polygon({
        paths: path, map,
        strokeColor: color, strokeWeight: 2, strokeOpacity: 0.8,
        fillColor: color, fillOpacity: 0.2,
      });
      const centroid = {
        lat: coords.reduce((s, c) => s + c[0], 0) / coords.length,
        lng: coords.reduce((s, c) => s + c[1], 0) / coords.length,
      };
      const infoContent = `<div style="font-family:sans-serif;font-size:13px;"><p style="font-weight:600;margin:0 0 4px">${esc(geofence.name)}</p>${geofence.description ? `<p style="margin:0;color:#666;">${esc(geofence.description)}</p>` : ""}</div>`;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent, position: centroid });
      polygon.addListener("click", () => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        infoWindow.open(map);
        openInfoWindowRef.current = infoWindow;
      });
      overlaysRef.current.push(polygon, infoWindow);
    });

    // ── Named route polylines ─────────────────────────────────────────────
    routes.forEach((route) => {
      const coords = route.coordinates as unknown as [number, number][];
      if (!Array.isArray(coords) || coords.length < 2) return;
      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const color = route.color ?? "#3b82f6";
      const poly = new google.maps.Polyline({ path, map, strokeColor: color, strokeWeight: 3, strokeOpacity: 0.85 });
      const infoContent = `<div style="font-family:sans-serif;font-size:13px;"><p style="font-weight:600;margin:0 0 4px">${esc(route.name)}</p>${route.description ? `<p style="margin:0;color:#666;">${esc(route.description)}</p>` : ""}</div>`;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      poly.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        if (e.latLng) infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
        openInfoWindowRef.current = infoWindow;
      });
      overlaysRef.current.push(poly, infoWindow);
    });

    // ── POI markers ───────────────────────────────────────────────────────
    pois.forEach((poi) => {
      const lat = parseFloat(poi.latitude);
      const lng = parseFloat(poi.longitude);
      if (isNaN(lat) || isNaN(lng)) return;
      const marker = new google.maps.Marker({
        position: { lat, lng }, map, title: poi.name,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24"><circle cx="12" cy="10" r="5" fill="#f59e0b" stroke="white" stroke-width="1.5"/><path d="M12 24 L7 14 Q12 16 17 14 Z" fill="#f59e0b" stroke="white" stroke-width="1"/></svg>`
          )}`,
          anchor: new google.maps.Point(14, 24),
          size: new google.maps.Size(28, 28),
          scaledSize: new google.maps.Size(28, 28),
        },
      });
      const infoContent = `<div style="font-family:sans-serif;font-size:13px;"><p style="font-weight:600;margin:0 0 4px">${esc(poi.name)}</p>${poi.description ? `<p style="margin:3px 0;color:#666;">${esc(poi.description)}</p>` : ""}${poi.category ? `<p style="margin:3px 0;"><b>Category:</b> ${esc(poi.category)}</p>` : ""}</div>`;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      marker.addListener("click", () => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        openInfoWindowRef.current = infoWindow;
      });
      overlaysRef.current.push(marker, infoWindow);
    });

    // ── Parking event "P" markers ─────────────────────────────────────────
    parkingEvents.forEach((event) => {
      const { lat, lng } = event;
      if (!isFinite(lat) || !isFinite(lng)) return;
      const startDate = new Date(event.startTime);
      const endDate = new Date(event.endTime);
      const startStr = startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const endStr = endDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const durStr = event.durationMin >= 60
        ? `${Math.floor(event.durationMin / 60)}h ${event.durationMin % 60}m`
        : `${event.durationMin} min`;
      const pSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
        <circle cx="14" cy="14" r="13" fill="#f59e0b" stroke="white" stroke-width="2"/>
        <text x="14" y="19" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="bold" fill="white">P</text>
      </svg>`;
      const marker = new google.maps.Marker({
        position: { lat, lng }, map, title: `Parked ${durStr}`,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(pSvg)}`,
          anchor: new google.maps.Point(14, 14),
          size: new google.maps.Size(28, 28),
          scaledSize: new google.maps.Size(28, 28),
        },
        zIndex: 5,
      });
      const addrRow = event.address
        ? `<div><b style="color:#666;">Address:</b> ${esc(event.address)}</div>`
        : "";
      const infoContent = `
        <div style="min-width:200px;font-family:sans-serif;font-size:12px;line-height:1.8;">
          <div style="background:#f59e0b;color:#fff;padding:6px 10px;font-weight:700;font-size:13px;border-radius:6px 6px 0 0;">
            Parked ${esc(durStr)}
          </div>
          <div style="padding:8px 10px;background:#fff;border-radius:0 0 6px 6px;">
            <div><b style="color:#666;">Start:</b> ${esc(startStr)}</div>
            <div><b style="color:#666;">End:</b> ${esc(endStr)}</div>
            <div><b style="color:#666;">Duration:</b> ${esc(durStr)}</div>
            <div><b style="color:#666;">Position:</b> <span style="color:#1a6bc7;font-family:monospace;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>
            ${addrRow}
          </div>
        </div>`;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });
      marker.addListener("click", () => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        openInfoWindowRef.current = infoWindow;
      });
      overlaysRef.current.push(marker, infoWindow);
    });
  }, [status, geofences, routes, pois, routePolylines, focusVehicleId, parkingEvents]);

  // Update vehicle markers on location/vehicle/image changes
  useEffect(() => { updateVehicleMarkers(); }, [updateVehicleMarkers]);

  // Render non-vehicle overlays when their data changes
  useEffect(() => { renderOverlays(); }, [renderOverlays]);

  // Cleanup vehicle markers on unmount
  useEffect(() => {
    return () => {
      vehicleMarkersRef.current.forEach((m) => m.setMap(null));
      vehicleMarkersRef.current.clear();
      vehicleInfoWindowsRef.current.forEach((iw) => iw.close());
      vehicleInfoWindowsRef.current.clear();
    };
  }, []);

  // ── 4. Focus vehicle (pan + zoom) ────────────────────────────────────────

  useEffect(() => {
    if (!focusVehicleId || !mapInstanceRef.current || status !== "ready") return;
    const loc = locations.find((l) => l.vehicleId === focusVehicleId);
    if (!loc) return;
    const lat = parseFloat(String(loc.latitude));
    const lng = parseFloat(String(loc.longitude));
    if (isIndiaCoord(lat, lng)) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(15);
    }
  }, [focusVehicleId, locations, status]);

  // ── Control handlers ─────────────────────────────────────────────────────

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (map) map.setZoom((map.getZoom() ?? 10) + 1);
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (map) map.setZoom(Math.max(1, (map.getZoom() ?? 10) - 1));
  };

  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map) {
      map.setCenter({ lat: center[0], lng: center[1] });
      map.setZoom(zoom);
    }
  };

  const toggleMapType = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setMapType((prev) => {
      const next = prev === "streets" ? "satellite" : "streets";
      map.setMapTypeId(next === "satellite" ? "satellite" : "roadmap");
      return next;
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mapRef}
        className="w-full h-full rounded-md"
        style={{ display: status === "ready" ? "block" : "none" }}
      />

      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <p className="text-sm text-muted-foreground animate-pulse">Loading map…</p>
        </div>
      )}

      {status === "no-key" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted rounded-md">
          <MapPinOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Google Maps API key not configured</p>
          <p className="text-xs text-muted-foreground">Add your key in Admin → Settings</p>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">Failed to load map</p>
        </div>
      )}

      {status === "ready" && (
        <div className="absolute right-3 bottom-24 flex flex-col gap-1 z-10">
          <Button size="icon" variant="secondary" onClick={handleZoomIn} title="Zoom in" data-testid="button-zoom-in">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={handleZoomOut} title="Zoom out" data-testid="button-zoom-out">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" onClick={handleRecenter} title="Re-center" data-testid="button-recenter">
            <Locate className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="secondary"
            onClick={toggleMapType}
            title={mapType === "streets" ? "Switch to satellite" : "Switch to map"}
            data-testid="button-toggle-map-type"
          >
            <Layers className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
