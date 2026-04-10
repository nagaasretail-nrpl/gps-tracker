import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useMemo } from "react";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, List, X, KeyRound, LayoutList, Map } from "lucide-react";
import type { Vehicle, Location, UserAlertSettings } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { filterValidGpsCoords, isBasicValidCoord, isIndiaCoord } from "@/lib/gpsUtils";
import { getVehicleImg } from "@/lib/vehicleIcons";
import { VehicleDetailPanel } from "@/components/vehicle-detail-panel";

const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between same alert type per vehicle

function fireNotification(title: string, body: string) {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification(title, { body, icon: "/nista-logo.png" });
  }
}

/** Render 4-bar signal indicator like a mobile signal icon */
function SignalBars({ level, color, title }: { level: number; color: string; title?: string }) {
  const bars = [1, 2, 3, 4];
  return (
    <span title={title} style={{ display: "inline-flex", alignItems: "flex-end", gap: "1.5px", height: "14px" }}>
      {bars.map((b) => (
        <span
          key={b}
          style={{
            display: "inline-block",
            width: "3px",
            height: `${b * 25}%`,
            borderRadius: "1px",
            backgroundColor: b <= level ? color : "#d1d5db",
            transition: "background-color 0.3s",
          }}
        />
      ))}
    </span>
  );
}


function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

/** Common fields returned to all authenticated users */
interface DeviceConnectionInfo {
  imei: string;
  vehicleId: string;
  vehicleName: string;
  connected: boolean;
  recentlyActive: boolean;
  packetCount: number;
  /** Admin-only fields — undefined for non-admin users */
  remoteAddr?: string | null;
  connectedAt?: string | null;
  lastPacketAt?: string | null;
  lastLocationAt?: string | null;
  lastRejection?: { reason: string; at: string; count: number } | null;
}

export default function Tracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [objectDetailsSearch, setObjectDetailsSearch] = useState("");
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  // lastNotified[vehicleId][alertType] = timestamp of last notification
  const lastNotifiedRef = useRef<Record<string, Record<string, number>>>({});

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

  const { data: activeConnections } = useQuery<DeviceConnectionInfo[]>({
    queryKey: ["/api/device/connections"],
    refetchInterval: 5000,
  });

  const { data: alertSettings } = useQuery<UserAlertSettings>({
    queryKey: ["/api/alert-settings"],
  });

  const prevLocations = usePrevious(latestLocations);

  const validLatestLocations = useMemo(() => {
    if (!latestLocations) return undefined;
    return latestLocations.filter((l) => {
      const lat = parseFloat(String(l.latitude));
      const lng = parseFloat(String(l.longitude));
      return isBasicValidCoord(lat, lng) && isIndiaCoord(lat, lng);
    });
  }, [latestLocations]);

  const bearingData = useMemo<Record<string, [number, number][]>>(() => {
    if (!latestLocations) return {};
    const data: Record<string, [number, number][]> = {};
    for (const loc of latestLocations) {
      if (!loc.vehicleId) continue;
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      if (!isIndiaCoord(lat, lng)) continue;
      const prev = prevLocations?.find((l) => l.vehicleId === loc.vehicleId);
      if (prev) {
        const prevLat = parseFloat(String(prev.latitude));
        const prevLng = parseFloat(String(prev.longitude));
        if (isIndiaCoord(prevLat, prevLng)) {
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

      // Append the vehicle's current latest position so the trail always
      // ends at the vehicle icon, even when trailLocations is stale.
      const latestLoc = latestLocations?.find((l) => l.vehicleId === vehicle.id);
      if (latestLoc) {
        const latestLat = parseFloat(String(latestLoc.latitude));
        const latestLng = parseFloat(String(latestLoc.longitude));
        if (isBasicValidCoord(latestLat, latestLng) && isIndiaCoord(latestLat, latestLng)) {
          const last = coords[coords.length - 1];
          const dist = Math.hypot(latestLat - last[0], latestLng - last[1]);
          if (dist > 0.000009) {
            coords.push([latestLat, latestLng]);
          }
        }
      }

      return [{ vehicleId: vehicle.id, coords, color: "#e4006e" }];
    });
  }, [vehicles, trailLocations, latestLocations]);

  useEffect(() => {
    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "location") {
          const newLoc: Location = msg.data;
          const lat = parseFloat(String(newLoc.latitude));
          const lng = parseFloat(String(newLoc.longitude));
          if (isBasicValidCoord(lat, lng) && isIndiaCoord(lat, lng)) {
            queryClient.setQueryData<Location[]>(["/api/locations/latest"], (prev) => {
              if (!prev) return [newLoc];
              const filtered = prev.filter((l) => l.vehicleId !== newLoc.vehicleId);
              return [...filtered, newLoc];
            });
            queryClient.invalidateQueries({ queryKey: ["/api/locations/trail"] });

            // Check alert thresholds and fire browser notifications
            const settings = queryClient.getQueryData<UserAlertSettings>(["/api/alert-settings"]);
            if (settings && newLoc.vehicleId) {
              const vehicleId = newLoc.vehicleId;
              const allVehicles = queryClient.getQueryData<Vehicle[]>(["/api/vehicles"]);
              const vehicle = allVehicles?.find((v) => v.id === vehicleId);
              const vehicleName = vehicle?.name ?? vehicleId;
              const now = Date.now();

              const canFire = (type: string) => {
                const last = lastNotifiedRef.current[vehicleId]?.[type] ?? 0;
                return now - last > NOTIFICATION_COOLDOWN_MS;
              };
              const markFired = (type: string) => {
                if (!lastNotifiedRef.current[vehicleId]) lastNotifiedRef.current[vehicleId] = {};
                lastNotifiedRef.current[vehicleId][type] = now;
              };

              // Speed alert
              if (settings.speedAlertEnabled) {
                const speed = parseFloat(String(newLoc.speed ?? "0"));
                if (speed > settings.speedThresholdKph && canFire("speed")) {
                  fireNotification(
                    `Speed Alert — ${vehicleName}`,
                    `Speed ${speed.toFixed(0)} km/h exceeds limit of ${settings.speedThresholdKph} km/h`
                  );
                  markFired("speed");
                }
              }

              // Idle alert — vehicle is live (connected) but speed ≤ 2 for longer than threshold
              if (settings.idleAlertEnabled && vehicle?.parkedSince) {
                const idleMs = now - new Date(vehicle.parkedSince).getTime();
                const idleMin = idleMs / 60000;
                const speed = parseFloat(String(newLoc.speed ?? "0"));
                const connections = queryClient.getQueryData<DeviceConnectionInfo[]>(["/api/device/connections"]) ?? [];
                const isConnected = connections.some((c) => c.imei === vehicle.deviceId && (c.connected || c.recentlyActive));
                if (isConnected && speed <= 2 && idleMin >= settings.idleThresholdMin && canFire("idle")) {
                  fireNotification(
                    `Idle Alert — ${vehicleName}`,
                    `Vehicle has been idle for ${Math.floor(idleMin)} minutes`
                  );
                  markFired("idle");
                }
              }

              // Parking alert — vehicle stationary longer than threshold
              if (settings.parkingAlertEnabled && vehicle?.parkedSince) {
                const parkedMs = now - new Date(vehicle.parkedSince).getTime();
                const parkedMin = parkedMs / 60000;
                if (parkedMin >= settings.parkingThresholdMin && canFire("parking")) {
                  fireNotification(
                    `Parking Alert — ${vehicleName}`,
                    `Vehicle has been parked for ${Math.floor(parkedMin)} minutes`
                  );
                  markFired("parking");
                }
              }
            }
          }
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

  const formatParkingDuration = (parkedSince: Date | string | null | undefined): string => {
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
    const d = new Date(timestamp);
    const day = d.getDate();
    const mon = d.toLocaleString("default", { month: "short" });
    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${day} ${mon}, ${time}`;
  };

  // "Connected" for UI purposes means either a live TCP session OR a DB location
  // within the last 3 minutes. This ensures devices that were connected before a
  // server restart still show as active until their window expires.
  const isDeviceConnected = (vehicle: Vehicle) =>
    (activeConnections ?? []).some(
      (c) => c.imei === vehicle.deviceId && (c.connected || c.recentlyActive)
    );

  const selectedTrailCount = useMemo(() => {
    if (!selectedVehicle || !trailLocations) return 0;
    return trailLocations.filter((l) => l.vehicleId === selectedVehicle).length;
  }, [selectedVehicle, trailLocations]);

  const mapCenter: [number, number] = (() => {
    if (validLatestLocations && validLatestLocations.length > 0) {
      const loc = validLatestLocations[0];
      const lat = parseFloat(String(loc.latitude));
      const lng = parseFloat(String(loc.longitude));
      return [lat, lng];
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
              const hasLocation = location != null;
              const lastSeenAt = vehicle.lastSeenAt ? new Date(vehicle.lastSeenAt) : null;
              const speed = parseFloat(String(location?.speed ?? "0")).toFixed(0);
              const pngImg = getVehicleImg(vehicle.type ?? "car");
              const iconColor = vehicle.iconColor ?? "#e4006e";
              const isMoving = parseFloat(String(location?.speed ?? "0")) > 2;
              const gprsLevel = connected ? 4 : 0;

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
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* GPRS signal indicator only */}
                        <div className="flex items-center gap-1" data-testid={`signal-${vehicle.id}`}>
                          <SignalBars
                            level={gprsLevel}
                            color={connected ? "#22c55e" : "#9ca3af"}
                            title={connected ? "GPRS: Connected" : "GPRS: Disconnected"}
                          />
                        </div>
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
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: connected
                            ? "#22c55e"
                            : hasLocation
                            ? "#eab308"
                            : lastSeenAt
                            ? "#f97316"
                            : "#9ca3af",
                        }}
                      />
                      <span className="text-xs text-muted-foreground truncate">
                        {connected
                          ? "Connected"
                          : hasLocation
                          ? `Last GPS ${formatTimestamp(location!.timestamp)}`
                          : lastSeenAt
                          ? `No GPS fix · last contact ${formatTimestamp(lastSeenAt)}`
                          : vehicle.deviceId
                          ? `Device ${vehicle.deviceId} not connected`
                          : "No GPS device assigned"}
                      </span>
                      {vehicle.status === "stopped" && vehicle.parkedSince && (
                        <span
                          className="text-xs font-semibold flex-shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded"
                          style={{ background: "#fff8e1", color: "#92400e" }}
                          data-testid={`text-parking-${vehicle.id}`}
                        >
                          <span
                            style={{ background: "#f59e0b", color: "#fff", fontSize: "9px", fontWeight: 700, padding: "0 4px", borderRadius: "2px" }}
                          >P</span>
                          {formatParkingDuration(vehicle.parkedSince)}
                        </span>
                      )}
                      {vehicle.ignitionOn != null && (
                        <span
                          className={`flex items-center gap-0.5 text-[10px] font-bold flex-shrink-0 px-1.5 py-0.5 rounded ${
                            vehicle.ignitionOn
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                          data-testid={`text-ignition-${vehicle.id}`}
                          title={`ACC ${vehicle.ignitionOn ? "ON" : "OFF"}`}
                        >
                          <KeyRound className="h-2.5 w-2.5 mr-0.5" />
                          {vehicle.ignitionOn ? "ACC ON" : "ACC OFF"}
                        </span>
                      )}
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
      {activeConnections !== undefined && (() => {
        const liveConns = activeConnections.filter((c) => c.connected);
        const recentConns = activeConnections.filter((c) => !c.connected && c.recentlyActive);
        const totalActive = liveConns.length + recentConns.length;
        return (
          <div className="border-t p-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
              Live Connections
            </p>
            {totalActive === 0 ? (
              <p className="text-xs text-muted-foreground">No devices connected</p>
            ) : (
              <div className="space-y-1">
                {liveConns.map((conn) => (
                  <div key={conn.imei} className="text-xs flex items-center gap-1.5" data-testid={`conn-${conn.imei}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                    <span className="font-mono truncate">{conn.vehicleName || conn.imei}</span>
                    <span className="text-muted-foreground ml-auto shrink-0">{conn.packetCount}p</span>
                  </div>
                ))}
                {recentConns.map((conn) => (
                  <div key={conn.imei} className="text-xs flex items-center gap-1.5" data-testid={`conn-recent-${conn.imei}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span className="font-mono truncate text-muted-foreground">{conn.vehicleName || conn.imei}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );

  // Object details table data
  const objectDetailsRows = useMemo(() => {
    const allVehicles = vehicles ?? [];
    const q = objectDetailsSearch.toLowerCase().trim();
    return allVehicles
      .filter((v) => !q || v.name.toLowerCase().includes(q) || (v.deviceId ?? "").toLowerCase().includes(q) || (v.licensePlate ?? "").toLowerCase().includes(q))
      .map((vehicle) => {
        const loc = latestLocations?.find((l) => l.vehicleId === vehicle.id);
        const conn = (activeConnections ?? []).find((c) => c.imei === vehicle.deviceId);
        const connected = !!(conn?.connected || conn?.recentlyActive);
        const speed = loc ? Math.round(parseFloat(String(loc.speed ?? "0"))) : null;
        const altitude = loc?.altitude != null ? Math.round(parseFloat(String(loc.altitude))) : null;
        const heading = loc?.heading != null ? Math.round(parseFloat(String(loc.heading))) : null;
        const lat = loc?.latitude != null ? parseFloat(String(loc.latitude)).toFixed(5) : null;
        const lng = loc?.longitude != null ? parseFloat(String(loc.longitude)).toFixed(5) : null;
        return { vehicle, loc, connected, speed, altitude, heading, lat, lng };
      });
  }, [vehicles, latestLocations, activeConnections, objectDetailsSearch]);

  const objectDetailsPanel = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
        <LayoutList className="h-4 w-4 text-primary shrink-0" />
        <span className="font-semibold text-sm">Object Details</span>
        <span className="text-xs text-muted-foreground">({objectDetailsRows.length} vehicles)</span>
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search vehicles…"
            value={objectDetailsSearch}
            onChange={(e) => setObjectDetailsSearch(e.target.value)}
            className="pl-8 h-8 text-sm w-52"
            data-testid="input-object-details-search"
          />
          {objectDetailsSearch && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              onClick={() => setObjectDetailsSearch("")}
              data-testid="button-clear-object-search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1">
        <div className="min-w-max">
          <table className="w-full text-xs border-collapse" data-testid="table-object-details">
            <thead className="sticky top-0 bg-muted z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Name</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">IMEI</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Protocol</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Time (position)</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Position</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Alt</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Angle</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Speed</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Status</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">GPRS</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Engine</th>
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground border-b whitespace-nowrap">Plate</th>
              </tr>
            </thead>
            <tbody>
              {objectDetailsRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-muted-foreground">
                    {vehiclesLoading ? "Loading vehicles…" : "No vehicles found"}
                  </td>
                </tr>
              ) : (
                objectDetailsRows.map(({ vehicle, loc, connected, speed, altitude, heading, lat, lng }) => {
                  const isMoving = (speed ?? 0) > 2;
                  const statusLabel =
                    connected && isMoving ? "Moving"
                    : connected ? "Idle"
                    : loc ? "Stopped"
                    : "Offline";
                  const statusColor =
                    statusLabel === "Moving" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : statusLabel === "Idle" ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : statusLabel === "Stopped" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                    : "bg-muted text-muted-foreground";
                  const posTime = loc?.timestamp
                    ? new Date(loc.timestamp).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
                    : "—";
                  return (
                    <tr
                      key={vehicle.id}
                      className="border-b border-border/40 hover-elevate cursor-pointer"
                      onClick={() => { setViewMode("map"); setSelectedVehicle(vehicle.id); }}
                      data-testid={`row-object-${vehicle.id}`}
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{vehicle.name}</td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{vehicle.deviceId ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{vehicle.deviceModel ?? "GT06"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{posTime}</td>
                      <td className="px-3 py-2 font-mono whitespace-nowrap">
                        {lat && lng ? `${lat}, ${lng}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{altitude != null ? `${altitude} m` : "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{heading != null ? `${heading}°` : "—"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span style={{ color: isMoving ? "#16a34a" : undefined }}>
                          {speed != null ? `${speed} km/h` : "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColor}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <SignalBars
                          level={connected ? 4 : 0}
                          color={connected ? "#22c55e" : "#9ca3af"}
                          title={connected ? "GPRS: Connected" : "GPRS: Disconnected"}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {vehicle.ignitionOn == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            vehicle.ignitionOn
                              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            <KeyRound className="h-2.5 w-2.5" />
                            {vehicle.ignitionOn ? "ON" : "OFF"}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-muted-foreground whitespace-nowrap">{vehicle.licensePlate ?? "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </ScrollArea>

      {/* Footer count */}
      <div className="border-t px-4 py-1.5 shrink-0 text-xs text-muted-foreground">
        View {objectDetailsRows.length} of {vehicles?.length ?? 0} vehicles
      </div>
    </div>
  );

  return (
    <div className="relative flex h-full w-full overflow-hidden" style={{ height: "calc(100vh - 3.5rem)" }}>
      {/* Desktop sidebar */}
      <div className="hidden md:flex w-72 flex-shrink-0 flex-col border-r">
        {vehicleListPanel}
      </div>

      {/* Mobile full-screen vehicle list */}
      {mobileListOpen && viewMode === "map" && (
        <div className="md:hidden absolute inset-0 z-50 flex flex-col">
          {vehicleListPanel}
        </div>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        {/* View toggle bar */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b bg-background shrink-0">
          <Button
            size="sm"
            variant={viewMode === "map" ? "default" : "ghost"}
            onClick={() => setViewMode("map")}
            data-testid="button-view-map"
            className="h-7 text-xs gap-1"
          >
            <Map className="h-3.5 w-3.5" />
            Map
          </Button>
          <Button
            size="sm"
            variant={viewMode === "list" ? "default" : "ghost"}
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
            className="h-7 text-xs gap-1"
          >
            <LayoutList className="h-3.5 w-3.5" />
            Object Details
          </Button>
        </div>

        {viewMode === "list" ? (
          /* Object Details table */
          <div className="flex-1 min-h-0 overflow-hidden">
            {objectDetailsPanel}
          </div>
        ) : (
          /* Map + Detail Panel */
          <div className="flex-1 flex flex-col min-h-0">
            {/* Map */}
            <div className="flex-1 relative min-h-0">
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
                  connectedImeis={new Set(
                    (activeConnections ?? [])
                      .filter((c) => c.connected || c.recentlyActive)
                      .map((c) => c.imei)
                  )}
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

                  {/* Mobile bottom pill — only shown when detail panel is closed */}
                  {selectedVehicle && !latestLocations?.find((l) => l.vehicleId === selectedVehicle) && (
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
                  )}
                </>
              )}
            </div>

            {/* Vehicle detail panel (desktop) — slides in below map when vehicle selected */}
            {selectedVehicle && vehicles && latestLocations && (
              <div className="hidden md:block shrink-0">
                <VehicleDetailPanel
                  vehicleId={selectedVehicle}
                  vehicles={vehicles}
                  locations={latestLocations}
                  onClose={() => setSelectedVehicle(null)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
