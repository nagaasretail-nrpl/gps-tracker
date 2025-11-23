import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Circle } from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Tracking() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 10000,
  });

  const { data: latestLocations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
    refetchInterval: 10000,
  });

  const filteredVehicles = vehicles?.filter(v =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getVehicleLocation = (vehicleId: string) => {
    return latestLocations?.find(l => l.vehicleId === vehicleId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "text-green-600";
      case "stopped":
        return "text-yellow-600";
      case "offline":
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "stopped":
        return "secondary";
      case "offline":
        return "outline";
      default:
        return "outline";
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(timestamp).getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    return new Date(timestamp).toLocaleTimeString();
  };

  const isLoading = vehiclesLoading || locationsLoading;

  return (
    <div className="flex h-screen w-full relative">
      <div className="absolute left-4 top-20 w-80 border rounded-md bg-card z-10 shadow-lg max-h-[calc(100vh-8rem)] overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold mb-4">Vehicles</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search vehicles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-vehicles"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-4rem)]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-muted-foreground mb-2">No vehicles found</p>
              {searchQuery && (
                <p className="text-xs text-muted-foreground">Try adjusting your search</p>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {filteredVehicles.map((vehicle) => {
                const location = getVehicleLocation(vehicle.id);
                return (
                  <Card
                    key={vehicle.id}
                    className={`cursor-pointer hover-elevate active-elevate-2 ${
                      selectedVehicle === vehicle.id ? 'border-primary' : ''
                    }`}
                    onClick={() => setSelectedVehicle(vehicle.id)}
                    data-testid={`card-vehicle-${vehicle.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Circle
                            className={`h-3 w-3 fill-current ${getStatusColor(vehicle.status)}`}
                          />
                          <h3 className="font-medium">{vehicle.name}</h3>
                        </div>
                        <Badge variant={getStatusBadge(vehicle.status)}>
                          {vehicle.status}
                        </Badge>
                      </div>
                      {location && (
                        <>
                          <p className="text-sm text-muted-foreground mb-1">
                            Speed: {location.speed || 0} km/h
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTimestamp(location.timestamp)}
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </div>

      <div className="absolute inset-0">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapComponent
            vehicles={vehicles}
            locations={latestLocations}
            className="h-full w-full"
            onVehicleClick={setSelectedVehicle}
          />
        )}
      </div>
    </div>
  );
}
