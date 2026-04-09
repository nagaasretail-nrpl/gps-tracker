import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuCheckboxItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, ChevronLeft, ChevronRight, Activity, ChevronDown } from "lucide-react";
import { format, subDays } from "date-fns";
import type { Vehicle, Event } from "@shared/schema";

const EVENT_TYPE_OPTIONS = [
  { value: "geofence_entry", label: "Geofence Entry" },
  { value: "geofence_exit", label: "Geofence Exit" },
  { value: "speed_violation", label: "Speed Violation" },
  { value: "ignition_on", label: "Ignition On" },
  { value: "ignition_off", label: "Ignition Off" },
  { value: "idle", label: "Idle" },
  { value: "sos", label: "SOS Alert" },
  { value: "low_battery", label: "Low Battery" },
  { value: "movement", label: "Movement" },
];

const SEVERITY_LEVELS = [
  { value: "all", label: "All Severities" },
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
];

function severityBadge(severity: string | null) {
  if (severity === "critical") return <Badge variant="destructive" data-testid={`badge-severity-${severity}`}>Critical</Badge>;
  if (severity === "warning") return <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700" data-testid={`badge-severity-${severity}`}>Warning</Badge>;
  return <Badge variant="secondary" data-testid={`badge-severity-${severity}`}>Info</Badge>;
}

function formatEventType(type: string) {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function EventsPage() {
  const [vehicleId, setVehicleId] = useState<string>("all");
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [severity, setSeverity] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date>(subDays(new Date(), 7));
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const toggleType = (type: string) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
    setPage(1);
  };

  const typeLabel = selectedTypes.size === 0 ? "All Types" : selectedTypes.size === 1
    ? EVENT_TYPE_OPTIONS.find(t => t.value === Array.from(selectedTypes)[0])?.label ?? "1 type"
    : `${selectedTypes.size} types`;

  const { data: vehicleData } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const vehicles = vehicleData ?? [];

  const params = new URLSearchParams({
    page: String(page),
    limit: "50",
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });
  if (vehicleId !== "all") params.set("vehicleId", vehicleId);
  if (selectedTypes.size === 1) {
    params.set("type", Array.from(selectedTypes)[0]);
  } else if (selectedTypes.size > 1) {
    params.set("types", Array.from(selectedTypes).sort().join(","));
  }
  if (severity !== "all") params.set("severity", severity);

  const { data, isLoading } = useQuery<{ events: Event[]; total: number; page: number }>({
    queryKey: ["/api/events", vehicleId, Array.from(selectedTypes).sort().join(","), severity, page, startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
  });

  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 50) || 1;

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v.name]));

  const resetFilters = () => {
    setVehicleId("all");
    setSelectedTypes(new Set());
    setSeverity("all");
    setPage(1);
    setStartDate(subDays(new Date(), 7));
    setEndDate(new Date());
  };

  const filteredEvents = data?.events ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold" data-testid="heading-events">Events Log</h1>
        <p className="text-sm text-muted-foreground mt-0.5">System events across your fleet</p>
      </div>

      <div className="p-4 border-b bg-muted/30 flex-shrink-0">
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={vehicleId} onValueChange={(v) => { setVehicleId(v); setPage(1); }}>
            <SelectTrigger className="w-40" data-testid="select-vehicle-filter">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-44 justify-between" data-testid="select-type-filter">
                <span className="truncate">{typeLabel}</span>
                <ChevronDown className="h-4 w-4 ml-2 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" data-testid="dropdown-type-options">
              {EVENT_TYPE_OPTIONS.map((t) => (
                <DropdownMenuCheckboxItem
                  key={t.value}
                  checked={selectedTypes.has(t.value)}
                  onCheckedChange={() => toggleType(t.value)}
                  data-testid={`check-type-${t.value}`}
                >
                  {t.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
            <SelectTrigger className="w-40" data-testid="select-severity-filter">
              <SelectValue placeholder="All Severities" />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_LEVELS.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover open={startOpen} onOpenChange={setStartOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-start-date">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(startDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={startDate} onSelect={(d) => { if (d) { setStartDate(d); setPage(1); } setStartOpen(false); }} />
            </PopoverContent>
          </Popover>

          <span className="text-muted-foreground text-sm">to</span>

          <Popover open={endOpen} onOpenChange={setEndOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" data-testid="button-end-date">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(endDate, "dd MMM yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={endDate} onSelect={(d) => { if (d) { setEndDate(d); setPage(1); } setEndOpen(false); }} />
            </PopoverContent>
          </Popover>

          <Button variant="ghost" size="default" onClick={resetFilters} data-testid="button-reset-filters">
            Reset
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {isLoading ? "Loading…" : `${total} event${total !== 1 ? "s" : ""}`}
              </span>
              <div className="flex items-center gap-1">
                <Button size="icon" variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)} data-testid="button-prev-page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground px-1">Page {page} / {totalPages}</span>
                <Button size="icon" variant="ghost" disabled={page >= totalPages} onClick={() => setPage(page + 1)} data-testid="button-next-page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No events found for the selected filters
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map((evt) => (
                    <TableRow key={evt.id} data-testid={`row-event-${evt.id}`}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {evt.timestamp ? format(new Date(evt.timestamp), "dd MMM HH:mm:ss") : "—"}
                      </TableCell>
                      <TableCell className="font-medium text-sm">
                        {vehicleMap.get(evt.vehicleId) ?? evt.vehicleId.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">{formatEventType(evt.type)}</TableCell>
                      <TableCell>{severityBadge(evt.severity)}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{evt.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
