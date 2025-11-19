import { useEffect, useRef, useState } from "react";
import type { Vehicle, Location, Geofence, Route as RouteType, Poi } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Locate, Layers } from "lucide-react";

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
}

export function MapComponent({
  vehicles = [],
  locations = [],
  geofences = [],
  routes = [],
  pois = [],
  center = [40.7128, -74.0060],
  zoom = 12,
  onVehicleClick,
  onMapClick,
  className = "",
}: MapComponentProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [mapType, setMapType] = useState<"streets" | "satellite">("streets");

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const L = (window as any).L;
    if (!L) return;

    const map = L.map(mapRef.current).setView(center, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);

    if (onMapClick) {
      map.on('click', (e: any) => {
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

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    locations.forEach((location) => {
      const vehicle = vehicles.find(v => v.id === location.vehicleId);
      if (!vehicle) return;

      const icon = L.divIcon({
        className: 'custom-vehicle-marker',
        html: `
          <div style="transform: rotate(${location.heading || 0}deg);">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="${vehicle.iconColor || '#2563eb'}">
              <path d="M16 2 L10 28 L16 22 L22 28 Z" stroke="white" stroke-width="1.5"/>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([parseFloat(location.latitude), parseFloat(location.longitude)], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div style="min-width: 200px;">
            <h3 style="font-weight: 600; margin-bottom: 8px;">${vehicle.name}</h3>
            <p style="margin: 4px 0;"><strong>Speed:</strong> ${location.speed || 0} km/h</p>
            <p style="margin: 4px 0;"><strong>Status:</strong> ${vehicle.status}</p>
            <p style="margin: 4px 0;"><strong>Location:</strong> ${location.address || 'Unknown'}</p>
            <p style="margin: 4px 0; font-size: 12px; color: #666;">Last update: ${new Date(location.timestamp).toLocaleString()}</p>
          </div>
        `);

      if (onVehicleClick) {
        marker.on('click', () => onVehicleClick(vehicle.id));
      }

      markersRef.current.push(marker);
    });

    geofences.forEach((geofence) => {
      if (geofence.type === 'polygon') {
        const coords = geofence.coordinates as any;
        if (Array.isArray(coords)) {
          const polygon = L.polygon(coords, {
            color: geofence.color || '#10b981',
            fillOpacity: 0.2,
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(`
              <div>
                <h3 style="font-weight: 600;">${geofence.name}</h3>
                <p>${geofence.description || ''}</p>
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
          color: route.color || '#3b82f6',
          weight: 3,
        })
          .addTo(mapInstanceRef.current)
          .bindPopup(`
            <div>
              <h3 style="font-weight: 600;">${route.name}</h3>
              <p>${route.description || ''}</p>
            </div>
          `);
        markersRef.current.push(polyline);
      }
    });

    pois.forEach((poi) => {
      const marker = L.marker([parseFloat(poi.latitude), parseFloat(poi.longitude)])
        .addTo(mapInstanceRef.current)
        .bindPopup(`
          <div>
            <h3 style="font-weight: 600;">${poi.name}</h3>
            <p>${poi.description || ''}</p>
            ${poi.category ? `<p><strong>Category:</strong> ${poi.category}</p>` : ''}
          </div>
        `);
      markersRef.current.push(marker);
    });

  }, [vehicles, locations, geofences, routes, pois]);

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  };

  const toggleMapType = () => {
    setMapType(prev => prev === "streets" ? "satellite" : "streets");
  };

  return (
    <div className={`relative ${className}`}>
      <div ref={mapRef} className="w-full h-full rounded-md" />
      
      <div className="absolute bottom-6 right-6 flex flex-col gap-2">
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
