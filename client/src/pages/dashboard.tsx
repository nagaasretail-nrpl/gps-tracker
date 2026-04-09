import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car, Radio, AlertTriangle, Navigation, Activity, Clock,
  Gauge, Timer, MapPin, Wifi, WifiOff, ShieldAlert,
  TrendingUp, Zap, BarChart3, RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import type { Vehicle, Location } from "@shared/schema";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { getVehicleImg } from "@/lib/vehicleIcons";

interface FleetEvent {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  severity: string | null;
  timestamp: string;
}

interface EventsResponse {
  events: FleetEvent[];
  total: number;
  page: number;
  pageSize: number;
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

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="font-mono tabular-nums">
      {format(time, "HH:mm:ss")}
    </span>
  );
}

function PulseDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full h-2.5 w-2.5"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

function SpeedBar({ speed, max = 120 }: { speed: number; max?: number }) {
  const pct = Math.min(100, (speed / max) * 100);
  const color = speed > 80 ? "#dc2626" : speed > 40 ? "#ea580c" : "#16a34a";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-mono tabular-nums w-12 text-right" style={{ color }}>
        {speed.toFixed(0)} km/h
      </span>
    </div>
  );
}

const STATUS_COLORS = {
  active: "#16a34a",
  stopped: "#f59e0b",
  offline: "#94a3b8",
};

const GRAD = {
  blue: "from-blue-500 to-blue-700",
  green: "from-emerald-500 to-green-700",
  orange: "from-orange-400 to-orange-600",
  red: "from-red-500 to-red-700",
  purple: "from-violet-500 to-purple-700",
  teal: "from-teal-400 to-teal-600",
  indigo: "from-indigo-500 to-indigo-700",
  amber: "from-amber-400 to-amber-600",
};

function GradientStatCard({
  title, value, sub, icon: Icon, grad, testId,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  grad: string;
  testId?: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className={`bg-gradient-to-br ${grad} p-4 text-white`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80 uppercase tracking-wide truncate">{title}</p>
            <p className="text-3xl font-bold mt-1 tabular-nums" data-testid={testId}>{value}</p>
            {sub && <p className="text-xs text-white/70 mt-0.5 truncate">{sub}</p>}
          </div>
          <div className="p-2 bg-white/20 rounded-lg shrink-0">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  const REFRESH = 10_000;

  const { data: vehicles, isLoading: vehiclesLoading, dataUpdatedAt: vehiclesUpdated } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: REFRESH,
  });

  const { data: latestLocations, dataUpdatedAt: locUpdated } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
    refetchInterval: REFRESH,
  });

  const { data: eventsData, isLoading: eventsLoading } = useQuery<EventsResponse>({
    queryKey: ["/api/events"],
    refetchInterval: REFRESH,
    queryFn: async () => {
      const res = await fetch("/api/events?limit=50&page=1", { credentials: "include" });
      const json = await res.json();
      // Normalise: backend may return paginated object or legacy array
      if (Array.isArray(json)) return { events: json, total: json.length, page: 1, pageSize: json.length };
      return json as EventsResponse;
    },
  });
  const events = eventsData?.events ?? [];

  const { data: todaySegments, isLoading: segmentsLoading } = useQuery<TripSegment[]>({
    queryKey: ["/api/locations/trips", "dashboard-today", todayStart],
    queryFn: async () => {
      const params = new URLSearchParams({ startDate: todayStart, endDate: todayEnd });
      const res = await fetch(`/api/locations/trips?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    refetchInterval: REFRESH,
  });

  const total = vehicles?.length ?? 0;
  const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

  const active = vehicles?.filter(v => {
    if (v.status !== "active") return false;
    const loc = latestLocations?.find(l => l.vehicleId === v.id);
    return loc ? new Date(loc.timestamp).getTime() > thirtyMinAgo : false;
  }).length ?? 0;

  const stopped = vehicles?.filter(v => v.status === "stopped").length ?? 0;
  const offline = total - active - stopped;

  const pieData = [
    { name: "Active", value: active, color: STATUS_COLORS.active },
    { name: "Stopped", value: stopped, color: STATUS_COLORS.stopped },
    { name: "Offline", value: offline, color: STATUS_COLORS.offline },
  ].filter(d => d.value > 0);

  const onlineCount = vehicles?.filter(v => {
    const loc = latestLocations?.find(l => l.vehicleId === v.id);
    return loc ? new Date(loc.timestamp).getTime() > thirtyMinAgo : false;
  }).length ?? 0;

  const todayKm = todaySegments?.reduce((s, t) => s + t.distanceKm, 0) ?? 0;
  const todayIdleSec = todaySegments?.reduce((s, t) => s + t.idleTimeSec, 0) ?? 0;
  const todayMovingSec = todaySegments?.reduce((s, t) => s + Math.max(0, t.durationSec - t.idleTimeSec), 0) ?? 0;
  const todayTrips = todaySegments?.length ?? 0;
  const avgKmPerVehicle = total > 0 ? todayKm / total : 0;

  const todayTs = new Date(todayStart).getTime();
  const todayEvents = events?.filter(e => new Date(e.timestamp).getTime() >= todayTs) ?? [];
  const speedViolationsToday = todayEvents.filter(e => e.type === "speed_violation").length;
  const geofenceAlertsToday = todayEvents.filter(e => e.type === "geofence_entry" || e.type === "geofence_exit").length;
  const recentEvents = (events ?? []).slice(0, 10);
  const vehicleById = Object.fromEntries((vehicles ?? []).map(v => [v.id, v]));

  const lastUpdated = Math.max(vehiclesUpdated ?? 0, locUpdated ?? 0);

  const vehicleBarData = (vehicles ?? []).map(v => {
    const segs = todaySegments?.filter(s => s.vehicleId === v.id) ?? [];
    return {
      name: v.name.length > 10 ? v.name.slice(0, 10) + "…" : v.name,
      km: parseFloat(segs.reduce((s, t) => s + t.distanceKm, 0).toFixed(1)),
    };
  }).filter(d => d.km > 0);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-screen-xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold" data-testid="text-page-title">Fleet Dashboard</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
            <span>{format(today, "EEEE, d MMM yyyy")}</span>
            <span className="text-muted-foreground/40">·</span>
            <LiveClock />
            {lastUpdated > 0 && (
              <>
                <span className="text-muted-foreground/40">·</span>
                <RefreshCw className="h-3 w-3 text-green-500" />
                <span className="text-green-600 dark:text-green-400 text-xs">Live</span>
              </>
            )}
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/tracking">
            <Radio className="h-4 w-4 mr-2" />
            Live Tracking
          </Link>
        </Button>
      </div>

      {/* Hero stat cards — gradient row */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {segmentsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : (
          <>
            <GradientStatCard
              title="Total Distance Today"
              value={`${todayKm.toFixed(1)} km`}
              sub={`Avg ${avgKmPerVehicle.toFixed(1)} km / vehicle`}
              icon={Navigation}
              grad={GRAD.blue}
              testId="text-today-km"
            />
            <GradientStatCard
              title="Trips Today"
              value={todayTrips}
              sub="Detected trip segments"
              icon={TrendingUp}
              grad={GRAD.green}
              testId="text-today-trips"
            />
            <GradientStatCard
              title="Moving Time"
              value={formatDuration(todayMovingSec)}
              sub="Fleet-wide today"
              icon={Zap}
              grad={GRAD.purple}
            />
            <GradientStatCard
              title="Idle Time"
              value={formatDuration(todayIdleSec)}
              sub="Fleet-wide today"
              icon={Timer}
              grad={GRAD.amber}
              testId="text-today-idle"
            />
          </>
        )}
      </div>

      {/* Alert quick-stat row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-green-100 dark:bg-green-950 shrink-0">
              <Activity className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Active Now</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400 leading-tight" data-testid="text-active-vehicles">{active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-amber-100 dark:bg-amber-950 shrink-0">
              <Wifi className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Online (30m)</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight" data-testid="text-online-pct">{onlineCount}/{total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-red-100 dark:bg-red-950 shrink-0">
              <Gauge className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Overspeed</p>
              <p className={`text-2xl font-bold leading-tight ${speedViolationsToday > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid="text-overspeed-alerts">{speedViolationsToday}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-md bg-yellow-100 dark:bg-yellow-950 shrink-0">
              <ShieldAlert className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Geofence</p>
              <p className={`text-2xl font-bold leading-tight ${geofenceAlertsToday > 0 ? "text-yellow-600 dark:text-yellow-400" : ""}`} data-testid="text-geofence-alerts">{geofenceAlertsToday}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Middle row: Fleet Status donut + Distance bar chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Fleet Status donut */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-500" />
              Fleet Status
              <Badge variant="outline" className="ml-auto text-xs">{total} vehicles</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehiclesLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : total === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No vehicles</div>
            ) : (
              <div className="flex items-center gap-6">
                <div className="relative shrink-0">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={72}
                        dataKey="value"
                        strokeWidth={2}
                        stroke="hsl(var(--background))"
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number, name: string) => [v, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-3xl font-bold" data-testid="text-total-vehicles">{total}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Total</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 flex-1">
                  {[
                    { label: "Active", count: active, color: STATUS_COLORS.active },
                    { label: "Stopped", count: stopped, color: STATUS_COLORS.stopped },
                    { label: "Offline", count: offline, color: STATUS_COLORS.offline },
                  ].map(s => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="text-sm flex-1">{s.label}</span>
                      <span className="text-sm font-bold tabular-nums">{s.count}</span>
                      <span className="text-xs text-muted-foreground w-8 text-right">
                        {total > 0 ? `${Math.round((s.count / total) * 100)}%` : "—"}
                      </span>
                    </div>
                  ))}
                  <div className="mt-1 border-t pt-2">
                    <p className="text-xs text-muted-foreground">Online last 30m</p>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                          style={{ width: total > 0 ? `${(onlineCount / total) * 100}%` : "0%" }}
                        />
                      </div>
                      <span className="text-xs font-semibold tabular-nums">{onlineCount}/{total}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Distance per vehicle bar chart */}
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-violet-500" />
              Distance per Vehicle — Today
            </CardTitle>
          </CardHeader>
          <CardContent>
            {segmentsLoading ? (
              <Skeleton className="h-44 w-full" />
            ) : vehicleBarData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-sm text-muted-foreground">No trips yet today</div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={vehicleBarData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit=" km" />
                  <Tooltip formatter={(v: number) => [`${v} km`, "Distance"]} />
                  <Bar dataKey="km" radius={[4, 4, 0, 0]}>
                    {vehicleBarData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"][i % 6]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle list + Recent Events */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Vehicle Status — live speed bars */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Car className="h-4 w-4 text-blue-500" />
              Vehicle Status
              <span className="ml-auto flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-normal">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Live
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vehiclesLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : vehicles && vehicles.length > 0 ? (
              <div className="divide-y max-h-80 overflow-y-auto">
                {vehicles.map(v => {
                  const loc = latestLocations?.find(l => l.vehicleId === v.id);
                  const speed = parseFloat(String(loc?.speed ?? "0")) || 0;
                  const isOnline = loc ? new Date(loc.timestamp).getTime() > thirtyMinAgo : false;
                  const dotColor = v.status === "active"
                    ? STATUS_COLORS.active
                    : v.status === "stopped"
                    ? STATUS_COLORS.stopped
                    : STATUS_COLORS.offline;
                  const segsToday = todaySegments?.filter(s => s.vehicleId === v.id) ?? [];
                  const kmToday = segsToday.reduce((s, t) => s + t.distanceKm, 0);
                  const vehicleImg = getVehicleImg(v.type ?? "car");

                  return (
                    <div
                      key={v.id}
                      className="px-4 py-3 gap-2"
                      data-testid={`row-vehicle-${v.id}`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="relative shrink-0">
                            <div className={`w-10 h-10 rounded-lg bg-neutral-900 flex items-center justify-center overflow-hidden ${v.status !== "active" ? "opacity-40" : ""}`}>
                              <img
                                src={vehicleImg ?? undefined}
                                alt={v.type ?? "car"}
                                className="w-9 h-9 object-contain"
                              />
                            </div>
                            {v.status === "active" && (
                              <span className="absolute -bottom-0.5 -right-0.5">
                                <PulseDot color={dotColor} />
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">{v.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {loc ? formatAgo(loc.timestamp) : "No data"} · {kmToday.toFixed(1)} km today
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isOnline
                            ? <Wifi className="h-3.5 w-3.5 text-green-500" />
                            : <WifiOff className="h-3.5 w-3.5 text-muted-foreground/40" />
                          }
                          <Badge
                            variant={v.status === "active" ? "default" : v.status === "stopped" ? "secondary" : "outline"}
                            className={
                              v.status === "active"
                                ? "bg-green-600 text-white border-0"
                                : v.status === "stopped"
                                ? "bg-amber-500 text-white border-0"
                                : ""
                            }
                          >
                            {v.status}
                          </Badge>
                        </div>
                      </div>
                      <SpeedBar speed={speed} />
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
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Recent Events
              {todayEvents.length > 0 && (
                <Badge variant="destructive" className="ml-auto text-xs">{todayEvents.length} today</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {eventsLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentEvents.length > 0 ? (
              <div className="divide-y max-h-80 overflow-y-auto">
                {recentEvents.map(ev => {
                  const vehicle = vehicleById[ev.vehicleId];
                  const isAlert = ev.type === "speed_violation";
                  const isGeo = ev.type === "geofence_entry" || ev.type === "geofence_exit";
                  return (
                    <div
                      key={ev.id}
                      className="px-4 py-2.5"
                      data-testid={`row-event-${ev.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className={`mt-0.5 p-1 rounded shrink-0 ${
                            isAlert ? "bg-red-100 dark:bg-red-950" :
                            isGeo ? "bg-yellow-100 dark:bg-yellow-950" :
                            "bg-muted"
                          }`}>
                            {isAlert
                              ? <Gauge className="h-3 w-3 text-red-500" />
                              : isGeo
                              ? <MapPin className="h-3 w-3 text-yellow-500" />
                              : <Activity className="h-3 w-3 text-muted-foreground" />
                            }
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold truncate">{vehicle?.name ?? "Unknown"}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{ev.description}</p>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <Badge
                            variant={isAlert ? "destructive" : isGeo ? "secondary" : "outline"}
                            className="text-[10px] mb-1"
                          >
                            {ev.type.replace(/_/g, " ")}
                          </Badge>
                          <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatAgo(ev.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                No recent events
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer quick link */}
      <div className="flex items-center justify-center gap-4 py-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/reports">
            <BarChart3 className="h-4 w-4 mr-2" />
            Full Reports
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/tracking">
            <MapPin className="h-4 w-4 mr-2" />
            Fleet Map
          </Link>
        </Button>
      </div>

      {/* Copyright footer */}
      <div className="border-t pt-4 pb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span data-testid="text-copyright">© 2025 Nagaas Retail Private Limited. All Rights Reserved.</span>
        <span className="hidden sm:inline text-muted-foreground/40">·</span>
        <Link href="/terms" className="hover:text-foreground transition-colors" data-testid="link-terms">Terms &amp; Conditions</Link>
        <span className="text-muted-foreground/40">·</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">Privacy Policy</Link>
      </div>

    </div>
  );
}
