import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
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
import { CalendarIcon, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { format } from "date-fns";
import type { Vehicle, Location } from "@shared/schema";
import { MapComponent } from "@/components/map-component";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

export default function History() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: locations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: [
      "/api/locations/history",
      selectedVehicle,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    enabled: !!selectedVehicle && !!startDate && !!endDate,
  });

  const isLoading = vehiclesLoading || locationsLoading;

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const currentLocation = locations && locations.length > 0 ? locations[currentIndex] : undefined;
  const selectedVehicleData = vehicles?.find(v => v.id === selectedVehicle);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="border-b bg-card p-4">
        <h1 className="text-xl font-semibold mb-4">Route History</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="vehicle">Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger id="vehicle" data-testid="select-vehicle">
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
                <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div>
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
                <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={!selectedVehicle || !startDate || !endDate}
              data-testid="button-load-history"
            >
              Load History
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : currentLocation && selectedVehicleData ? (
          <MapComponent
            vehicles={[selectedVehicleData]}
            locations={[currentLocation]}
            className="h-full"
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <History className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-sm font-medium text-foreground mb-2">View Route History</p>
              <p className="text-xs text-muted-foreground max-w-sm">
                Select a vehicle and date range to replay historical routes
              </p>
            </div>
          </div>
        )}

        {locations && locations.length > 0 && (
          <Card className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Playback Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handleRestart}
                  data-testid="button-restart"
                >
                  <SkipBack className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  onClick={handlePlay}
                  data-testid="button-play-pause"
                >
                  {isPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                </Button>
                <div className="flex-1">
                  <Slider
                    value={[currentIndex]}
                    max={locations.length - 1}
                    step={1}
                    onValueChange={(value) => setCurrentIndex(value[0])}
                    data-testid="slider-timeline"
                  />
                </div>
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {currentIndex + 1} / {locations.length}
                </span>
              </div>
              {currentLocation && (
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Speed</p>
                    <p className="font-medium">{currentLocation.speed || 0} km/h</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Time</p>
                    <p className="font-medium">
                      {new Date(currentLocation.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium text-xs truncate">
                      {currentLocation.address || "Unknown"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
