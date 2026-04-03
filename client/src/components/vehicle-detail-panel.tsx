import { useQuery } from "@tanstack/react-query";
import { X, MapPin, Gauge, Compass, Mountain, Satellite, Clock, Calendar, TrendingUp, Activity, Bell, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { Vehicle, Location, Trip, Event } from "@shared/schema";

interface Props {
  vehicleId: string;
  vehicles: Vehicle[];
  locations: Location[];
  onClose: () => void;
}

function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 min";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatDate(ts: string | Date | null | undefined): string {
  if (!ts) return "—";
  const d = new Date(ts as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function InfoRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-start gap-1 min-w-0 ${className ?? ""}`}>
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-xs font-medium truncate">{value ?? "—"}</span>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, unit }: { icon: React.ElementType; label: string; value: string | number | null | undefined; unit?: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/40 rounded-md p-2 min-w-0">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="text-[10px] truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-0.5">
        <span className="text-sm font-semibold">{value ?? "—"}</span>
        {unit && <span className="text-[10px] text-muted-foreground">{unit}</span>}
      </div>
    </div>
  );
}

export function VehicleDetailPanel({ vehicleId, vehicles, locations, onClose }: Props) {
  const vehicle = vehicles.find((v) => v.id === vehicleId);
  const location = locations.find((l) => l.vehicleId === vehicleId);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todayTrips } = useQuery<Trip[]>({
    queryKey: ["/api/trips", vehicleId, "today"],
    queryFn: async () => {
      const params = new URLSearchParams({
        vehicleId,
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString(),
      });
      const res = await fetch(`/api/trips?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!vehicleId,
    staleTime: 60000,
  });

  const { data: recentEvents } = useQuery<Event[]>({
    queryKey: ["/api/events", vehicleId, "recent"],
    queryFn: async () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        vehicleId,
        startDate: yesterday.toISOString(),
      });
      const res = await fetch(`/api/events?${params}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    enabled: !!vehicleId,
    staleTime: 30000,
  });

  if (!vehicle) return null;

  const speed = location?.speed != null ? Math.round(parseFloat(String(location.speed))) : null;
  const altitude = location?.altitude != null ? Math.round(parseFloat(String(location.altitude))) : null;
  const heading = location?.heading != null ? Math.round(parseFloat(String(location.heading))) : null;
  const satellites = location?.satellites ?? null;
  const lat = location?.latitude != null ? parseFloat(String(location.latitude)).toFixed(6) : null;
  const lng = location?.longitude != null ? parseFloat(String(location.longitude)).toFixed(6) : null;

  const totalDistanceKm = todayTrips
    ? todayTrips.reduce((sum, t) => sum + parseFloat(String(t.distance ?? 0)), 0).toFixed(1)
    : null;
  const totalMoveDuration = todayTrips
    ? todayTrips.reduce((sum, t) => sum + (t.duration ?? 0), 0)
    : null;
  const topSpeed = todayTrips && todayTrips.length > 0
    ? Math.max(...todayTrips.map((t) => parseFloat(String(t.maxSpeed ?? 0))))
    : null;
  const avgSpeed = todayTrips && todayTrips.length > 0
    ? (todayTrips.reduce((sum, t) => sum + parseFloat(String(t.avgSpeed ?? 0)), 0) / todayTrips.length).toFixed(0)
    : null;
  const tripCount = todayTrips?.length ?? 0;

  const statusColor =
    vehicle.status === "active" ? "bg-green-500" :
    vehicle.status === "idle" ? "bg-yellow-500" :
    "bg-muted-foreground";

  return (
    <div
      className="border-t bg-background flex flex-col"
      style={{ height: "220px" }}
      data-testid="vehicle-detail-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-block h-2 w-2 rounded-full shrink-0 ${statusColor}`} />
          <span className="font-semibold text-sm truncate">{vehicle.name}</span>
          {vehicle.deviceId && (
            <span className="text-xs text-muted-foreground">{vehicle.deviceId}</span>
          )}
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={onClose}
          data-testid="button-close-detail-panel"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="data" className="flex flex-col flex-1 min-h-0">
        <TabsList className="h-7 px-3 py-0 rounded-none border-b bg-transparent justify-start gap-1 shrink-0">
          <TabsTrigger value="data" className="h-6 text-xs rounded-sm px-2 data-[state=active]:bg-muted">
            Data
          </TabsTrigger>
          <TabsTrigger value="graph" className="h-6 text-xs rounded-sm px-2 data-[state=active]:bg-muted">
            Statistics
          </TabsTrigger>
          <TabsTrigger value="events" className="h-6 text-xs rounded-sm px-2 data-[state=active]:bg-muted">
            Events
          </TabsTrigger>
        </TabsList>

        {/* Data Tab */}
        <TabsContent value="data" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-1 px-3 py-2">
              {/* Column 1: Vehicle info */}
              <div className="flex flex-col gap-1">
                <InfoRow label="Type" value={vehicle.type ?? "—"} />
                <InfoRow label="Status" value={
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5 no-default-active-elevate">
                    {vehicle.status ?? "unknown"}
                  </Badge>
                } />
                <InfoRow label="Speed" value={speed != null ? `${speed} km/h` : "—"} />
                <InfoRow label="Heading" value={heading != null ? `${heading}°` : "—"} />
              </div>
              {/* Column 2: Position */}
              <div className="flex flex-col gap-1">
                <InfoRow
                  label="Address"
                  value={
                    <span title={location?.address ?? ""} className="truncate block max-w-[180px]">
                      {location?.address ?? "Waiting for GPS"}
                    </span>
                  }
                />
                <InfoRow label="Coordinates" value={lat && lng ? `${lat}, ${lng}` : "—"} />
                <InfoRow label="Altitude" value={altitude != null ? `${altitude} m` : "—"} />
                <InfoRow label="Satellites" value={satellites != null ? `${satellites} sat` : "—"} />
              </div>
              {/* Column 3: Time */}
              <div className="flex flex-col gap-1">
                <InfoRow label="Last GPS fix" value={formatDate(location?.timestamp)} />
                <InfoRow
                  label="GPS quality"
                  value={
                    satellites == null
                      ? vehicle.lastSeenAt
                        ? `No fix (contact ${formatDate(vehicle.lastSeenAt)})`
                        : "No fix"
                      : satellites >= 8 ? "Good"
                      : satellites >= 4 ? "Moderate" : "Poor"
                  }
                />
                <InfoRow label="Accuracy" value={
                  location?.accuracy != null
                    ? `±${Math.round(parseFloat(String(location.accuracy)))} m`
                    : "—"
                } />
                <InfoRow label="Ignition" value={
                  vehicle.ignitionOn == null
                    ? "—"
                    : (
                      <span className={`flex items-center gap-1 ${vehicle.ignitionOn ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}
                        data-testid="text-ignition-status">
                        <KeyRound className="h-3 w-3 shrink-0" />
                        {vehicle.ignitionOn ? "On" : "Off"}
                      </span>
                    )
                } />
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="graph" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="px-3 py-2">
              {(!todayTrips || todayTrips.length === 0) ? (
                <p className="text-xs text-muted-foreground">No trips recorded today.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  <StatCard icon={TrendingUp} label="Route length" value={totalDistanceKm} unit="km" />
                  <StatCard icon={Activity} label="Move time" value={formatDuration(totalMoveDuration ?? 0)} />
                  <StatCard icon={Clock} label="Trips today" value={tripCount} />
                  <StatCard icon={Gauge} label="Top speed" value={topSpeed != null ? Math.round(topSpeed) : null} unit="km/h" />
                  <StatCard icon={TrendingUp} label="Avg speed" value={avgSpeed} unit="km/h" />
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="flex-1 min-h-0 m-0">
          <ScrollArea className="h-full">
            <div className="px-3 py-2">
              {(!recentEvents || recentEvents.length === 0) ? (
                <p className="text-xs text-muted-foreground">No events in the last 24 hours.</p>
              ) : (
                <div className="flex flex-col gap-1">
                  {recentEvents.slice(0, 12).map((evt) => (
                    <div key={evt.id} className="flex items-start gap-2 text-xs" data-testid={`event-row-${evt.id}`}>
                      <Bell className="h-3 w-3 shrink-0 mt-0.5 text-muted-foreground" />
                      <span className="text-muted-foreground shrink-0">{formatDate(evt.timestamp)}</span>
                      <span className="truncate">{evt.description}</span>
                      <Badge
                        variant={evt.severity === "critical" ? "destructive" : "secondary"}
                        className="text-[10px] h-4 px-1 shrink-0 no-default-active-elevate"
                      >
                        {evt.severity ?? "info"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
