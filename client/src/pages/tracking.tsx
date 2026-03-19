import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Circle } from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

export default function Tracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 15000,
  });

  const { data: latestLocations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
    refetchInterval: 15000,
  });

  // WebSocket for real-time location + vehicle status updates
  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "location") {
          const newLoc: Location = msg.data;
          queryClient.setQueryData<Location[]>(["/api/locations/latest"], (prev) => {
            if (!prev) return [newLoc];
            const filtered = prev.filter((l) => l.vehicleId !== newLoc.vehicleId);
            return [...filtered, newLoc];
          });
        }

        if (msg.type === "vehicle") {
          const updated: Vehicle = msg.data;
          queryClient.setQueryData<Vehicle[]>(["/api/vehicles"], (prev) => {
            if (!prev) return [updated];
            return prev.map((v) => (v.id === updated.id ? updated : v));
          });
        }
      } catch (_) {}
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    return () => ws.close();
  }, [queryClient]);

  const filteredVehicles = vehicles?.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getVehicleLocation = (vehicleId: string) => {
    return latestLocations?.find(l => l.vehicleId === vehicleId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-green-500";
      case "stopped": return "text-yellow-500";
      default: return "text-muted-foreground";
    }
  };

  const getStatusBadge = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "active": return "default";
      case "stopped": return "secondary";
      default: return "outline";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const diff = Date.now() - new Date(timestamp).getTime();
    if (diff < 0) return new Date(timestamp).toLocaleTimeString();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  // Compute map center from first available location, fallback to India
  const mapCenter: [number, number] = (() => {
    if (latestLocations && latestLocations.length > 0) {
      const loc = latestLocations[0];
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [20.5937, 78.9629]; // India
  })();

  return (
    <div className="flex h-full w-full" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Vehicle List Panel */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r bg-card">
        <div className="p-3 border-b">
          <h2 className="text-sm font-semibold mb-2">Vehicles</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
              data-testid="input-search-vehicles"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          {vehiclesLoading ? (
            <div className="p-3 space-y-2">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">No vehicles found</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {filteredVehicles.map((vehicle) => {
                const location = getVehicleLocation(vehicle.id);
                return (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer hover-elevate ${
                      selectedVehicle === vehicle.id ? "border-primary" : ""
                    }`}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    data-testid={`card-vehicle-${vehicle.id}`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <Circle className={`h-2.5 w-2.5 fill-current ${getStatusColor(vehicle.status)}`} />
                          <span className="text-sm font-medium truncate max-w-[120px]">{vehicle.name}</span>
                        </div>
                        <Badge variant={getStatusBadge(vehicle.status)} className="text-xs">
                          {vehicle.status}
                        </Badge>
                      </div>
                      {location ? (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Speed: {parseFloat(String(location.speed || "0")).toFixed(0)} km/h
                          </p>
                          <p className="text-xs text-muted-foreground">{formatTimestamp(location.timestamp)}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {parseFloat(String(location.latitude)).toFixed(4)}, {parseFloat(String(location.longitude)).toFixed(4)}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Waiting for GPS...</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {locationsLoading && !latestLocations ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapComponent
            key={latestLocations && latestLocations.length > 0 ? "has-locations" : "no-locations"}
            vehicles={vehicles}
            locations={latestLocations}
            center={mapCenter}
            zoom={latestLocations && latestLocations.length > 0 ? 13 : 5}
            className="h-full w-full"
            onVehicleClick={setSelectedVehicle}
          />
        )}
      </div>
    </div>
  );
}
