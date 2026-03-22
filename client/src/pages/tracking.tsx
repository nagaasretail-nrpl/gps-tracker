import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Circle, Wifi, WifiOff, List, X, Gauge, MapPin, Navigation, Clock } from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { filterValidGpsCoords, isBasicValidCoord } from "@/lib/gpsUtils";

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

interface ActiveConnection {
  imei: string;
  remoteAddr: string;
  connectedAt: string;
  lastPacketAt: string;
  packetCount: number;
}

export default function Tracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [mapPopupVehicleId, setMapPopupVehicleId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);
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

  const { data: trailLocations } = useQuery<Location[]>({
    queryKey: ["/api/locations/trail"],
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const { data: activeConnections } = useQuery<ActiveConnection[]>({
    queryKey: ["/api/device/connections"],
    refetchInterval: 10000,
  });

  const prevLocations = usePrevious(latestLocations);

  const validLatestLocations = useMemo(() => {
    if (!latestLocations) return undefined;
    return latestLocations.filter((l) => {
      const lat = parseFloat(String(l.latitude));
      const lng = parseFloat(String(l.longitude));
      return isBasicValidCoord(lat, lng);
    });
  }, [latestLocations]);

  const bearingData = useMemo<Record<string, [number, number][]>>(() => {
    if (!latestLocations) return {};
    const data: Record<string, [number, number][]> = {};
    for (const loc of latestLocations) {
      if (!loc.vehicleId) continue;
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      if (isNaN(lat) || isNaN(lng)) continue;
      const prev = prevLocations?.find((l) => l.vehicleId === loc.vehicleId);
      if (prev) {
        const prevLat = parseFloat(String(prev.latitude));
        const prevLng = parseFloat(String(prev.longitude));
        if (!isNaN(prevLat) && !isNaN(prevLng)) {
          data[loc.vehicleId] = [[prevLat, prevLng], [lat, lng]];
        }
      }
    }
    return data;
  }, [latestLocations, prevLocations]);

  const routePolylines = useMemo(() => {
    if (!vehicles || !trailLocations) return [];
    return vehicles.flatMap((vehicle) => {
      const pts = trailLocations
        .filter((l) => l.vehicleId === vehicle.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      if (pts.length < 2) return [];
      const rawCoords = pts.map(
        (l) => [parseFloat(String(l.latitude)), parseFloat(String(l.longitude))] as [number, number]
      );
      const coords = filterValidGpsCoords(rawCoords);
      if (coords.length < 2) return [];
      return [{ vehicleId: vehicle.id, coords, color: vehicle.iconColor ?? "#2563eb" }];
    });
  }, [vehicles, trailLocations]);

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
          queryClient.invalidateQueries({ queryKey: ["/api/locations/trail"] });
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

  const filteredVehicles = vehicles?.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getVehicleLocation = (vehicleId: string) =>
    latestLocations?.find((l) => l.vehicleId === vehicleId);

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

  const isDeviceConnected = (vehicle: Vehicle) =>
    (activeConnections ?? []).some((c) => c.imei === vehicle.deviceId);

  const selectedTrailCount = useMemo(() => {
    if (!selectedVehicle || !trailLocations) return 0;
    return trailLocations.filter((l) => l.vehicleId === selectedVehicle).length;
  }, [selectedVehicle, trailLocations]);

  const mapCenter: [number, number] = (() => {
    if (latestLocations && latestLocations.length > 0) {
      const loc = latestLocations[0];
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      if (!isNaN(lat) && !isNaN(lng)) return [lat, lng];
    }
    return [20.5937, 78.9629];
  })();

  const vehicleListPanel = (
    <div className="flex flex-col h-full bg-card">
      <div className="p-3 border-b flex items-center gap-2">
        <h2 className="text-sm font-semibold flex-1">Vehicles</h2>
        <button
          className="md:hidden"
          onClick={() => setMobileListOpen(false)}
          aria-label="Close vehicle list"
          data-testid="button-close-vehicle-list"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="relative flex-1 min-w-0">
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
            {[1, 2, 3].map((i) => (
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
              const isSelected = selectedVehicle === vehicle.id;
              const connected = isDeviceConnected(vehicle);
              return (
                <Card
                  key={vehicle.id}
                  className={`cursor-pointer hover-elevate ${
                    isSelected ? "border-primary bg-primary/5" : ""
                  }`}
                  onClick={() => {
                    setSelectedVehicle(isSelected ? null : vehicle.id);
                    setMobileListOpen(false);
                  }}
                  data-testid={`card-vehicle-${vehicle.id}`}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Circle
                          className={`h-2.5 w-2.5 fill-current ${getStatusColor(vehicle.status)}`}
                        />
                        <span className="text-sm font-medium truncate max-w-[110px]">
                          {vehicle.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {connected ? (
                          <span title="Device TCP connected">
                            <Wifi className="h-3 w-3 text-green-500" />
                          </span>
                        ) : (
                          <span title="Device offline">
                            <WifiOff className="h-3 w-3 text-muted-foreground/50" />
                          </span>
                        )}
                        <Badge variant={getStatusBadge(vehicle.status)} className="text-xs">
                          {vehicle.status}
                        </Badge>
                      </div>
                    </div>
                    {location ? (
                      <>
                        <p className="text-xs text-muted-foreground">
                          Speed: {parseFloat(String(location.speed || "0")).toFixed(0)} km/h
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatTimestamp(location.timestamp)}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {parseFloat(String(location.latitude)).toFixed(4)},{" "}
                          {parseFloat(String(location.longitude)).toFixed(4)}
                        </p>
                        {isSelected && selectedTrailCount > 1 && (
                          <p className="text-xs mt-1" style={{ color: vehicle.iconColor ?? "#2563eb" }}>
                            Trail: {selectedTrailCount} points (6h)
                          </p>
                        )}
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

      {activeConnections !== undefined && (
        <div className="border-t p-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Live Connections
          </p>
          {activeConnections.length === 0 ? (
            <p className="text-xs text-muted-foreground">No devices connected</p>
          ) : (
            <div className="space-y-1">
              {activeConnections.map((conn) => (
                <div key={conn.imei} className="text-xs flex items-center gap-1.5" data-testid={`conn-${conn.imei}`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  <span className="font-mono truncate">{conn.imei}</span>
                  <span className="text-muted-foreground ml-auto shrink-0">{conn.packetCount}p</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-72 flex-shrink-0 flex-col border-r">
        {vehicleListPanel}
      </div>

      {/* Mobile overlay drawer */}
      {mobileListOpen && (
        <div className="md:hidden absolute inset-0 z-50 flex">
          <div className="w-80 max-w-[85vw] flex flex-col border-r shadow-lg">
            {vehicleListPanel}
          </div>
          <div
            className="flex-1 bg-black/30"
            onClick={() => setMobileListOpen(false)}
          />
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        {locationsLoading && !latestLocations ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapComponent
            key={validLatestLocations && validLatestLocations.length > 0 ? "has-locations" : "no-locations"}
            vehicles={vehicles}
            locations={validLatestLocations}
            center={mapCenter}
            zoom={latestLocations && latestLocations.length > 0 ? 13 : 5}
            className="h-full w-full"
            onVehicleClick={(id) => {
              setMapPopupVehicleId((prev) => (prev === id ? null : id));
              setSelectedVehicle((prev) => (prev === id ? null : id));
            }}
            onMapClick={() => setMapPopupVehicleId(null)}
            routePolylines={routePolylines}
            bearingData={bearingData}
            focusVehicleId={selectedVehicle}
          />
        )}

        {/* Mobile toggle button */}
        <Button
          size="icon"
          variant="secondary"
          className="md:hidden absolute top-3 left-3 z-40 shadow-md"
          onClick={() => setMobileListOpen(true)}
          data-testid="button-open-vehicle-list"
          aria-label="Open vehicle list"
        >
          <List className="h-4 w-4" />
        </Button>

        {/* Floating vehicle detail popup — appears on map when icon is tapped */}
        {(() => {
          const popupVehicle = vehicles?.find((v) => v.id === mapPopupVehicleId);
          const popupLocation = mapPopupVehicleId
            ? latestLocations?.find((l) => l.vehicleId === mapPopupVehicleId)
            : null;
          if (!popupVehicle) return null;
          const speed = parseFloat(String(popupLocation?.speed ?? "0")).toFixed(0);
          const lat = popupLocation ? parseFloat(String(popupLocation.latitude)).toFixed(5) : null;
          const lng = popupLocation ? parseFloat(String(popupLocation.longitude)).toFixed(5) : null;
          const connected = (activeConnections ?? []).some((c) => c.imei === popupVehicle.deviceId);
          return (
            <div
              className="absolute bottom-6 right-4 z-40 w-72 max-w-[calc(100vw-2rem)]"
              data-testid="map-vehicle-popup"
            >
              <Card className="shadow-xl border">
                <CardContent className="p-0">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-4 py-3 rounded-t-md"
                    style={{ backgroundColor: popupVehicle.iconColor ?? "hsl(var(--primary))" }}
                  >
                    <div className="flex items-center gap-2">
                      {connected ? (
                        <Wifi className="h-3.5 w-3.5 text-white/90" />
                      ) : (
                        <WifiOff className="h-3.5 w-3.5 text-white/60" />
                      )}
                      <span className="font-semibold text-white text-sm truncate max-w-[160px]">
                        {popupVehicle.name}
                      </span>
                    </div>
                    <button
                      className="p-1 rounded text-white/80 hover:bg-white/20 transition-colors"
                      onClick={() => setMapPopupVehicleId(null)}
                      data-testid="button-close-map-popup"
                      aria-label="Close vehicle popup"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Detail rows */}
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Gauge className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Speed</span>
                      <span className="ml-auto font-medium">{speed} km/h</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Circle
                        className={`h-3.5 w-3.5 shrink-0 fill-current ${getStatusColor(popupVehicle.status)}`}
                      />
                      <span className="text-muted-foreground">Status</span>
                      <Badge
                        variant={getStatusBadge(popupVehicle.status)}
                        className="ml-auto text-xs"
                        data-testid={`popup-status-${popupVehicle.id}`}
                      >
                        {popupVehicle.status}
                      </Badge>
                    </div>
                    {lat && lng && (
                      <div className="flex items-start gap-2 text-sm">
                        <Navigation className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">Coords</span>
                        <span className="ml-auto font-mono text-xs text-right">
                          {lat},<br />{lng}
                        </span>
                      </div>
                    )}
                    {popupLocation?.address && (
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-xs leading-snug line-clamp-2">
                          {String(popupLocation.address)}
                        </span>
                      </div>
                    )}
                    {popupLocation && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground text-xs">
                          {formatTimestamp(popupLocation.timestamp)}
                        </span>
                      </div>
                    )}
                    {!popupLocation && (
                      <p className="text-xs text-muted-foreground py-1">Waiting for GPS signal…</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
