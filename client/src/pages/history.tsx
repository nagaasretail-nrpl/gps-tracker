import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CalendarIcon,
  Play,
  Pause,
  SkipBack,
  History as HistoryIcon,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import type { Vehicle, Location } from "@shared/schema";
import { MapComponent } from "@/components/map-component";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

export default function History() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: locations, isLoading: locationsLoading, refetch } = useQuery<Location[]>({
    queryKey: [
      "/api/locations/history",
      selectedVehicle,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    queryFn: async () => {
      if (!selectedVehicle || !startDate || !endDate) return [];
      const params = new URLSearchParams({
        vehicleId: selectedVehicle,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      const res = await fetch(`/api/locations/history?${params}`, { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!selectedVehicle && !!startDate && !!endDate,
  });

  const dateGroups = useMemo(() => {
    if (!locations || locations.length === 0) return {};
    const groups: Record<string, Location[]> = {};
    for (const loc of locations) {
      const d = new Date(loc.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(loc);
    }
    for (const key of Object.keys(groups)) {
      groups[key].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    }
    return groups;
  }, [locations]);

  const sortedDates = useMemo(
    () => Object.keys(dateGroups).sort().reverse(),
    [dateGroups]
  );

  useEffect(() => {
    if (sortedDates.length > 0 && !selectedDate) {
      setSelectedDate(sortedDates[0]);
    }
  }, [sortedDates]);

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [selectedDate]);

  const activeDateLocations = selectedDate ? (dateGroups[selectedDate] || []) : [];
  const currentLocation = activeDateLocations.length > 0 ? activeDateLocations[currentIndex] : undefined;
  const selectedVehicleData = vehicles?.find((v) => v.id === selectedVehicle);

  const dayRoutePolylines = useMemo(() => {
    if (!selectedVehicle || activeDateLocations.length < 2) return [];
    const coords = activeDateLocations
      .map(
        (l) =>
          [parseFloat(String(l.latitude)), parseFloat(String(l.longitude))] as [number, number]
      )
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));
    return [{ vehicleId: selectedVehicle, coords, color: "#3b82f6" }];
  }, [selectedVehicle, activeDateLocations]);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= activeDateLocations.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, activeDateLocations.length]);

  const formatDateKey = (key: string) => {
    try {
      return format(parseISO(key), "d MMM yyyy");
    } catch {
      return key;
    }
  };

  const canLoad = !!selectedVehicle && !!startDate && !!endDate;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      <div className="border-b bg-card p-3 flex-shrink-0">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[160px]">
            <Label htmlFor="vehicle" className="text-xs mb-1 block">Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={(v) => { setSelectedVehicle(v); setSelectedDate(null); }}>
              <SelectTrigger id="vehicle" data-testid="select-vehicle" className="h-8 text-sm">
                <SelectValue placeholder="Select vehicle" />
              </SelectTrigger>
              <SelectContent>
                {vehicles?.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    {vehicle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal text-sm"
                  data-testid="button-start-date"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {startDate ? format(startDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label className="text-xs mb-1 block">End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="justify-start text-left font-normal text-sm"
                  data-testid="button-end-date"
                >
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {endDate ? format(endDate, "PP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
              </PopoverContent>
            </Popover>
          </div>

          <Button
            disabled={!canLoad}
            onClick={() => { setSelectedDate(null); refetch(); }}
            data-testid="button-load-history"
            className="text-sm"
          >
            Load History
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {sortedDates.length > 0 && (
          <div className="w-56 flex-shrink-0 border-r bg-card flex flex-col">
            <div className="p-3 border-b">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {sortedDates.length} date{sortedDates.length !== 1 ? "s" : ""}
              </p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {sortedDates.map((key) => {
                  const group = dateGroups[key];
                  const isSelected = selectedDate === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      data-testid={`date-group-${key}`}
                      className={`w-full text-left rounded-md p-2.5 transition-colors hover-elevate ${
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "border border-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <CalendarIcon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-sm font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {formatDateKey(key)}
                          </span>
                        </div>
                        <ChevronRight className={`h-3 w-3 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {group.length} point{group.length !== 1 ? "s" : ""}
                        </span>
                        {group.length > 0 && (
                          <Badge variant="outline" className="text-xs ml-auto">
                            {format(new Date(group[0].timestamp), "HH:mm")}
                            {" — "}
                            {format(new Date(group[group.length - 1].timestamp), "HH:mm")}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        <div className="flex-1 relative min-w-0">
          {locationsLoading ? (
            <Skeleton className="h-full w-full" />
          ) : currentLocation && selectedVehicleData ? (
            <MapComponent
              key={`${selectedDate}-${selectedVehicle}`}
              vehicles={[selectedVehicleData]}
              locations={[currentLocation]}
              routePolylines={dayRoutePolylines}
              className="h-full"
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <HistoryIcon className="h-14 w-14 mx-auto text-muted-foreground/40 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">View Route History</p>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Select a vehicle and date range, then click Load History
                </p>
              </div>
            </div>
          )}

          {activeDateLocations.length > 0 && (
            <Card className="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-xl mx-4">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
                  {selectedDate && (
                    <span className="font-semibold text-foreground">{formatDateKey(selectedDate)}</span>
                  )}
                  <span>— {activeDateLocations.length} points</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => { setCurrentIndex(0); setIsPlaying(false); }}
                    data-testid="button-restart"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setIsPlaying((p) => !p)}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <div className="flex-1">
                    <Slider
                      value={[currentIndex]}
                      max={activeDateLocations.length - 1}
                      step={1}
                      onValueChange={(value) => { setCurrentIndex(value[0]); setIsPlaying(false); }}
                      data-testid="slider-timeline"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {currentIndex + 1} / {activeDateLocations.length}
                  </span>
                </div>
                {currentLocation && (
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Speed</p>
                      <p className="font-medium">{parseFloat(String(currentLocation.speed || "0")).toFixed(0)} km/h</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time</p>
                      <p className="font-medium">
                        {new Date(currentLocation.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Location</p>
                      <p className="font-medium text-xs truncate">
                        {currentLocation.address ||
                          `${parseFloat(String(currentLocation.latitude)).toFixed(4)}, ${parseFloat(String(currentLocation.longitude)).toFixed(4)}`}
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
