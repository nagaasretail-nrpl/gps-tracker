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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarIcon, Download, FileText, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import type { Vehicle, Trip } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Reports() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [reportType, setReportType] = useState<string>("trips");

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: trips, isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: [
      "/api/trips",
      selectedVehicle,
      startDate?.toISOString(),
      endDate?.toISOString(),
    ],
    enabled: !!startDate && !!endDate,
  });

  const isLoading = vehiclesLoading || tripsLoading;

  const stats = {
    totalTrips: trips?.length || 0,
    totalDistance: trips?.reduce((sum, trip) => sum + parseFloat(trip.distance || "0"), 0) || 0,
    totalDuration: trips?.reduce((sum, trip) => sum + (trip.duration || 0), 0) || 0,
    avgSpeed: trips?.length
      ? trips.reduce((sum, trip) => sum + parseFloat(trip.avgSpeed || "0"), 0) / trips.length
      : 0,
  };

  const chartData = trips?.slice(0, 10).map((trip) => ({
    name: new Date(trip.startTime).toLocaleDateString(),
    distance: parseFloat(trip.distance || "0"),
    duration: trip.duration || 0,
  })) || [];

  const exportToCSV = () => {
    if (!trips || trips.length === 0) return;

    const headers = ["Vehicle", "Start Time", "End Time", "Distance (km)", "Duration (min)", "Avg Speed (km/h)"];
    const rows = trips.map(trip => {
      const vehicle = vehicles?.find(v => v.id === trip.vehicleId);
      return [
        vehicle?.name || "Unknown",
        new Date(trip.startTime).toLocaleString(),
        trip.endTime ? new Date(trip.endTime).toLocaleString() : "Ongoing",
        trip.distance || "0",
        trip.duration || "0",
        trip.avgSpeed || "0",
      ];
    });

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `trip-report-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate detailed reports for your fleet
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
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

            <div>
              <Label htmlFor="vehicle">Vehicle</Label>
              <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                <SelectTrigger id="vehicle" data-testid="select-vehicle">
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
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Trips</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalTrips}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Distance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{stats.totalDistance.toFixed(2)} km</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{Math.floor(stats.totalDuration / 60)}h {stats.totalDuration % 60}m</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Speed</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{stats.avgSpeed.toFixed(1)} km/h</div>
            )}
          </CardContent>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distance by Trip</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="distance" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Trip Details</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              disabled={!trips || trips.length === 0}
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
          ) : trips && trips.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>End Time</TableHead>
                  <TableHead>Distance</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Avg Speed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trips.map((trip) => {
                  const vehicle = vehicles?.find(v => v.id === trip.vehicleId);
                  return (
                    <TableRow key={trip.id}>
                      <TableCell className="font-medium">{vehicle?.name || "Unknown"}</TableCell>
                      <TableCell>{new Date(trip.startTime).toLocaleString()}</TableCell>
                      <TableCell>
                        {trip.endTime ? new Date(trip.endTime).toLocaleString() : (
                          <Badge variant="secondary">Ongoing</Badge>
                        )}
                      </TableCell>
                      <TableCell>{trip.distance || "0"} km</TableCell>
                      <TableCell>{trip.duration || "0"} min</TableCell>
                      <TableCell>{trip.avgSpeed || "0"} km/h</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No trips found</p>
              <p className="text-xs text-muted-foreground">
                Try adjusting your filters or date range
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
