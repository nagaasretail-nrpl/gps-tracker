import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, Radio, AlertTriangle, Navigation, Activity, Clock,
  Gauge, Timer, MapPin, Wifi, WifiOff, ShieldAlert,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { Vehicle, Location } from "@shared/schema";
import { format } from "date-fns";

interface FleetEvent {
  id: string;
  vehicleId: string;
  type: string;
  message: string;
  createdAt: string;
}

interface TripSegment {
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  distanceKm: number;
  durationSec: number;
  idleTimeSec: number;
  stopCount: number;
  avgSpeedKmh: number;
}

function formatAgo(ts: string | Date | null | undefined) {
  if (!ts) return "—";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff < 0) return d.toLocaleTimeString();
  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (s < 60) return `${s}s ago`;
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return d.toLocaleDateString();
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function eventBadgeVariant(type: string): "destructive" | "secondary" | "outline" {
  if (type === "speed_violation") return "destructive";
  if (type.startsWith("geofence")) return "secondary";
  return "outline";
}

const STATUS_COLORS = {
  active: "#16a34a",
  stopped: "#ca8a04",
  offline: "#94a3b8",
};

export default function Dashboard() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 30000,
  });

  const { data: latestLocations } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
    refetchInterval: 30000,
  });

  const { data: events, isLoading: eventsLoading } = useQuery<FleetEvent[]>({
    queryKey: ["/api/events"],
    refetchInterval: 30000,
  });

  const { data: todaySegments, isLoading: segmentsLoading } = useQuery<TripSegment[]>({
    queryKey: ["/api/locations/trips", "dashboard-today", todayStart],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate: todayStart, endDate: todayEnd });
      const res = await fetch(`/api/locations/trips?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: 30000,
  });

  const total = vehicles?.length ?? 0;
  const active = vehicles?.filter(v => v.status === "active").length ?? 0;
  const stopped = vehicles?.filter(v => v.status === "stopped").length ?? 0;
  const offline = vehicles?.filter(v => v.status === "offline").length ?? 0;

  const pieData = [
    { name: "Active", value: active, color: STATUS_COLORS.active },
    { name: "Stopped", value: stopped, color: STATUS_COLORS.stopped },
    { name: "Offline", value: offline, color: STATUS_COLORS.offline },
  ].filter(d => d.value > 0);

  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
  const onlineCount = vehicles?.filter(v => {
    const loc = latestLocations?.find(l => l.vehicleId === v.id);
    return loc ? new Date(loc.createdAt).getTime() > thirtyMinAgo : false;
  }).length ?? 0;
  const onlinePct = total > 0 ? Math.round((onlineCount / total) * 100) : 0;

  const todayKm = todaySegments?.reduce((s, t) => s + t.distanceKm, 0) ?? 0;
  const todayIdleSec = todaySegments?.reduce((s, t) => s + t.idleTimeSec, 0) ?? 0;
  const todayTrips = todaySegments?.length ?? 0;
  const avgKmPerVehicle = total > 0 ? todayKm / total : 0;

  const todayTs = new Date(todayStart).getTime();
  const todayEvents = events?.filter(e => new Date(e.createdAt).getTime() >= todayTs) ?? [];
  const speedViolationsToday = todayEvents.filter(e => e.type === "speed_violation").length;
  const geofenceAlertsToday = todayEvents.filter(e => e.type.startsWith("geofence")).length;
  const recentEvents = (events ?? []).slice(0, 8);
  const vehicleById = Object.fromEntries((vehicles ?? []).map(v => [v.id, v]));

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold" data-testid="text-page-title">Fleet Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {format(today, "EEEE, MMMM d, yyyy")} · Real-time fleet overview
          </p>
        </div>
        <Button asChild>
          <Link href="/tracking">
            <Radio className="h-4 w-4 mr-2" />
            Live Tracking
          </Link>
        </Button>
      </div>

      {/* Row 1: Fleet Status donut + Today's Usage + Idle & Online */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

        {/* Fleet Status donut */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm font-semibold">Fleet Status</CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : total === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">No vehicles</div>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={62}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold" data-testid="text-total-vehicles">{total}</span>
                    <span className="text-xs text-muted-foreground">Vehicles</span>
                  </div>
                </div>
                <div className="flex justify-around text-center pt-1">
                  <div>
                    <p className="text-base font-semibold text-green-600 dark:text-green-400" data-testid="text-active-vehicles">{active}</p>
                    <p className="text-[10px] text-muted-foreground">Active</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-yellow-600 dark:text-yellow-400" data-testid="text-stopped-vehicles">{stopped}</p>
                    <p className="text-[10px] text-muted-foreground">Stopped</p>
                  </div>
                  <div>
                    <p className="text-base font-semibold text-muted-foreground" data-testid="text-offline-vehicles">{offline}</p>
                    <p className="text-[10px] text-muted-foreground">Offline</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Today's Fleet Usage */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
            <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm font-semibold">Today's Fleet Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {segmentsLoading ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <>
                <div>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold" data-testid="text-today-km">{todayKm.toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground mb-1">km total</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Total fleet distance today</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Trips</p>
                    <p className="text-lg font-semibold" data-testid="text-today-trips">{todayTrips}</p>
                  </div>
                  <div className="rounded-md bg-muted/50 px-3 py-2">
                    <p className="text-xs text-muted-foreground">Avg / vehicle</p>
                    <p className="text-lg font-semibold">{avgKmPerVehicle.toFixed(1)} km</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Fleet Idle + Online stacked */}
        <div className="flex flex-col gap-4">
          <Card className="flex-1">
            <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
              <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-semibold">Fleet Idle Today</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {segmentsLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="flex items-end gap-1.5">
                  <span className="text-2xl font-bold" data-testid="text-today-idle">{formatDuration(todayIdleSec)}</span>
                  <span className="text-xs text-muted-foreground mb-1">idle time</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="flex-1">
            <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
              <Wifi className="h-4 w-4 text-muted-foreground shrink-0" />
              <CardTitle className="text-sm font-semibold">Fleet Online</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {vehiclesLoading ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-bold" data-testid="text-online-pct">{onlinePct}%</span>
                  <span className="text-xs text-muted-foreground mb-1">{onlineCount}/{total} in last 30m</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Alert stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-100 dark:bg-red-950 shrink-0">
              <Gauge className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Overspeed Today</p>
              <p className={`text-xl font-bold ${speedViolationsToday > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="text-overspeed-alerts">
                {speedViolationsToday}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-950 shrink-0">
              <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Geofence Today</p>
              <p className={`text-xl font-bold ${geofenceAlertsToday > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`} data-testid="text-geofence-alerts">
                {geofenceAlertsToday}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-100 dark:bg-green-950 shrink-0">
              <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Active Now</p>
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{active}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-950 shrink-0">
              <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">All Alerts Today</p>
              <p className="text-xl font-bold">{todayEvents.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Vehicle Status list + Recent Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Vehicle Status */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2 flex-wrap">
            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm font-semibold">Vehicle Status</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vehiclesLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : vehicles && vehicles.length > 0 ? (
              <div className="divide-y max-h-72 overflow-y-auto">
                {vehicles.map(v => {
                  const loc = latestLocations?.find(l => l.vehicleId === v.id);
                  const speed = parseFloat(String(loc?.speed ?? "0")).toFixed(0);
                  const isOnline = loc ? new Date(loc.createdAt).getTime() > thirtyMinAgo : false;
                  return (
                    <div
                      key={v.id}
                      className="flex items-center justify-between px-4 py-3 gap-3"
                      data-testid={`row-vehicle-${v.id}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: v.iconColor || "#2563eb" }}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{v.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {loc ? `${speed} km/h · ${formatAgo(loc.createdAt)}` : "No location data"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isOnline
                          ? <Wifi className="h-3.5 w-3.5 text-green-500" />
                          : <WifiOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                        }
                        <Badge variant={v.status === "active" ? "default" : v.status === "stopped" ? "secondary" : "outline"}>
                          {v.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">No vehicles registered</div>
            )}
          </CardContent>
        </Card>

        {/* Recent Events */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center gap-2 flex-wrap">
            <AlertTriangle className="h-4 w-4 text-muted-foreground shrink-0" />
            <CardTitle className="text-sm font-semibold">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="divide-y max-h-72 overflow-y-auto">
                {recentEvents.map(ev => {
                  const vehicle = vehicleById[ev.vehicleId];
                  return (
                    <div key={ev.id} className="px-4 py-3" data-testid={`row-event-${ev.id}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate">{vehicle?.name ?? "Unknown vehicle"}</p>
                          <p className="text-xs text-muted-foreground truncate">{ev.message}</p>
                        </div>
                        <Badge variant={eventBadgeVariant(ev.type)} className="shrink-0 text-xs">
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
              <div className="p-8 text-center text-sm text-muted-foreground">No recent events</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
