import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapComponent } from "@/components/map-component";
import { Car, Activity, AlertCircle, Navigation } from "lucide-react";
import type { Vehicle, Location } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: latestLocations, isLoading: locationsLoading } = useQuery<Location[]>({
    queryKey: ["/api/locations/latest"],
  });

  const stats = {
    total: vehicles?.length || 0,
    active: vehicles?.filter(v => v.status === "active").length || 0,
    stopped: vehicles?.filter(v => v.status === "stopped").length || 0,
    offline: vehicles?.filter(v => v.status === "offline").length || 0,
  };

  const isLoading = vehiclesLoading || locationsLoading;

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2" data-testid="text-page-title">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Real-time overview of your fleet
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold" data-testid="text-total-vehicles">{stats.total}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600" data-testid="text-active-vehicles">{stats.active}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600" data-testid="text-stopped-vehicles">{stats.stopped}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline</CardTitle>
            <Navigation className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-gray-600" data-testid="text-offline-vehicles">{stats.offline}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="flex-1">
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <Skeleton className="h-[500px] w-full rounded-b-md" />
          ) : (
            <MapComponent
              vehicles={vehicles}
              locations={latestLocations}
              className="h-[500px]"
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
