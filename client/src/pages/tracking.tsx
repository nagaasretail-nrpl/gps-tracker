import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Wifi, WifiOff, List, X } from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterValidGpsCoords, isBasicValidCoord } from "@/lib/gpsUtils";
import { getVehicleImg } from "@/lib/vehicleIcons";

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
  const [mobileListOpen, setMobileListOpen] = useState(true);
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
      return [{ vehicleId: vehicle.id, coords, color: vehicle.iconColor ?? "#e4006e" }];
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
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold flex-1">Vehicles</h2>
          <button
            className="md:hidden"
            onClick={() => setMobileListOpen(false)}
            aria-label="Close vehicle list"
            data-testid="button-close-vehicle-list"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search vehicles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-sm"
            data-testid="input-search-vehicles"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {vehiclesLoading ? (
          <div className="p-2 space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full rounded-md" />
            ))}
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No vehicles found</p>
          </div>
        ) : (
          <div className="py-1">
            {filteredVehicles.map((vehicle) => {
              const location = getVehicleLocation(vehicle.id);
              const isSelected = selectedVehicle === vehicle.id;
              const connected = isDeviceConnected(vehicle);
              const speed = parseFloat(String(location?.speed ?? "0")).toFixed(0);
              const pngImg = getVehicleImg(vehicle.type ?? "car");
              const iconColor = vehicle.iconColor ?? "#e4006e";
              const isMoving = parseFloat(String(location?.speed ?? "0")) > 2;

              return (
                <div
                  key={vehicle.id}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer border-b border-border/50 hover-elevate ${
                    isSelected ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                  onClick={() => {
                    setSelectedVehicle(isSelected ? null : vehicle.id);
                    setMobileListOpen(false);
                  }}
                  data-testid={`card-vehicle-${vehicle.id}`}
                >
                  {/* Vehicle type icon */}
                  <div
                    className="flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: `${iconColor}18` }}
                  >
                    {pngImg ? (
                      <img
                        src={pngImg}
                        alt={vehicle.type ?? "vehicle"}
                        className="w-7 h-7 object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: iconColor }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-sm font-semibold truncate" data-testid={`text-vehicle-name-${vehicle.id}`}>
                        {vehicle.name}
                      </span>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {connected ? (
                          <span title="Connected"><Wifi className="h-3 w-3 text-green-500" /></span>
                        ) : (
                          <span title="Offline"><WifiOff className="h-3 w-3 text-muted-foreground/40" /></span>
                        )}
                        <span
                          className="text-xs font-medium tabular-nums"
                          style={{ color: isMoving ? "#22c55e" : "hsl(var(--muted-foreground))" }}
                          data-testid={`text-speed-${vehicle.id}`}
                        >
                          {speed} km/h
                        </span>
                      </div>
                    </div>
                    {vehicle.licensePlate && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate" data-testid={`text-plate-${vehicle.id}`}>
                        {vehicle.licensePlate}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            vehicle.status === "active"
                              ? "#22c55e"
                              : vehicle.status === "stopped"
                              ? "#eab308"
                              : "#9ca3af",
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {location
                          ? formatTimestamp(location.timestamp)
                          : "Waiting for GPS…"}
                      </span>
                      {isSelected && selectedTrailCount > 1 && (
                        <Badge variant="outline" className="text-xs ml-auto flex-shrink-0 px-1 py-0">
                          {selectedTrailCount}pts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Live connections footer */}
      {activeConnections !== undefined && (
        <div className="border-t p-2.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
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

      {/* Mobile full-screen vehicle list */}
      {mobileListOpen && (
        <div className="md:hidden absolute inset-0 z-50 flex flex-col">
          {vehicleListPanel}
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
              setSelectedVehicle((prev) => (prev === id ? null : id));
            }}
            onMapClick={() => {}}
            routePolylines={routePolylines}
            bearingData={bearingData}
            focusVehicleId={selectedVehicle}
          />
        )}

        {/* Mobile controls (only when list is closed) */}
        {!mobileListOpen && (
          <>
            {/* Small list button at top-left */}
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

            {/* Bottom pill showing selected vehicle and change button */}
            {selectedVehicle ? (
              <div className="md:hidden absolute bottom-4 left-4 right-4 z-40">
                <Button
                  variant="default"
                  className="w-full shadow-xl justify-between bg-primary text-primary-foreground"
                  onClick={() => setMobileListOpen(true)}
                  data-testid="button-change-vehicle"
                >
                  <span className="truncate flex-1 text-left font-bold text-sm">
                    {vehicles?.find((v) => v.id === selectedVehicle)?.name ?? "Selected Vehicle"}
                  </span>
                  <span className="text-xs font-medium opacity-80 shrink-0 ml-2">Change Vehicle</span>
                </Button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
