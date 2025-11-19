import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, Clock, MapPin, TrendingUp, Calendar as CalendarIcon, Navigation, Gauge } from "lucide-react";
import { format, subDays } from "date-fns";
import type { Trip, Vehicle } from "@shared/schema";

export default function Trips() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: trips, isLoading } = useQuery<Trip[]>({
    queryKey: [
      "/api/trips",
      selectedVehicle !== "all" ? selectedVehicle : undefined,
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedVehicle !== "all") {
        params.append("vehicleId", selectedVehicle);
      }
      params.append("startDate", dateRange.from.toISOString());
      params.append("endDate", dateRange.to.toISOString());
      
      const response = await fetch(`/api/trips?${params}`);
      return response.json();
    },
  });

  const lastTrip = trips?.[0];
  const totalDistance = trips?.reduce((sum, trip) => sum + parseFloat(trip.distance || "0"), 0) || 0;
  const totalDuration = trips?.reduce((sum, trip) => sum + (trip.duration || 0), 0) || 0;

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatDistance = (distance: number) => {
    return `${distance.toFixed(1)} km`;
  };

  const getVehicleName = (vehicleId: string) => {
    return vehicles?.find(v => v.id === vehicleId)?.name || "Unknown Vehicle";
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Trip History</h1>
          <p className="text-sm text-muted-foreground">
            View and analyze vehicle trips with detailed statistics
          </p>
        </div>
      </div>

      {/* Filters */}
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
                  {vehicles?.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.name}
                    </SelectItem>
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
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subDays(new Date(), 7), to: new Date() })}
                    >
                      Last 7 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subDays(new Date(), 30), to: new Date() })}
                    >
                      Last 30 Days
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setDateRange({ from: subDays(new Date(), 90), to: new Date() })}
                    >
                      Last 90 Days
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-trips">{trips?.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">In selected period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <Navigation className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDistance(totalDistance)}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all trips</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(totalDuration)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total driving time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trips && trips.length > 0
                ? (trips.reduce((sum, t) => sum + parseFloat(t.avgSpeed || "0"), 0) / trips.length).toFixed(1)
                : "0.0"} km/h
            </div>
            <p className="text-xs text-muted-foreground mt-1">Average across trips</p>
          </CardContent>
        </Card>
      </div>

      {/* Last Trip Details */}
      {lastTrip && (
        <Card className="border-primary/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Last Trip
              </CardTitle>
              <Badge variant="default" className="bg-primary">Most Recent</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Vehicle</p>
                  <p className="font-semibold">{getVehicleName(lastTrip.vehicleId)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Navigation className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Distance</p>
                  <p className="font-semibold">{formatDistance(parseFloat(lastTrip.distance || "0"))}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-semibold">{formatDuration(lastTrip.duration || 0)}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Gauge className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Speed</p>
                  <p className="font-semibold">{parseFloat(lastTrip.avgSpeed || "0").toFixed(1)} km/h</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">{format(new Date(lastTrip.startTime), "PPp")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ended</p>
                  <p className="font-medium">
                    {lastTrip.endTime ? format(new Date(lastTrip.endTime), "PPp") : "In progress"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Past Trips List */}
      <Card>
        <CardHeader>
          <CardTitle>Past Trips</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading trips...</div>
          ) : trips && trips.length > 0 ? (
            <div className="space-y-3">
              {trips.map((trip, index) => (
                <div
                  key={trip.id}
                  className={`p-4 rounded-lg border hover-elevate cursor-pointer ${
                    index === 0 ? "bg-primary/5 border-primary/30" : "bg-card"
                  }`}
                  data-testid={`card-trip-${trip.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Car className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-semibold">{getVehicleName(trip.vehicleId)}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(trip.startTime), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                    {index === 0 && <Badge variant="outline">Latest</Badge>}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Distance</p>
                      <p className="font-semibold">{formatDistance(parseFloat(trip.distance || "0"))}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-semibold">{formatDuration(trip.duration || 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avg Speed</p>
                      <p className="font-semibold">{parseFloat(trip.avgSpeed || "0").toFixed(1)} km/h</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Max Speed</p>
                      <p className="font-semibold">{parseFloat(trip.maxSpeed || "0").toFixed(1)} km/h</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold text-lg mb-2">No trips found</h3>
              <p className="text-sm text-muted-foreground">
                No trips recorded for the selected vehicle and date range.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
