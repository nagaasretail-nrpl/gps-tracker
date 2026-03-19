import { useEffect, useRef, useState } from "react";
import type { Vehicle, Location, Geofence, Route as RouteType, Poi } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Locate, Layers } from "lucide-react";

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
  focusVehicleId?: string | null;
}

function computeBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const lat1Rad = (lat1 * Math.PI) / 180;
  const lat2Rad = (lat2 * Math.PI) / 180;
  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

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
  focusVehicleId,
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const hasFittedRef = useRef(false);
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "© OpenStreetMap contributors",
      maxZoom: 19,
    }).addTo(map);

    if (onMapClick) {
      map.on("click", (e: any) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const L = (window as any).L;
    if (!L) return;

    markersRef.current.forEach((layer) => layer.remove());
    markersRef.current = [];

    const vehicleMarkers: any[] = [];

    routePolylines.forEach(({ vehicleId, coords, color }) => {
      if (coords.length < 2) return;
      const polyline = L.polyline(coords, {
        color: color || "#3b82f6",
        weight: 3,
        opacity: 0.75,
      }).addTo(mapInstanceRef.current);
      markersRef.current.push(polyline);
    });

    locations.forEach((location) => {
      const vehicle = vehicles.find((v) => v.id === location.vehicleId);
      if (!vehicle) return;

      const lat = parseFloat(String(location.latitude));
      const lng = parseFloat(String(location.longitude));
      if (isNaN(lat) || isNaN(lng)) return;

      const speed = parseFloat(String(location.speed || "0"));
      const isMoving = speed > 2;

      let heading = parseFloat(String(location.heading || "0")) || 0;

      if (!heading || heading === 0) {
        const vehicleRoute = routePolylines.find((r) => r.vehicleId === location.vehicleId);
        if (vehicleRoute && vehicleRoute.coords.length >= 2) {
          const last = vehicleRoute.coords[vehicleRoute.coords.length - 1];
          const prev = vehicleRoute.coords[vehicleRoute.coords.length - 2];
          heading = computeBearing(prev[0], prev[1], last[0], last[1]);
        }
      }

      const icon = L.divIcon({
        className: "custom-vehicle-marker",
        html: `
          <div style="transform: rotate(${heading}deg); display:flex; align-items:center; justify-content:center; width:32px; height:32px;">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="${isMoving ? "#22c55e" : vehicle.iconColor || "#2563eb"}">
              <path d="M16 2 L10 28 L16 22 L22 28 Z" stroke="white" stroke-width="1.5"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">${vehicle.name}</h3>
            <p style="margin: 4px 0;"><strong>Speed:</strong> ${speed.toFixed(0)} km/h</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${vehicle.status}</p>
            <p style="margin: 4px 0;"><strong>Coords:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
            <p style="margin: 4px 0;"><strong>Heading:</strong> ${heading.toFixed(0)}&deg;</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${location.address || "Unknown"}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Last update: ${new Date(location.timestamp).toLocaleString()}</p>
          </div>
        `);

      if (onVehicleClick) {
        marker.on("click", () => onVehicleClick(vehicle.id));
      }

      markersRef.current.push(marker);
      vehicleMarkers.push(marker);
    });

    if (vehicleMarkers.length > 0 && !hasFittedRef.current) {
      const group = L.featureGroup(vehicleMarkers);
      mapInstanceRef.current.fitBounds(group.getBounds(), {
        padding: [60, 60],
        maxZoom: 14,
      });
      hasFittedRef.current = true;
    }

    geofences.forEach((geofence) => {
      if (geofence.type === "polygon") {
        const coords = geofence.coordinates as any;
        if (Array.isArray(coords)) {
          const polygon = L.polygon(coords, {
            color: geofence.color || "#10b981",
            fillOpacity: 0.2,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div>
                <h3 style="font-weight: 600;">${geofence.name}</h3>
                <p>${geofence.description || ""}</p>
              </div>
            `);
          markersRef.current.push(polygon);
        }
      }
    });

    routes.forEach((route) => {
      const coords = route.coordinates as any;
      if (Array.isArray(coords)) {
        const polyline = L.polyline(coords, {
          color: route.color || "#3b82f6",
          weight: 3,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div>
              <h3 style="font-weight: 600;">${route.name}</h3>
              <p>${route.description || ""}</p>
            </div>
          `);
        markersRef.current.push(polyline);
      }
    });

    pois.forEach((poi) => {
      const marker = L.marker([
        parseFloat(poi.latitude),
        parseFloat(poi.longitude),
      ])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div>
            <h3 style="font-weight: 600;">${poi.name}</h3>
            <p>${poi.description || ""}</p>
            ${poi.category ? `<p><strong>Category:</strong> ${poi.category}</p>` : ""}
          </div>
        `);
      markersRef.current.push(marker);
    });
  }, [vehicles, locations, geofences, routes, pois, routePolylines]);

  useEffect(() => {
    if (!focusVehicleId || !mapInstanceRef.current) return;
    const loc = locations.find((l) => l.vehicleId === focusVehicleId);
    if (!loc) return;
    const lat = parseFloat(String(loc.latitude));
    const lng = parseFloat(String(loc.longitude));
    if (!isNaN(lat) && !isNaN(lng)) {
      mapInstanceRef.current.setView([lat, lng], 15, { animate: true });
    }
  }, [focusVehicleId]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.setView(center, zoom);
  };

  const toggleMapType = () => {
    const L = (window as any).L;
    if (!L || !mapInstanceRef.current) return;
    setMapType((prev) => {
      const next = prev === "streets" ? "satellite" : "streets";
      mapInstanceRef.current.eachLayer((layer: any) => {
        if (layer._url) mapInstanceRef.current.removeLayer(layer);
      });
      if (next === "satellite") {
        L.tileLayer(
          "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          { attribution: "© Esri", maxZoom: 19 }
        ).addTo(mapInstanceRef.current);
      } else {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }
      return next;
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-md" />

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-[1000]">
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomIn}
          data-testid="button-zoom-in"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleZoomOut}
          data-testid="button-zoom-out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={handleRecenter}
          data-testid="button-recenter"
        >
          <Locate className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="secondary"
          onClick={toggleMapType}
          data-testid="button-toggle-layer"
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
