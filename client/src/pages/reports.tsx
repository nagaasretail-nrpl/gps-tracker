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
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Navigation,
  Timer,
  CalendarDays,
  Gauge,
  Fuel,
  Banknote,
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
import * as XLSX from "xlsx";

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

function downloadExcel(
  headers: string[],
  rows: (string | number)[][],
  filename: string,
  meta?: string[],
  totals?: (string | number)[],
) {
  const wsData: (string | number)[][] = [];
  if (meta && meta.length > 0) {
    meta.forEach(m => wsData.push([m]));
    wsData.push([]);
  }
  wsData.push(headers);
  rows.forEach(r => wsData.push(r));
  if (totals && totals.length > 0) {
    wsData.push([]);
    wsData.push(totals);
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, filename);
}


interface MileageRow {
  vehicleId: string;
  name: string;
  tripCount: number;
  totalKm: number;
  movingSec: number;
  idleSec: number;
  avgSpeedKmh: number;
  fuelEfficiency: number | null;
  fuelRatePerLiter: number | null;
  fuelTankCapacity: number | null;
}

interface MileageViewProps {
  segments: TripSegment[];
  vehicles: Vehicle[];
  isLoading: boolean;
  selectedVehicle: string;
  startDate: Date;
  endDate: Date;
}

function MileageView({ segments, vehicles, isLoading, selectedVehicle, startDate, endDate }: MileageViewProps) {
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
          fuelEfficiency: v?.fuelEfficiency != null ? parseFloat(String(v.fuelEfficiency)) : null,
          fuelRatePerLiter: v?.fuelRatePerLiter != null ? parseFloat(String(v.fuelRatePerLiter)) : null,
          fuelTankCapacity: v?.fuelTankCapacity != null ? parseFloat(String(v.fuelTankCapacity)) : null,
        });
      }
      const row = map.get(seg.vehicleId)!;
      row.tripCount += 1;
      row.totalKm += seg.distanceKm;
      row.movingSec += Math.max(0, seg.durationSec - seg.idleTimeSec);
      row.idleSec += seg.idleTimeSec;
      row.avgSpeedKmh += seg.avgSpeedKmh;
    }
    Array.from(map.values()).forEach(row => {
      if (row.tripCount > 0) row.avgSpeedKmh = row.avgSpeedKmh / row.tripCount;
    });
    return Array.from(map.values()).sort((a, b) => b.totalKm - a.totalKm);
  }, [segments, vehicles]);

  const totalFleetKm = rows.reduce((s, r) => s + r.totalKm, 0);
  const totalTrips = rows.reduce((s, r) => s + r.tripCount, 0);
  const totalMovingSec = rows.reduce((s, r) => s + r.movingSec, 0);
  const totalIdleSec = rows.reduce((s, r) => s + r.idleSec, 0);
  const avgSpeed = rows.length > 0 ? rows.reduce((s, r) => s + r.avgSpeedKmh, 0) / rows.length : 0;

  const totalEstFuel = rows.reduce((s, r) => {
    if (r.fuelEfficiency && r.fuelEfficiency > 0) return s + r.totalKm / r.fuelEfficiency;
    return s;
  }, 0);
  const hasFuelData = rows.some(r => r.fuelEfficiency != null);

  const totalEstCost = rows.reduce((s, r) => {
    if (r.fuelEfficiency && r.fuelEfficiency > 0 && r.fuelRatePerLiter && r.fuelRatePerLiter > 0) {
      return s + (r.totalKm / r.fuelEfficiency) * r.fuelRatePerLiter;
    }
    return s;
  }, 0);
  const hasCostData = rows.some(r => r.fuelEfficiency != null && r.fuelRatePerLiter != null);

  const costPerKmTotal = totalFleetKm > 0 && hasCostData ? totalEstCost / totalFleetKm : null;

  const fleetRangeValues = rows.filter(r => r.fuelEfficiency && r.fuelTankCapacity).map(r => r.fuelEfficiency! * r.fuelTankCapacity!);
  const avgFleetRange = fleetRangeValues.length > 0 ? fleetRangeValues.reduce((s, v) => s + v, 0) / fleetRangeValues.length : null;

  const getRowFuel = (r: MileageRow) => r.fuelEfficiency ? r.totalKm / r.fuelEfficiency : null;
  const getRowCost = (r: MileageRow) => {
    const fuel = getRowFuel(r);
    return fuel != null && r.fuelRatePerLiter ? fuel * r.fuelRatePerLiter : null;
  };
  const getRowCostPerKm = (r: MileageRow) => {
    const cost = getRowCost(r);
    return cost != null && r.totalKm > 0 ? cost / r.totalKm : null;
  };
  const getRowRange = (r: MileageRow) => r.fuelEfficiency && r.fuelTankCapacity ? r.fuelEfficiency * r.fuelTankCapacity : null;

  const dateStr = format(new Date(), "yyyy-MM-dd");

  const vehicleName = selectedVehicle === "all" ? "All Vehicles" : (vehicles.find(v => v.id === selectedVehicle)?.name ?? selectedVehicle);
  const metaLines = [
    `Mileage Report`,
    `Vehicle: ${vehicleName}`,
    `Date Range: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
  ];

  const buildRows = () => rows.map(r => {
    const fuel = getRowFuel(r);
    const cost = getRowCost(r);
    const cpk = getRowCostPerKm(r);
    const range = getRowRange(r);
    return [
      r.name,
      r.tripCount,
      r.totalKm.toFixed(2),
      formatDuration(r.movingSec),
      formatDuration(r.idleSec),
      r.avgSpeedKmh.toFixed(1),
      fuel != null ? fuel.toFixed(1) : "—",
      cost != null ? cost.toFixed(2) : "—",
      cpk != null ? cpk.toFixed(3) : "—",
      range != null ? range.toFixed(1) : "—",
    ] as (string | number)[];
  });

  const exportHeaders = ["Vehicle", "Trips", "Distance (km)", "Moving Time", "Idle Time", "Avg Speed (km/h)", "Est. Fuel (L)", "Est. Fuel Cost", "Cost/km", "Tank Range (km)"];

  const buildTotalsRow = (): (string | number)[] => [
    "TOTAL",
    totalTrips,
    `${totalFleetKm.toFixed(2)} km`,
    formatDuration(totalMovingSec),
    formatDuration(totalIdleSec),
    `${avgSpeed.toFixed(1)} km/h`,
    hasFuelData ? `${totalEstFuel.toFixed(1)} L` : "—",
    hasCostData ? totalEstCost.toFixed(2) : "—",
    costPerKmTotal != null ? costPerKmTotal.toFixed(3) : "—",
    avgFleetRange != null ? `${avgFleetRange.toFixed(0)} km` : "—",
  ];

  const exportCSV = () => {
    downloadCSV(exportHeaders, buildRows(), `mileage-report-${dateStr}.csv`);
  };

  const exportExcel = () => {
    downloadExcel(exportHeaders, buildRows(), `mileage-report-${dateStr}.xlsx`, metaLines, buildTotalsRow());
  };

  return (
    <>
      {/* Summary cards — 10 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Total Trips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-total-trips">{totalTrips}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Fleet Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-total-distance">
                {totalFleetKm.toFixed(1)} km
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Total Duration</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-total-duration">
                {formatDuration(totalMovingSec + totalIdleSec)}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Moving Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-moving-time">{formatDuration(totalMovingSec)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Idle Time</CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-idle-time">{formatDuration(totalIdleSec)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Avg Speed</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-avg-speed">{avgSpeed.toFixed(1)} km/h</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Cost / km</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-cost-per-km">
                {costPerKmTotal != null ? costPerKmTotal.toFixed(3) : "—"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Tank Range</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-tank-range">
                {avgFleetRange != null ? `${avgFleetRange.toFixed(0)} km` : "—"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Est. Fuel Used</CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-est-fuel">
                {hasFuelData ? `${totalEstFuel.toFixed(1)} L` : "—"}
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2 flex-wrap">
            <CardTitle className="text-xs font-medium">Est. Fuel Cost</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-20" /> : (
              <div className="text-2xl font-bold" data-testid="text-mileage-est-cost">
                {hasCostData ? totalEstCost.toFixed(2) : "—"}
              </div>
            )}
            {hasCostData && costPerKmTotal != null && (
              <p className="text-xs text-muted-foreground mt-1">{costPerKmTotal.toFixed(3)}/km</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle>Mileage by Vehicle</CardTitle>
            <div className="flex gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={rows.length === 0}
                data-testid="button-export-excel"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
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
                    <TableHead>Est. Fuel (L)</TableHead>
                    <TableHead>Est. Cost</TableHead>
                    <TableHead>Cost/km</TableHead>
                    <TableHead>Tank Range</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? rows.map((r, i) => {
                    const fuel = getRowFuel(r);
                    const cost = getRowCost(r);
                    const cpk = getRowCostPerKm(r);
                    const range = getRowRange(r);
                    return (
                      <TableRow key={r.vehicleId} data-testid={`row-mileage-${i}`}>
                        <TableCell className="font-medium whitespace-nowrap">{r.name}</TableCell>
                        <TableCell className="text-center">{r.tripCount}</TableCell>
                        <TableCell className="whitespace-nowrap font-medium">{r.totalKm.toFixed(2)} km</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDuration(r.movingSec)}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(r.idleSec)}</TableCell>
                        <TableCell className="whitespace-nowrap">{r.avgSpeedKmh.toFixed(1)} km/h</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fuel != null ? fuel.toFixed(1) : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{cost != null ? cost.toFixed(2) : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{cpk != null ? cpk.toFixed(3) : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{range != null ? `${range.toFixed(0)} km` : "—"}</TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12 text-muted-foreground text-sm">
                        No data found. Try adjusting the date range or vehicle filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
  fuelUsedL: number | null;
  fuelCost: number | null;
}

interface ActivityViewProps {
  segments: TripSegment[];
  vehicles: Vehicle[];
  isLoading: boolean;
  selectedVehicle: string;
  startDate: Date;
  endDate: Date;
}

function ActivityView({ segments, vehicles, isLoading, selectedVehicle, startDate, endDate }: ActivityViewProps) {
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
          fuelUsedL: null,
          fuelCost: null,
        });
      }
      const row = map.get(seg.date)!;
      row.tripCount += 1;
      row.movingSec += Math.max(0, seg.durationSec - seg.idleTimeSec);
      row.idleSec += seg.idleTimeSec;
      row.totalKm += seg.distanceKm;
      row.vehicleIds.add(seg.vehicleId);

      const v = vehicles.find(veh => veh.id === seg.vehicleId);
      const eff = v?.fuelEfficiency != null ? parseFloat(String(v.fuelEfficiency)) : null;
      const rate = v?.fuelRatePerLiter != null ? parseFloat(String(v.fuelRatePerLiter)) : null;
      if (eff && eff > 0) {
        const fuel = seg.distanceKm / eff;
        row.fuelUsedL = (row.fuelUsedL ?? 0) + fuel;
        if (rate && rate > 0) {
          row.fuelCost = (row.fuelCost ?? 0) + fuel * rate;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [segments, vehicles]);

  const activeDays = rows.length;
  const totalMovingSec = rows.reduce((s, r) => s + r.movingSec, 0);
  const totalIdleSec = rows.reduce((s, r) => s + r.idleSec, 0);

  const chartData = rows.map(r => ({
    date: r.date,
    distance: Math.round(r.totalKm * 10) / 10,
  }));

  const totalActivityKm = rows.reduce((s, r) => s + r.totalKm, 0);
  const totalActivityTrips = rows.reduce((s, r) => s + r.tripCount, 0);
  const totalActivityMovingSec = rows.reduce((s, r) => s + r.movingSec, 0);
  const totalActivityIdleSec = rows.reduce((s, r) => s + r.idleSec, 0);
  const totalActivityFuel = rows.reduce((s, r) => r.fuelUsedL != null ? s + r.fuelUsedL : s, 0);
  const totalActivityCost = rows.reduce((s, r) => r.fuelCost != null ? s + r.fuelCost : s, 0);
  const hasActivityFuel = rows.some(r => r.fuelUsedL != null);
  const hasActivityCost = rows.some(r => r.fuelCost != null);

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const exportHeaders = ["Date", "Trips", "Moving Time", "Idle Time", "Total Distance (km)", "Vehicles Active", "Fuel Used (L)", "Fuel Cost"];

  const vehicleName = selectedVehicle === "all" ? "All Vehicles" : (vehicles.find(v => v.id === selectedVehicle)?.name ?? selectedVehicle);
  const metaLines = [
    `Activity Report`,
    `Vehicle: ${vehicleName}`,
    `Date Range: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
  ];

  const buildRows = () => rows.map(r => [
    r.date,
    r.tripCount,
    formatDuration(r.movingSec),
    formatDuration(r.idleSec),
    r.totalKm.toFixed(2),
    r.vehicleIds.size,
    r.fuelUsedL != null ? r.fuelUsedL.toFixed(1) : "—",
    r.fuelCost != null ? r.fuelCost.toFixed(2) : "—",
  ] as (string | number)[]);

  const buildActivityTotalsRow = (): (string | number)[] => [
    "TOTAL",
    totalActivityTrips,
    formatDuration(totalActivityMovingSec),
    formatDuration(totalActivityIdleSec),
    `${totalActivityKm.toFixed(2)} km`,
    "",
    hasActivityFuel ? `${totalActivityFuel.toFixed(1)} L` : "—",
    hasActivityCost ? totalActivityCost.toFixed(2) : "—",
  ];

  const exportCSV = () => downloadCSV(exportHeaders, buildRows(), `activity-report-${dateStr}.csv`);
  const exportExcel = () => downloadExcel(exportHeaders, buildRows(), `activity-report-${dateStr}.xlsx`, metaLines, buildActivityTotalsRow());

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
            <div className="flex gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={rows.length === 0}
                data-testid="button-export-excel-activity"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
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
                    <TableHead>Fuel Used (L)</TableHead>
                    <TableHead>Fuel Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length > 0 ? rows.map((r, i) => (
                    <TableRow key={r.date} data-testid={`row-activity-${i}`}>
                      <TableCell className="font-medium whitespace-nowrap">{r.date}</TableCell>
                      <TableCell className="text-center">{r.tripCount}</TableCell>
                      <TableCell className="whitespace-nowrap">{formatDuration(r.movingSec)}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDuration(r.idleSec)}</TableCell>
                      <TableCell className="whitespace-nowrap">{r.totalKm.toFixed(2)} km</TableCell>
                      <TableCell className="text-center">{r.vehicleIds.size}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{r.fuelUsedL != null ? r.fuelUsedL.toFixed(1) : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{r.fuelCost != null ? r.fuelCost.toFixed(2) : "—"}</TableCell>
                    </TableRow>
                  )) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                        No data found. Try adjusting the date range or vehicle filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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
  selectedVehicle: string;
  startDate: Date;
  endDate: Date;
}

function TripView({ segments, vehicles, isLoading, selectedVehicle, startDate, endDate }: TripViewProps) {
  const totalDistance = segments.reduce((s, t) => s + t.distanceKm, 0);
  const totalMovingSec = segments.reduce((s, t) => s + Math.max(0, t.durationSec - t.idleTimeSec), 0);
  const avgSpeed = segments.length > 0
    ? segments.reduce((s, t) => s + t.avgSpeedKmh, 0) / segments.length
    : 0;

  const chartData = segments.slice(0, 15).map((seg) => ({
    name: format(new Date(seg.startTime), "MM/dd HH:mm"),
    distance: Math.round(seg.distanceKm * 10) / 10,
  }));

  const getTripFuel = (seg: TripSegment) => {
    const v = vehicles.find(veh => veh.id === seg.vehicleId);
    const eff = v?.fuelEfficiency != null ? parseFloat(String(v.fuelEfficiency)) : null;
    return eff && eff > 0 ? seg.distanceKm / eff : null;
  };
  const getTripCost = (seg: TripSegment) => {
    const v = vehicles.find(veh => veh.id === seg.vehicleId);
    const eff = v?.fuelEfficiency != null ? parseFloat(String(v.fuelEfficiency)) : null;
    const rate = v?.fuelRatePerLiter != null ? parseFloat(String(v.fuelRatePerLiter)) : null;
    const fuel = eff && eff > 0 ? seg.distanceKm / eff : null;
    return fuel != null && rate && rate > 0 ? fuel * rate : null;
  };

  const totalTripFuel = segments.reduce((s, seg) => {
    const f = getTripFuel(seg);
    return f != null ? s + f : s;
  }, 0);
  const totalTripCost = segments.reduce((s, seg) => {
    const c = getTripCost(seg);
    return c != null ? s + c : s;
  }, 0);
  const hasTripFuel = segments.some(seg => getTripFuel(seg) != null);
  const hasTripCost = segments.some(seg => getTripCost(seg) != null);
  const totalTripIdleSec = segments.reduce((s, t) => s + t.idleTimeSec, 0);
  const totalTripStops = segments.reduce((s, t) => s + t.stopCount, 0);

  const dateStr = format(new Date(), "yyyy-MM-dd");
  const exportHeaders = ["Vehicle", "Date", "Start Time", "End Time", "Distance (km)", "Moving (min)", "Idle (min)", "Stops", "Avg Speed (km/h)", "Est. Fuel (L)", "Est. Fuel Cost", "Start Location", "End Location"];
  const vehicleName = selectedVehicle === "all" ? "All Vehicles" : (vehicles.find(v => v.id === selectedVehicle)?.name ?? selectedVehicle);
  const metaLines = [
    `Trip Report`,
    `Vehicle: ${vehicleName}`,
    `Date Range: ${format(startDate, "yyyy-MM-dd")} to ${format(endDate, "yyyy-MM-dd")}`,
    `Generated: ${format(new Date(), "yyyy-MM-dd HH:mm")}`,
  ];
  const buildTripTotalsRow = (): (string | number)[] => [
    "TOTAL",
    "",
    "",
    "",
    `${totalDistance.toFixed(2)} km`,
    Math.round(totalMovingSec / 60),
    Math.round(totalTripIdleSec / 60),
    totalTripStops,
    "",
    hasTripFuel ? `${totalTripFuel.toFixed(1)} L` : "—",
    hasTripCost ? totalTripCost.toFixed(2) : "—",
    "",
    "",
  ];

  const buildRows = () => segments.map(seg => {
    const vehicle = vehicles.find(v => v.id === seg.vehicleId);
    const movingMin = Math.round(Math.max(0, seg.durationSec - seg.idleTimeSec) / 60);
    const idleMin = Math.round(seg.idleTimeSec / 60);
    const fuel = getTripFuel(seg);
    const cost = getTripCost(seg);
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
      fuel != null ? fuel.toFixed(1) : "—",
      cost != null ? cost.toFixed(2) : "—",
      seg.startAddress || `${seg.startLat.toFixed(5)}, ${seg.startLng.toFixed(5)}`,
      seg.endAddress || `${seg.endLat.toFixed(5)}, ${seg.endLng.toFixed(5)}`,
    ] as (string | number)[];
  });

  const exportCSV = () => {
    if (segments.length === 0) return;
    downloadCSV(exportHeaders, buildRows(), `trip-report-${dateStr}.csv`);
  };

  const exportExcel = () => {
    if (segments.length === 0) return;
    downloadExcel(exportHeaders, buildRows(), `trip-report-${dateStr}.xlsx`, metaLines, buildTripTotalsRow());
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
            <div className="flex gap-2">
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
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcel}
                disabled={segments.length === 0}
                data-testid="button-export-excel-trip"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
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
                    <TableHead>Est. Fuel</TableHead>
                    <TableHead>Est. Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {segments.length > 0 ? segments.map((seg, i) => {
                    const vehicle = vehicles.find(v => v.id === seg.vehicleId);
                    const movingSec = Math.max(0, seg.durationSec - seg.idleTimeSec);
                    const fuel = getTripFuel(seg);
                    const cost = getTripCost(seg);
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
                        <TableCell className="whitespace-nowrap text-muted-foreground">{fuel != null ? `${fuel.toFixed(1)} L` : "—"}</TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{cost != null ? cost.toFixed(2) : "—"}</TableCell>
                      </TableRow>
                    );
                  }) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground text-sm">
                        No data found. Try adjusting the date range or vehicle filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
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

// ── Speeding Report ──────────────────────────────────────────────────────────
interface SpeedEvent {
  id: string;
  vehicleId: string;
  type: string;
  description: string;
  severity: string | null;
  data: Record<string, unknown> | null;
  timestamp: string | null;
}

function SpeedingView({ vehicles, selectedVehicle, startDate, endDate }: { vehicles: Vehicle[]; selectedVehicle: string; startDate: Date; endDate: Date }) {
  const params = new URLSearchParams({ type: "speed_violation", startDate: startDate.toISOString(), endDate: endDate.toISOString(), limit: "200", page: "1" });
  if (selectedVehicle !== "all") params.set("vehicleId", selectedVehicle);
  const { data, isLoading } = useQuery<{ events: SpeedEvent[]; total: number }>({ queryKey: ["/api/events/speed", selectedVehicle, startDate.toISOString(), endDate.toISOString()], queryFn: async () => { const res = await fetch(`/api/events?${params}`); return res.json(); } });
  const vehicleMap = new Map(vehicles.map(v => [v.id, v.name]));
  const events = data?.events ?? [];

  const exportCSV = () => {
    const headers = ["Time", "Vehicle", "Speed (km/h)", "Limit (km/h)", "Severity"];
    const rows = events.map(e => [
      e.timestamp ? format(new Date(e.timestamp), "dd MMM HH:mm:ss") : "",
      vehicleMap.get(e.vehicleId) ?? e.vehicleId,
      (e.data as { speed?: number })?.speed ?? "",
      (e.data as { limit?: number })?.limit ?? "",
      e.severity ?? "warning",
    ]);
    downloadCSV(headers, rows as (string | number)[][], `speeding-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap py-3">
        <CardTitle className="text-sm font-medium">{isLoading ? "Loading…" : `${data?.total ?? 0} speed violation${(data?.total ?? 0) !== 1 ? "s" : ""}`}</CardTitle>
        <Button size="default" variant="outline" onClick={exportCSV} disabled={events.length === 0} data-testid="button-export-csv-speeding">
          <Download className="h-4 w-4 mr-2" />CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Speed (km/h)</TableHead>
              <TableHead>Limit (km/h)</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : events.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No speed violations in this period</TableCell></TableRow>
            ) : (
              events.map(e => (
                <TableRow key={e.id} data-testid={`row-speed-${e.id}`}>
                  <TableCell className="text-xs text-muted-foreground">{e.timestamp ? format(new Date(e.timestamp), "dd MMM HH:mm:ss") : "—"}</TableCell>
                  <TableCell className="font-medium text-sm">{vehicleMap.get(e.vehicleId) ?? e.vehicleId.slice(0, 8)}</TableCell>
                  <TableCell className="font-bold text-sm text-destructive">{(e.data as { speed?: number })?.speed ?? "—"}</TableCell>
                  <TableCell className="text-sm">{(e.data as { limit?: number })?.limit ?? "—"}</TableCell>
                  <TableCell className="capitalize text-sm text-muted-foreground">{e.severity ?? "warning"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ── Zone Visits Report ───────────────────────────────────────────────────────
function ZoneVisitsView({ vehicles, selectedVehicle, startDate, endDate }: { vehicles: Vehicle[]; selectedVehicle: string; startDate: Date; endDate: Date }) {
  const params = new URLSearchParams({ types: "geofence_entry,geofence_exit", startDate: startDate.toISOString(), endDate: endDate.toISOString(), limit: "500", page: "1" });
  if (selectedVehicle !== "all") params.set("vehicleId", selectedVehicle);
  const { data, isLoading } = useQuery<{ events: SpeedEvent[]; total: number }>({ queryKey: ["/api/events/zone", selectedVehicle, startDate.toISOString(), endDate.toISOString()], queryFn: async () => { const res = await fetch(`/api/events?${params}`); return res.json(); } });
  const vehicleMap = new Map(vehicles.map(v => [v.id, v.name]));
  const events = data?.events ?? [];

  // Summarize zone visits by geofence name
  const zoneSummary = useMemo(() => {
    const map = new Map<string, { entries: number; exits: number; vehicles: Set<string> }>();
    for (const e of events) {
      const zoneName = (e.data as { geofenceName?: string })?.geofenceName ?? "Unknown Zone";
      if (!map.has(zoneName)) map.set(zoneName, { entries: 0, exits: 0, vehicles: new Set() });
      const z = map.get(zoneName)!;
      if (e.type === "geofence_entry") z.entries++;
      if (e.type === "geofence_exit") z.exits++;
      z.vehicles.add(e.vehicleId);
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v, vehicleCount: v.vehicles.size }));
  }, [events]);

  const exportCSV = () => {
    const headers = ["Zone", "Entries", "Exits", "Unique Vehicles"];
    const rows = zoneSummary.map(z => [z.name, z.entries, z.exits, z.vehicleCount]);
    downloadCSV(headers, rows as (string | number)[][], `zone-visits-${format(new Date(), "yyyy-MM-dd")}.csv`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap py-3">
        <CardTitle className="text-sm font-medium">{isLoading ? "Loading…" : `${zoneSummary.length} zone${zoneSummary.length !== 1 ? "s" : ""} visited`}</CardTitle>
        <Button size="default" variant="outline" onClick={exportCSV} disabled={zoneSummary.length === 0} data-testid="button-export-csv-zones">
          <Download className="h-4 w-4 mr-2" />CSV
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zone Name</TableHead>
              <TableHead>Entries</TableHead>
              <TableHead>Exits</TableHead>
              <TableHead>Unique Vehicles</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                </TableRow>
              ))
            ) : zoneSummary.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No geofence events in this period</TableCell></TableRow>
            ) : (
              zoneSummary.map((z, i) => (
                <TableRow key={z.name} data-testid={`row-zone-${i}`}>
                  <TableCell className="font-medium text-sm">{z.name}</TableCell>
                  <TableCell className="text-sm">{z.entries}</TableCell>
                  <TableCell className="text-sm">{z.exits}</TableCell>
                  <TableCell className="text-sm">{z.vehicleCount}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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
                  <SelectItem value="speeding">Speeding Report</SelectItem>
                  <SelectItem value="zone">Zone Visits</SelectItem>
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
        <MileageView segments={safeSegments} vehicles={safeVehicles} isLoading={isLoading} selectedVehicle={selectedVehicle} startDate={startDate} endDate={endDate} />
      ) : reportType === "activity" ? (
        <ActivityView segments={safeSegments} vehicles={safeVehicles} isLoading={isLoading} selectedVehicle={selectedVehicle} startDate={startDate} endDate={endDate} />
      ) : reportType === "speeding" ? (
        <SpeedingView vehicles={safeVehicles} selectedVehicle={selectedVehicle} startDate={startDate} endDate={endDate} />
      ) : reportType === "zone" ? (
        <ZoneVisitsView vehicles={safeVehicles} selectedVehicle={selectedVehicle} startDate={startDate} endDate={endDate} />
      ) : (
        <TripView segments={safeSegments} vehicles={safeVehicles} isLoading={isLoading} selectedVehicle={selectedVehicle} startDate={startDate} endDate={endDate} />
      )}
    </div>
  );
}
