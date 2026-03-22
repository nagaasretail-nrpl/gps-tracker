import { useEffect, useRef, useState, useCallback } from "react";
import type { Vehicle, Location, Geofence, Route as RouteType, Poi } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Locate, Layers, MapPinOff } from "lucide-react";
import { getMarkerSvg, getIconAnchor, getVehicleImg } from "@/lib/vehicleIcons";

// ── Types ──────────────────────────────────────────────────────────────────

interface RoutePolyline {
  vehicleId: string;
  coords: [number, number][];
  color?: string;
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

/** Escape HTML special characters to prevent XSS in InfoWindow content */
function esc(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

/** Build styled HTML for the vehicle InfoWindow */
function buildVehicleInfoHtml(
  vehicle: Vehicle,
  location: Location,
  speed: number,
  lat: number,
  lng: number,
  heading: number
): string {
  const headerColor = vehicle.iconColor ?? "#e4006e";
  const ts = new Date(location.timestamp);
  const timeStr = ts.toLocaleString();
  const address = String(location.address ?? "").trim();
  return `
    <div style="min-width:220px;max-width:280px;font-family:sans-serif;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.18);">
      <div style="background:${headerColor};color:#fff;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:8px;">
        <span style="font-weight:700;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${esc(vehicle.name)}</span>
      </div>
      <div style="background:#fff;padding:10px 12px;font-size:12px;line-height:1.7;color:#222;">
        ${address ? `<div><b style="color:#555;min-width:70px;display:inline-block;">Address:</b> ${esc(address)}</div>` : ""}
        <div><b style="color:#555;min-width:70px;display:inline-block;">Position:</b> <span style="color:#1a6bc7;font-family:monospace;">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>
        <div><b style="color:#555;min-width:70px;display:inline-block;">Speed:</b> ${speed.toFixed(0)} km/h</div>
        <div><b style="color:#555;min-width:80px;display:inline-block;">Heading:</b> ${heading.toFixed(0)}&deg;</div>
        <div><b style="color:#555;min-width:80px;display:inline-block;">Status:</b> ${esc(vehicle.status)}</div>
        <div style="color:#888;font-size:11px;margin-top:4px;"><b style="color:#555;min-width:80px;display:inline-block;">Last update:</b> ${esc(timeStr)}</div>
      </div>
    </div>
  `;
}

// ── Script loader (singleton, works even if component remounts) ────────────

let _loadPromise: Promise<void> | null = null;
let _loadedKey: string | null = null;

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  // Check if the library is already available at runtime.
  if (window.google?.maps?.Map) return Promise.resolve();

  // If already loading with same key, reuse the promise.
  if (_loadPromise && _loadedKey === apiKey) return _loadPromise;

  _loadedKey = apiKey;
  _loadPromise = new Promise<void>((resolve, reject) => {
    const callbackName = `__gmaps_${Date.now()}`;
    // Use the Window index signature (declared above) for the dynamic callback.
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
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<MapOverlay[]>([]);
  const vehicleMarkersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const vehicleInfoWindowsRef = useRef<Map<string, google.maps.InfoWindow>>(new Map());
  const openInfoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const hasFittedRef = useRef(false);
  const [status, setStatus] = useState<MapStatus>("loading");
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");

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
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      if (isNaN(lat) || isNaN(lng)) return;

      currentVehicleIds.add(vehicle.id);

      const speed = parseFloat(String(location.speed ?? "0"));
      const markerColor = speed > 2 ? "#22c55e" : (vehicle.iconColor ?? "#e4006e");

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
      const [anchorX] = getIconAnchor(iconType);
      const pngImg = getVehicleImg(iconType);

      // Anchor at BOTTOM-CENTER of icon so label appears below and
      // the geographic point aligns with the bottom of the icon (like a map pin).
      const markerIcon = pngImg
        ? {
            url: pngImg,
            anchor: new google.maps.Point(22, 44), // bottom-center of 44×44 px PNG
            size: new google.maps.Size(44, 44),
            scaledSize: new google.maps.Size(44, 44),
          }
        : {
            url: `data:image/svg+xml,${encodeURIComponent(getMarkerSvg(iconType, markerColor, heading))}`,
            anchor: new google.maps.Point(anchorX, 40), // bottom of 40×40 SVG
            size: new google.maps.Size(40, 40),
            scaledSize: new google.maps.Size(40, 40),
          };

      // Label: vehicle name + speed shown below the icon
      const labelText = `${vehicle.name} \u00b7 ${speed.toFixed(0)} km/h`;

      // Build InfoWindow content
      const infoHtml = buildVehicleInfoHtml(vehicle, location, speed, lat, lng, heading);

      const existingMarker = vehicleMarkersRef.current.get(vehicle.id);
      if (existingMarker) {
        existingMarker.setPosition({ lat, lng });
        existingMarker.setIcon(markerIcon);
        existingMarker.setTitle(vehicle.name);
        existingMarker.setLabel({
          text: labelText,
          className: "map-vehicle-label",
          color: "#111111",
          fontFamily: "sans-serif",
          fontSize: "11px",
          fontWeight: "600",
        });
        const existingIW = vehicleInfoWindowsRef.current.get(vehicle.id);
        if (existingIW) existingIW.setContent(infoHtml);
      } else {
        const marker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: vehicle.name,
          icon: markerIcon,
          label: {
            text: labelText,
            className: "map-vehicle-label",
            color: "#111111",
            fontFamily: "sans-serif",
            fontSize: "11px",
            fontWeight: "600",
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: infoHtml,
          disableAutoPan: false,
        });

        marker.addListener("click", () => {
          // Close any previously open InfoWindow
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
  }, [status, vehicles, locations, bearingData, routePolylines, onVehicleClick]);

  // ── 3b. Render non-vehicle overlays (polylines, geofences, routes, POIs) ──

  const renderOverlays = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map || status !== "ready") return;

    // Clear previous non-vehicle overlays
    overlaysRef.current.forEach((o) => {
      if (o instanceof google.maps.InfoWindow) {
        o.close();
      } else {
        o.setMap(null);
      }
    });
    overlaysRef.current = [];

    // ── Route polylines (vehicle history trails) ──────────────────────────
    routePolylines.forEach(({ vehicleId: trailVehicleId, coords, color }) => {
      if (coords.length < 2) return;

      const isSelected = focusVehicleId === trailVehicleId;
      const lineColor = color ?? "#3b82f6";

      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const poly = new google.maps.Polyline({
        path,
        map,
        strokeColor: lineColor,
        strokeWeight: isSelected ? 4 : 2,
        strokeOpacity: isSelected ? 0.85 : 0.35,
      });
      overlaysRef.current.push(poly);

      // Draw small waypoint dots along the trail
      if (isSelected) {
        coords.forEach(([lat, lng], idx) => {
          const isLast = idx === coords.length - 1;
          if (isLast) return; // skip last — that's the vehicle marker itself
          const dotMarker = new google.maps.Marker({
            position: { lat, lng },
            map,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: lineColor,
              fillOpacity: idx === 0 ? 0.3 : 0.6,
              strokeColor: lineColor,
              strokeWeight: 1,
              strokeOpacity: 0.5,
              scale: idx === 0 ? 3 : 4,
            },
            clickable: false,
          });
          overlaysRef.current.push(dotMarker);
        });
      }
    });

    // ── Geofence polygons ─────────────────────────────────────────────────
    geofences.forEach((geofence) => {
      if (geofence.type === "polygon") {
        const coords = geofence.coordinates as unknown as [number, number][];
        if (!Array.isArray(coords) || coords.length < 3) return;

        const path = coords.map(([lat, lng]) => ({ lat, lng }));
        const color = geofence.color ?? "#10b981";

        const polygon = new google.maps.Polygon({
          paths: path,
          map,
          strokeColor: color,
          strokeWeight: 2,
          strokeOpacity: 0.8,
          fillColor: color,
          fillOpacity: 0.2,
        });

        const centroid = {
          lat: coords.reduce((s, c) => s + c[0], 0) / coords.length,
          lng: coords.reduce((s, c) => s + c[1], 0) / coords.length,
        };

        const infoContent = `
          <div style="font-family:sans-serif;font-size:13px;">
            <p style="font-weight:600;margin:0 0 4px">${esc(geofence.name)}</p>
            ${geofence.description ? `<p style="margin:0;color:#666;">${esc(geofence.description)}</p>` : ""}
          </div>
        `;
        const infoWindow = new google.maps.InfoWindow({ content: infoContent, position: centroid });

        polygon.addListener("click", () => {
          if (openInfoWindowRef.current) openInfoWindowRef.current.close();
          infoWindow.open(map);
          openInfoWindowRef.current = infoWindow;
        });

        overlaysRef.current.push(polygon);
        overlaysRef.current.push(infoWindow);
      }
    });

    // ── Named route polylines ─────────────────────────────────────────────
    routes.forEach((route) => {
      const coords = route.coordinates as unknown as [number, number][];
      if (!Array.isArray(coords) || coords.length < 2) return;

      const path = coords.map(([lat, lng]) => ({ lat, lng }));
      const color = route.color ?? "#3b82f6";

      const poly = new google.maps.Polyline({
        path,
        map,
        strokeColor: color,
        strokeWeight: 3,
        strokeOpacity: 0.85,
      });

      const infoContent = `
        <div style="font-family:sans-serif;font-size:13px;">
          <p style="font-weight:600;margin:0 0 4px">${esc(route.name)}</p>
          ${route.description ? `<p style="margin:0;color:#666;">${esc(route.description)}</p>` : ""}
        </div>
      `;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      poly.addListener("click", (e: google.maps.MapMouseEvent) => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        if (e.latLng) infoWindow.setPosition(e.latLng);
        infoWindow.open(map);
        openInfoWindowRef.current = infoWindow;
      });

      overlaysRef.current.push(poly);
      overlaysRef.current.push(infoWindow);
    });

    // ── POI markers ───────────────────────────────────────────────────────
    pois.forEach((poi) => {
      const lat = parseFloat(poi.latitude);
      const lng = parseFloat(poi.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const marker = new google.maps.Marker({
        position: { lat, lng },
        map,
        title: poi.name,
        icon: {
          url: `data:image/svg+xml,${encodeURIComponent(
            `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24">
              <circle cx="12" cy="10" r="5" fill="#f59e0b" stroke="white" stroke-width="1.5"/>
              <path d="M12 24 L7 14 Q12 16 17 14 Z" fill="#f59e0b" stroke="white" stroke-width="1"/>
            </svg>`
          )}`,
          anchor: new google.maps.Point(14, 24),
          size: new google.maps.Size(28, 28),
          scaledSize: new google.maps.Size(28, 28),
        },
      });

      const infoContent = `
        <div style="font-family:sans-serif;font-size:13px;">
          <p style="font-weight:600;margin:0 0 4px">${esc(poi.name)}</p>
          ${poi.description ? `<p style="margin:3px 0;color:#666;">${esc(poi.description)}</p>` : ""}
          ${poi.category ? `<p style="margin:3px 0;"><b>Category:</b> ${esc(poi.category)}</p>` : ""}
        </div>
      `;
      const infoWindow = new google.maps.InfoWindow({ content: infoContent });

      marker.addListener("click", () => {
        if (openInfoWindowRef.current) openInfoWindowRef.current.close();
        infoWindow.open(map, marker);
        openInfoWindowRef.current = infoWindow;
      });

      overlaysRef.current.push(marker);
      overlaysRef.current.push(infoWindow);
    });
  }, [
    status, geofences, routes, pois,
    routePolylines, focusVehicleId,
  ]);

  // Update vehicle markers on location/vehicle changes (no blink)
  useEffect(() => {
    updateVehicleMarkers();
  }, [updateVehicleMarkers]);

  // Render non-vehicle overlays when their data changes
  useEffect(() => {
    renderOverlays();
  }, [renderOverlays]);

  // Clear vehicle markers on map unmount
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
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current.panTo({ lat, lng });
      mapInstanceRef.current.setZoom(15);
    }
  }, [focusVehicleId, locations, status]);

  // ── 5. Fit bounds to route polylines (history) ───────────────────────────

  useEffect(() => {
    if (!mapInstanceRef.current || focusVehicleId || status !== "ready") return;
    if (!window.google?.maps) return;

    const allCoords = routePolylines.flatMap((r) => r.coords);
    if (allCoords.length < 2) return;

    const bounds = new google.maps.LatLngBounds();
    allCoords.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds);
    }
  }, [routePolylines, focusVehicleId, status]);

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
      {/* Map container — always rendered so ref is attached */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-md"
        style={{ display: status === "ready" ? "block" : "none" }}
      />

      {/* Loading state */}
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <p className="text-sm text-muted-foreground animate-pulse">Loading map…</p>
        </div>
      )}

      {/* No API key */}
      {status === "no-key" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted rounded-md">
          <MapPinOff className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm font-medium text-muted-foreground">Google Maps API key not configured</p>
          <p className="text-xs text-muted-foreground">Add your key in Admin → Settings</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted rounded-md">
          <p className="text-sm text-muted-foreground">Failed to load map</p>
        </div>
      )}

      {/* Map controls */}
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
