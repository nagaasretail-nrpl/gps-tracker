import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  Radio,
  AlertTriangle,
  MapPin,
  Navigation,
  Activity,
  Clock,
  Gauge,
  CheckCircle2,
} from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";

interface FleetEvent {
  id: string;
  vehicleId: string;
  type: string;
  message: string;
  createdAt: string;
}

interface Trip {
  id: string;
  vehicleId: string;
  startTime: string;
  endTime: string | null;
  distance: string | null;
}

function formatAgo(ts: string | Date) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return new Date(ts).toLocaleTimeString();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (s < 60) return `${s}s ago`;
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

function eventBadgeVariant(type: string): "destructive" | "secondary" | "outline" {
  if (type === "speed_violation") return "destructive";
  if (type.startsWith("geofence")) return "secondary";
  return "outline";
}

export default function Dashboard() {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 20000,
  });

  const { data: latestLocations } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
    refetchInterval: 20000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<FleetEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 30000,
  });

  const { data: trips } = useQuery<Trip[]>({
    queryKey: ["/api/trips"],
    refetchInterval: 30000,
  });

  const total = vehicles?.length ?? 0;
  const active = vehicles?.filter((v) => v.status === "active").length ?? 0;
  const stopped = vehicles?.filter((v) => v.status === "stopped").length ?? 0;
  const offline = vehicles?.filter((v) => v.status === "offline").length ?? 0;
  const activeTrips = trips?.filter((t) => !t.endTime).length ?? 0;
  const speedViolations = events?.filter((e) => e.type === "speed_violation").length ?? 0;
  const recentEvents = (events ?? []).slice(0, 12);
  const vehicleById = Object.fromEntries((vehicles ?? []).map((v) => [v.id, v]));

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Fleet Dashboard</h1>
          <p className="text-sm text-muted-foreground">Real-time overview of your fleet</p>
        </div>
        <Button asChild>
          <Link href="/tracking">
            <Radio className="h-4 w-4 mr-2" />
            Live Tracking
          </Link>
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {vehiclesLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}><CardContent className="p-5"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Total</p>
                <p className="text-2xl font-bold" data-testid="text-total-vehicles">{total}</p>
                <div className="mt-2 text-muted-foreground"><Car className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Active</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-active-vehicles">{active}</p>
                <div className="mt-2 text-green-600 dark:text-green-400"><Navigation className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Stopped</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="text-stopped-vehicles">{stopped}</p>
                <div className="mt-2 text-yellow-600 dark:text-yellow-400"><MapPin className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Offline</p>
                <p className="text-2xl font-bold text-muted-foreground" data-testid="text-offline-vehicles">{offline}</p>
                <div className="mt-2 text-muted-foreground"><CheckCircle2 className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Trips</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activeTrips}</p>
                <div className="mt-2 text-blue-600 dark:text-blue-400"><Activity className="h-4 w-4" /></div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground mb-1">Alerts</p>
                <p className={`text-2xl font-bold ${speedViolations > 0 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{speedViolations}</p>
                <div className={`mt-2 ${speedViolations > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}><AlertTriangle className="h-4 w-4" /></div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Vehicle Status List */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle Status
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              {vehiclesLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : vehicles && vehicles.length > 0 ? (
                <div className="divide-y">
                  {vehicles.map((v) => {
                    const loc = latestLocations?.find((l) => l.vehicleId === v.id);
                    const speed = parseFloat(String(loc?.speed ?? "0")).toFixed(0);
                    return (
                      <div
                        key={v.id}
                        className="flex items-center justify-between px-4 py-3 gap-3"
                        data-testid={`row-vehicle-${v.id}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {loc
                              ? `${speed} km/h · ${formatAgo(loc.createdAt)}`
                              : "No location data"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            v.status === "active" ? "default"
                            : v.status === "stopped" ? "secondary"
                            : "outline"
                          }
                        >
                          {v.status ?? "unknown"}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No vehicles registered
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Recent Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              {eventsLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentEvents.length > 0 ? (
                <div className="divide-y">
                  {recentEvents.map((ev) => {
                    const vehicle = vehicleById[ev.vehicleId];
                    return (
                      <div key={ev.id} className="px-4 py-3" data-testid={`row-event-${ev.id}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">
                              {vehicle?.name ?? "Unknown vehicle"}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{ev.message}</p>
                          </div>
                          <Badge variant={eventBadgeVariant(ev.type)} className="flex-shrink-0 text-xs">
                            {ev.type.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatAgo(ev.createdAt)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No recent alerts
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active Trips */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Trips
              {activeTrips > 0 && <Badge variant="default" className="ml-1">{activeTrips}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-48">
              {trips === undefined ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : activeTrips > 0 ? (
                <div className="divide-y">
                  {trips.filter((t) => !t.endTime).map((trip) => {
                    const vehicle = vehicleById[trip.vehicleId];
                    const elapsed = Date.now() - new Date(trip.startTime).getTime();
                    const mins = Math.floor(Math.max(elapsed, 0) / 60000);
                    return (
                      <div key={trip.id} className="flex items-center justify-between px-4 py-3 gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{vehicle?.name ?? "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            Started {formatAgo(trip.startTime)} · {mins}m elapsed
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          {trip.distance ? `${parseFloat(trip.distance).toFixed(1)} km` : "—"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No trips in progress</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Live Speed Bars */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Current Speeds
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-48">
              {vehiclesLoading ? (
                <div className="p-4 space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : vehicles && vehicles.length > 0 ? (
                <div className="divide-y">
                  {vehicles.map((v) => {
                    const loc = latestLocations?.find((l) => l.vehicleId === v.id);
                    const speed = parseFloat(String(loc?.speed ?? "0"));
                    const pct = Math.min((speed / 120) * 100, 100);
                    return (
                      <div key={v.id} className="px-4 py-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{speed.toFixed(0)} km/h</p>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              speed > 100 ? "bg-red-500" : speed > 60 ? "bg-yellow-500" : "bg-green-500"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">No speed data</div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
