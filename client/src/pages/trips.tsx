import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Car,
  Clock,
  MapPin,
  Calendar as CalendarIcon,
  Navigation,
  Gauge,
  TimerOff,
  ParkingCircle,
  ChevronDown,
  ChevronRight,
  Timer,
  Play,
} from "lucide-react";
import { format, subDays } from "date-fns";
import type { Vehicle } from "@shared/schema";

interface TripSegment {
  vehicleId: string;
  date: string;
  startTime: string;
  endTime: string;
  startLat: number;
  startLng: number;
  startAddress: string | null;
  endLat: number;
  endLng: number;
  endAddress: string | null;
  distanceKm: number;
  durationSec: number;
  idleTimeSec: number;
  stopCount: number;
  avgSpeedKmh: number;
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

function formatCoords(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDay(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return format(d, "EEE, d MMM yyyy");
  } catch {
    return dateStr;
  }
}

function todayRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

export default function Trips() {
  const [, navigate] = useLocation();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(todayRange);
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const { data: vehicles } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const qparams = new URLSearchParams({
    startDate: dateRange.from.toISOString(),
    endDate: dateRange.to.toISOString(),
    ...(selectedVehicle !== "all" ? { vehicleId: selectedVehicle } : {}),
  });

  const { data: segments, isLoading } = useQuery<TripSegment[]>({
    queryKey: ["/api/locations/trips", selectedVehicle, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async () => {
      const res = await fetch(`/api/locations/trips?${qparams}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load trips");
      return res.json();
    },
    staleTime: 60000,
  });

  const getVehicleName = (vid: string) => vehicles?.find(v => v.id === vid)?.name ?? vid;
  const getVehicleColor = (vid: string) => vehicles?.find(v => v.id === vid)?.iconColor ?? "#2563eb";

  const grouped = useMemo(() => {
    if (!segments) return {};
    const out: Record<string, Record<string, TripSegment[]>> = {};
    for (const seg of segments) {
      if (!out[seg.vehicleId]) out[seg.vehicleId] = {};
      if (!out[seg.vehicleId][seg.date]) out[seg.vehicleId][seg.date] = [];
      out[seg.vehicleId][seg.date].push(seg);
    }
    for (const vid in out) {
      for (const day in out[vid]) {
        out[vid][day].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
      }
    }
    return out;
  }, [segments]);

  const vehicleIds = Object.keys(grouped);

  const totalTrips = segments?.length ?? 0;
  const totalDistance = segments?.reduce((s, t) => s + t.distanceKm, 0) ?? 0;
  const totalDuration = segments?.reduce((s, t) => s + Math.max(0, t.durationSec - t.idleTimeSec), 0) ?? 0;
  const avgSpeed = segments && segments.length > 0
    ? segments.reduce((s, t) => s + t.avgSpeedKmh, 0) / segments.length
    : 0;

  const toggleDay = (key: string) => setExpandedDays(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1" data-testid="text-page-title">Trip History</h1>
        <p className="text-sm text-muted-foreground">Per-vehicle daily trip segments with start/end, distance, idle time and stops</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Vehicle</label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger data-testid="select-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {vehicles?.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left" data-testid="button-date-range">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-3 space-y-2">
                    {[
                      { label: "Today", days: 0 },
                      { label: "Last 7 Days", days: 7 },
                      { label: "Last 30 Days", days: 30 },
                      { label: "Last 90 Days", days: 90 },
                    ].map(({ label, days }) => (
                      <Button
                        key={label}
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setDateRange({ from: days === 0 ? new Date(new Date().setHours(0,0,0,0)) : subDays(new Date(), days), to: new Date() })}
                        data-testid={`button-filter-${label.toLowerCase().replace(" ", "-")}`}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-trips">{totalTrips}</div>
            <p className="text-xs text-muted-foreground mt-1">Segments in period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-distance">{formatDistance(totalDistance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all trips</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-duration">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground mt-1">Moving time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-speed">{avgSpeed.toFixed(1)} km/h</div>
            <p className="text-xs text-muted-foreground mt-1">Average across trips</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4" data-testid="loading-trips">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-6 w-1/3 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : vehicleIds.length === 0 ? (
        <div className="text-center py-16" data-testid="empty-state-trips">
          <MapPin className="h-14 w-14 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No trips found</h3>
          <p className="text-sm text-muted-foreground">No location data with movement was recorded for the selected vehicle and date range.</p>
          <p className="text-xs text-muted-foreground mt-1">Try expanding the date range or selecting a different vehicle.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {vehicleIds.map(vid => {
            const color = getVehicleColor(vid);
            const name = getVehicleName(vid);
            const days = Object.keys(grouped[vid]).sort().reverse();
            const vehicleTotal = days.reduce((s, d) => s + grouped[vid][d].length, 0);
            return (
              <div key={vid} data-testid={`section-vehicle-${vid}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                  <Car className="h-4 w-4 text-muted-foreground" />
                  <h2 className="font-semibold text-base">{name}</h2>
                  <Badge variant="secondary" className="ml-1">{vehicleTotal} trip{vehicleTotal !== 1 ? "s" : ""}</Badge>
                </div>

                <div className="space-y-3 pl-5">
                  {days.map(day => {
                    const dayKey = `${vid}-${day}`;
                    const daySegs = grouped[vid][day];
                    const isOpen = expandedDays[dayKey] === true;
                    const dayDist = daySegs.reduce((s, t) => s + t.distanceKm, 0);
                    return (
                      <div key={day} data-testid={`section-day-${dayKey}`}>
                        <button
                          type="button"
                          className="flex items-center gap-2 w-full text-left py-1.5 hover-elevate rounded-md px-1"
                          onClick={() => toggleDay(dayKey)}
                          data-testid={`button-toggle-day-${dayKey}`}
                        >
                          {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                          <span className="font-medium text-sm">{formatDay(day)}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{daySegs.length} trip{daySegs.length !== 1 ? "s" : ""} · {formatDistance(dayDist)}</span>
                        </button>

                        {isOpen && (
                          <div className="mt-2 space-y-2 pl-5">
                            {daySegs.map((seg, idx) => (
                              <Card key={idx} data-testid={`card-trip-${vid}-${day}-${idx}`}>
                                <CardContent className="pt-4 pb-4 px-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <Badge variant="outline" className="font-semibold text-xs">Trip {idx + 1}</Badge>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs text-muted-foreground">
                                        {formatTime(seg.startTime)} – {formatTime(seg.endTime)}
                                      </span>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        title="Playback this trip"
                                        data-testid={`button-playback-${vid}-${day}-${idx}`}
                                        onClick={() => {
                                          const params = new URLSearchParams({
                                            vehicleId: seg.vehicleId,
                                            from: seg.startTime,
                                            to: seg.endTime,
                                            autoplay: "1",
                                          });
                                          navigate(`/history?${params.toString()}`);
                                        }}
                                      >
                                        <Play className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </div>

                                  <div className="space-y-2 mb-3">
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-600 dark:text-green-400" />
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">Start</p>
                                        <p className="text-sm font-medium truncate" data-testid={`text-trip-start-${vid}-${day}-${idx}`}>
                                          {seg.startAddress || formatCoords(seg.startLat, seg.startLng)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatCoords(seg.startLat, seg.startLng)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-2">
                                      <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600 dark:text-red-400" />
                                      <div className="min-w-0">
                                        <p className="text-xs text-muted-foreground">End</p>
                                        <p className="text-sm font-medium truncate" data-testid={`text-trip-end-${vid}-${day}-${idx}`}>
                                          {seg.endAddress || formatCoords(seg.endLat, seg.endLng)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{formatCoords(seg.endLat, seg.endLng)}</p>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t">
                                    <div className="flex items-center gap-1.5">
                                      <Navigation className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Distance</p>
                                        <p className="text-sm font-semibold" data-testid={`text-trip-distance-${vid}-${day}-${idx}`}>{formatDistance(seg.distanceKm)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Timer className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Moving</p>
                                        <p className="text-sm font-semibold" data-testid={`text-trip-moving-${vid}-${day}-${idx}`}>{formatDuration(Math.max(0, seg.durationSec - seg.idleTimeSec))}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <TimerOff className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Idle</p>
                                        <p className="text-sm font-semibold" data-testid={`text-trip-idle-${vid}-${day}-${idx}`}>{formatDuration(seg.idleTimeSec)}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <ParkingCircle className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Stops</p>
                                        <p className="text-sm font-semibold" data-testid={`text-trip-stops-${vid}-${day}-${idx}`}>{seg.stopCount}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Gauge className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Avg Speed</p>
                                        <p className="text-sm font-semibold" data-testid={`text-trip-speed-${vid}-${day}-${idx}`}>{seg.avgSpeedKmh.toFixed(1)} km/h</p>
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
