import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarIcon,
  ParkingSquare,
  Clock,
  Download,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import type { Vehicle } from "@shared/schema";
import type { ParkingEvent } from "@/components/map-component";
import { Skeleton } from "@/components/ui/skeleton";

function todayStart(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function todayEnd(): Date {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatDuration(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  }
  return `${minutes} min`;
}

function formatLatLng(lat: number, lng: number): string {
  const latDir = lat >= 0 ? "N" : "S";
  const lngDir = lng >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(5)}\u00b0${latDir}, ${Math.abs(lng).toFixed(5)}\u00b0${lngDir}`;
}

function formatTotalDuration(totalMin: number): string {
  if (totalMin < 60) return `${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `${h} hrs` : `${h} hrs ${m} min`;
}

export default function ParkingReport() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(todayStart);
  const [endDate, setEndDate] = useState<Date>(todayEnd);
  const [loadTrigger, setLoadTrigger] = useState(0);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: parkingEvents, isLoading } = useQuery<ParkingEvent[]>({
    queryKey: [
      "/api/reports/parking",
      selectedVehicle,
      startDate.toISOString(),
      endDate.toISOString(),
      loadTrigger,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      if (selectedVehicle !== "all") params.set("vehicleId", selectedVehicle);
      const res = await fetch(`/api/reports/parking?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: loadTrigger > 0,
  });

  const vehicleMap = useMemo<Record<string, Vehicle>>(() => {
    if (!vehicles) return {};
    return Object.fromEntries(vehicles.map((v) => [v.id, v]));
  }, [vehicles]);

  const stats = useMemo(() => {
    if (!parkingEvents || parkingEvents.length === 0) return null;
    const total = parkingEvents.length;
    const totalMin = parkingEvents.reduce((s, e) => s + e.durationMin, 0);
    const longest = parkingEvents.reduce((best, e) => e.durationMin > best.durationMin ? e : best, parkingEvents[0]);
    return { total, totalMin, longest };
  }, [parkingEvents]);

  function exportCsv() {
    if (!parkingEvents || parkingEvents.length === 0) return;
    const headers = ["Vehicle", "Date", "Start Time", "End Time", "Duration (min)", "Latitude", "Longitude", "Address"];
    const rows = parkingEvents.map((ev) => {
      const veh = vehicleMap[ev.vehicleId];
      const startDt = new Date(ev.startTime);
      const endDt = new Date(ev.endTime);
      return [
        veh?.name ?? ev.vehicleId,
        format(startDt, "dd/MM/yyyy"),
        format(startDt, "HH:mm"),
        format(endDt, "HH:mm"),
        ev.durationMin,
        ev.lat.toFixed(6),
        ev.lng.toFixed(6),
        ev.address ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parking-report-${format(startDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Filter Bar */}
      <div className="border-b bg-card flex-shrink-0 p-3">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <Label className="text-xs mb-1 block">Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger data-testid="select-vehicle-parking" className="text-sm">
                <SelectValue placeholder="All Vehicles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {vehicles?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal text-sm" data-testid="button-parking-start-date">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {format(startDate, "PP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => {
                    if (!d) return;
                    const s = new Date(d);
                    s.setHours(0, 0, 0, 0);
                    setStartDate(s);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs mb-1 block">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start text-left font-normal text-sm" data-testid="button-parking-end-date">
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {format(endDate, "PP")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => {
                    if (!d) return;
                    const e = new Date(d);
                    e.setHours(23, 59, 59, 999);
                    setEndDate(e);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            onClick={() => setLoadTrigger((n) => n + 1)}
            disabled={isLoading}
            data-testid="button-load-parking"
            className="text-sm"
          >
            {isLoading ? "Loading..." : "Load Report"}
          </Button>

          {parkingEvents && parkingEvents.length > 0 && (
            <Button
              variant="outline"
              onClick={exportCsv}
              className="text-sm"
              data-testid="button-export-csv"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {loadTrigger === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ParkingSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">Select a vehicle and date range, then click Load Report</p>
              <p className="text-sm text-muted-foreground/70 mt-1">Parking events of 5+ minutes will be shown</p>
            </div>
          )}

          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-md" />
              ))}
            </div>
          )}

          {!isLoading && loadTrigger > 0 && parkingEvents && parkingEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <ParkingSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground font-medium">No parking events found</p>
              <p className="text-sm text-muted-foreground/70 mt-1">No stops of 5+ minutes for this period</p>
            </div>
          )}

          {!isLoading && stats && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Card>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-events">{stats.total}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">parking stops</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Total Parked</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-total-time">{formatTotalDuration(stats.totalMin)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">total parking time</p>
                  </CardContent>
                </Card>

                <Card className="col-span-2 md:col-span-1">
                  <CardHeader className="pb-1 pt-3 px-4">
                    <CardTitle className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Longest Stop</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-3">
                    <p className="text-2xl font-bold text-foreground" data-testid="stat-longest">{formatDuration(stats.longest.durationMin)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {vehicleMap[stats.longest.vehicleId]?.name ?? "Unknown vehicle"}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Events Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">{stats.total} parking event{stats.total !== 1 ? "s" : ""}</p>
                </div>

                <div className="rounded-md border overflow-hidden">
                  <div className="hidden md:grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_2fr_auto] bg-muted/50 text-xs font-medium text-muted-foreground px-3 py-2 gap-2 border-b">
                    <span>Vehicle</span>
                    <span>Date</span>
                    <span>Start</span>
                    <span>End</span>
                    <span>Duration</span>
                    <span>Location</span>
                    <span></span>
                  </div>

                  {parkingEvents!.map((ev, idx) => {
                    const veh = vehicleMap[ev.vehicleId];
                    const startDt = new Date(ev.startTime);
                    const endDt = new Date(ev.endTime);
                    const mapsUrl = `https://www.google.com/maps?q=${ev.lat},${ev.lng}`;
                    return (
                      <div
                        key={idx}
                        data-testid={`row-parking-${idx}`}
                        className="px-3 py-3 border-b last:border-0 flex flex-col md:grid md:grid-cols-[1.5fr_1fr_0.8fr_0.8fr_0.8fr_2fr_auto] items-start md:items-center gap-2 text-sm hover-elevate"
                      >
                        {/* Vehicle */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ background: veh?.iconColor ?? "#e4006e" }}
                          />
                          <span className="font-medium truncate" data-testid={`text-vehicle-${idx}`}>
                            {veh?.name ?? ev.vehicleId}
                          </span>
                        </div>

                        {/* Date */}
                        <span className="text-muted-foreground text-xs md:text-sm" data-testid={`text-date-${idx}`}>
                          {format(startDt, "dd/MM/yyyy")}
                        </span>

                        {/* Start time */}
                        <div className="flex items-center gap-1 text-xs md:text-sm">
                          <Clock className="h-3 w-3 text-muted-foreground flex-shrink-0 md:hidden" />
                          <span data-testid={`text-start-${idx}`}>{format(startDt, "HH:mm")}</span>
                        </div>

                        {/* End time */}
                        <span className="text-xs md:text-sm hidden md:block" data-testid={`text-end-${idx}`}>
                          {format(endDt, "HH:mm")}
                        </span>

                        {/* Duration */}
                        <Badge
                          variant="secondary"
                          className="text-xs font-medium w-fit"
                          data-testid={`badge-duration-${idx}`}
                        >
                          {formatDuration(ev.durationMin)}
                        </Badge>

                        {/* Location */}
                        <div className="min-w-0 flex-1 md:flex-none">
                          {ev.address ? (
                            <p className="text-xs truncate text-muted-foreground" title={ev.address} data-testid={`text-address-${idx}`}>
                              {ev.address}
                            </p>
                          ) : null}
                          <p className="text-xs font-mono text-muted-foreground/70 flex items-center gap-1" data-testid={`text-coords-${idx}`}>
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            {formatLatLng(ev.lat, ev.lng)}
                          </p>
                        </div>

                        {/* Map link */}
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-testid={`link-maps-${idx}`}
                          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                          title="Open in Google Maps"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
