import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CalendarIcon,
  Download,
  FileText,
  TrendingUp,
  Navigation,
  Timer,
  Car,
  CalendarDays,
  Gauge,
} from "lucide-react";
import { format, subDays } from "date-fns";
import type { Vehicle } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}


interface MileageRow {
  vehicleId: string;
  name: string;
  tripCount: number;
  totalKm: number;
  movingSec: number;
  idleSec: number;
  avgSpeedKmh: number;
}

interface MileageViewProps {
  segments: TripSegment[];
  vehicles: Vehicle[];
  isLoading: boolean;
}

function MileageView({ segments, vehicles, isLoading }: MileageViewProps) {
  const rows: MileageRow[] = useMemo(() => {
    const map = new Map<string, MileageRow>();
    for (const seg of segments) {
      if (!map.has(seg.vehicleId)) {
        const v = vehicles.find(veh => veh.id === seg.vehicleId);
        map.set(seg.vehicleId, {
          vehicleId: seg.vehicleId,
          name: v?.name || seg.vehicleId,
          tripCount: 0,
          totalKm: 0,
          movingSec: 0,
          idleSec: 0,
          avgSpeedKmh: 0,
        });
      }
      const row = map.get(seg.vehicleId)!;
      row.tripCount += 1;
      row.totalKm += seg.distanceKm;
      row.movingSec += Math.max(0, seg.durationSec - seg.idleTimeSec);
      row.idleSec += seg.idleTimeSec;
      row.avgSpeedKmh += seg.avgSpeedKmh;
    }
    // Finalise avg speed
    for (const row of map.values()) {
      if (row.tripCount > 0) row.avgSpeedKmh = row.avgSpeedKmh / row.tripCount;
    }
    return Array.from(map.values()).sort((a, b) => b.totalKm - a.totalKm);
  }, [segments, vehicles]);

  const totalFleetKm = rows.reduce((s, r) => s + r.totalKm, 0);
  const vehiclesActive = rows.length;
  const avgPerVehicle = vehiclesActive > 0 ? totalFleetKm / vehiclesActive : 0;

  const exportCSV = () => {
    const headers = ["Vehicle", "Trips", "Distance (km)", "Moving Time", "Idle Time", "Avg Speed (km/h)", "Est. Fuel (L)"];
    const csvRows = rows.map(r => [
      r.name,
      r.tripCount,
      r.totalKm.toFixed(2),
      formatDuration(r.movingSec),
      formatDuration(r.idleSec),
      r.avgSpeedKmh.toFixed(1),
      "—",
    ]);
    downloadCSV(headers, csvRows, `mileage-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Total Fleet Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-total-distance">
                {totalFleetKm.toFixed(2)} km
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Vehicles Active</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-vehicles-active">
                {vehiclesActive}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Avg Distance / Vehicle</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-avg-distance">
                {avgPerVehicle.toFixed(2)} km
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Mileage by Vehicle</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={rows.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-center">Trips</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Moving Time</TableHead>
                    <TableHead>Idle Time</TableHead>
                    <TableHead>Avg Speed</TableHead>
                    <TableHead>Est. Fuel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => {
                    return (
                      <TableRow key={r.vehicleId} data-testid={`row-mileage-${i}`}>
                        <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                        <TableCell className="text-center">{r.tripCount}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{r.totalKm.toFixed(2)} km</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDuration(r.movingSec)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(r.idleSec)}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.avgSpeedKmh.toFixed(1)} km/h</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">—</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </>
  );
}


interface ActivityRow {
  date: string;
  tripCount: number;
  movingSec: number;
  idleSec: number;
  totalKm: number;
  vehicleIds: Set<string>;
}

interface ActivityViewProps {
  segments: TripSegment[];
  isLoading: boolean;
}

function ActivityView({ segments, isLoading }: ActivityViewProps) {
  const rows: ActivityRow[] = useMemo(() => {
    const map = new Map<string, ActivityRow>();
    for (const seg of segments) {
      if (!map.has(seg.date)) {
        map.set(seg.date, {
          date: seg.date,
          tripCount: 0,
          movingSec: 0,
          idleSec: 0,
          totalKm: 0,
          vehicleIds: new Set(),
        });
      }
      const row = map.get(seg.date)!;
      row.tripCount += 1;
      row.movingSec += Math.max(0, seg.durationSec - seg.idleTimeSec);
      row.idleSec += seg.idleTimeSec;
      row.totalKm += seg.distanceKm;
      row.vehicleIds.add(seg.vehicleId);
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [segments]);

  const activeDays = rows.length;
  const totalMovingSec = rows.reduce((s, r) => s + r.movingSec, 0);
  const totalIdleSec = rows.reduce((s, r) => s + r.idleSec, 0);

  const chartData = rows.map(r => ({
    date: r.date,
    distance: Math.round(r.totalKm * 10) / 10,
  }));

  const exportCSV = () => {
    const headers = ["Date", "Trips", "Moving Time", "Idle Time", "Total Distance (km)", "Vehicles Active"];
    const csvRows = rows.map(r => [
      r.date,
      r.tripCount,
      formatDuration(r.movingSec),
      formatDuration(r.idleSec),
      r.totalKm.toFixed(2),
      r.vehicleIds.size,
    ]);
    downloadCSV(headers, csvRows, `activity-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Active Days</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-activity-active-days">
                {activeDays}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Total Moving Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-activity-moving-time">
                {formatDuration(totalMovingSec)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Total Idle Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-activity-idle-time">
                {formatDuration(totalIdleSec)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar chart: per-day total distance */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Daily Fleet Distance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis unit=" km" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} km`, "Distance"]} />
                <Bar dataKey="distance" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Activity by Day</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={rows.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : rows.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-center">Trips</TableHead>
                    <TableHead>Moving Time</TableHead>
                    <TableHead>Idle Time</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead className="text-center">Vehicles Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.date} data-testid={`row-activity-${i}`}>
                      <TableCell className="font-medium whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="text-center">{r.tripCount}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDuration(r.movingSec)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(r.idleSec)}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.totalKm.toFixed(2)} km</TableCell>
                      <TableCell className="text-center">{r.vehicleIds.size}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </>
  );
}


interface TripViewProps {
  segments: TripSegment[];
  vehicles: Vehicle[];
  isLoading: boolean;
}

function TripView({ segments, vehicles, isLoading }: TripViewProps) {
  const totalDistance = segments.reduce((s, t) => s + t.distanceKm, 0);
  const totalMovingSec = segments.reduce((s, t) => s + Math.max(0, t.durationSec - t.idleTimeSec), 0);
  const avgSpeed = segments.length > 0
    ? segments.reduce((s, t) => s + t.avgSpeedKmh, 0) / segments.length
    : 0;

  const chartData = segments.slice(0, 15).map((seg) => ({
    name: format(new Date(seg.startTime), "MM/dd HH:mm"),
    distance: Math.round(seg.distanceKm * 10) / 10,
  }));

  const exportCSV = () => {
    if (segments.length === 0) return;
    const headers = ["Vehicle", "Date", "Start Time", "End Time", "Distance (km)", "Moving (min)", "Idle (min)", "Stops", "Avg Speed (km/h)", "Start Location", "End Location"];
    const rows = segments.map(seg => {
      const vehicle = vehicles.find(v => v.id === seg.vehicleId);
      const movingMin = Math.round(Math.max(0, seg.durationSec - seg.idleTimeSec) / 60);
      const idleMin = Math.round(seg.idleTimeSec / 60);
      return [
        vehicle?.name || seg.vehicleId,
        seg.date,
        format(new Date(seg.startTime), "HH:mm:ss"),
        format(new Date(seg.endTime), "HH:mm:ss"),
        seg.distanceKm.toFixed(2),
        movingMin,
        idleMin,
        seg.stopCount,
        seg.avgSpeedKmh.toFixed(1),
        seg.startAddress || `${seg.startLat.toFixed(5)}, ${seg.startLng.toFixed(5)}`,
        seg.endAddress || `${seg.endLat.toFixed(5)}, ${seg.endLng.toFixed(5)}`,
      ];
    });
    downloadCSV(headers, rows, `trip-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-trips">{segments.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-distance">{totalDistance.toFixed(2)} km</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Moving Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-duration">{formatDuration(totalMovingSec)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-avg-speed">{avgSpeed.toFixed(1)} km/h</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distance per Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis unit=" km" tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => [`${v} km`, "Distance"]} />
                <Bar dataKey="distance" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Trip detail table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Trip Details</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={segments.length === 0}
              data-testid="button-export-csv"
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : segments.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Distance</TableHead>
                    <TableHead>Moving</TableHead>
                    <TableHead>Idle</TableHead>
                    <TableHead>Stops</TableHead>
                    <TableHead>Avg Speed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.map((seg, i) => {
                    const vehicle = vehicles.find(v => v.id === seg.vehicleId);
                    const movingSec = Math.max(0, seg.durationSec - seg.idleTimeSec);
                    return (
                      <TableRow key={i} data-testid={`row-report-trip-${i}`}>
                        <TableCell className="font-medium whitespace-nowrap">{vehicle?.name || seg.vehicleId}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{seg.date}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(seg.startTime), "HH:mm")}</TableCell>
                        <TableCell className="whitespace-nowrap">{format(new Date(seg.endTime), "HH:mm")}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{seg.distanceKm.toFixed(2)} km</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDuration(movingSec)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(seg.idleTimeSec)}</TableCell>
                        <TableCell className="text-center">{seg.stopCount}</TableCell>
                        <TableCell className="whitespace-nowrap">{seg.avgSpeedKmh.toFixed(1)} km/h</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <EmptyState />
          )}
        </CardContent>
      </Card>
    </>
  );
}


function EmptyState() {
  return (
    <div className="text-center py-12">
      <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-foreground mb-1">No data found</p>
      <p className="text-xs text-muted-foreground">Try adjusting your filters or date range</p>
    </div>
  );
}


export default function Reports() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(() => subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(() => new Date());
  const [reportType, setReportType] = useState<string>("trips");

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: segments, isLoading: segmentsLoading } = useQuery<TripSegment[]>({
    queryKey: ["/api/locations/trips", selectedVehicle, startDate?.toISOString(), endDate?.toISOString()],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVehicle && selectedVehicle !== "all") params.set("vehicleId", selectedVehicle);
      params.set("startDate", startDate.toISOString());
      params.set("endDate", endDate.toISOString());
      const res = await fetch(`/api/locations/trips?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!startDate && !!endDate,
  });

  const isLoading = vehiclesLoading || segmentsLoading;
  const safeSegments = segments ?? [];
  const safeVehicles = vehicles ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate detailed reports for your fleet
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label htmlFor="report-type">Report Type</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger id="report-type" data-testid="select-report-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trips">Trip Reports</SelectItem>
                  <SelectItem value="mileage">Mileage Reports</SelectItem>
                  <SelectItem value="activity">Activity Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle" data-testid="select-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Vehicles</SelectItem>
                  {safeVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-start-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-1">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-end-date"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conditional report view */}
      {reportType === "mileage" ? (
        <MileageView segments={safeSegments} vehicles={safeVehicles} isLoading={isLoading} />
      ) : reportType === "activity" ? (
        <ActivityView segments={safeSegments} isLoading={isLoading} />
      ) : (
        <TripView segments={safeSegments} vehicles={safeVehicles} isLoading={isLoading} />
      )}
    </div>
  );
}
