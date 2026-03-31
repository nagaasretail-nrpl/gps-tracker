import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, WifiOff, Cpu, AlertTriangle } from "lucide-react";
import type { Vehicle, User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

interface ActiveConnection {
  imei: string;
  remoteAddr: string;
  connectedAt: string;
  lastPacketAt: string;
  packetCount: number;
}

interface UnknownDevice {
  deviceId: string;
  lat: number;
  lng: number;
  speed: number;
  seenAt: string;
}

function formatRelative(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 0) return new Date(ts).toLocaleTimeString();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  if (seconds < 60) return `${seconds}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  const d = new Date(ts);
  return `${d.getDate()} ${d.toLocaleString("default", { month: "short" })}, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

export default function AdminDevices() {
  const [, navigate] = useLocation();

  const { data: authData, isFetched: authFetched } = useQuery<{ user: UserWithoutPassword }>({
    queryKey: ["/api/auth/me"],
  });

  const isAdmin = authData?.user?.role === "admin";

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
    refetchInterval: 10000,
    enabled: isAdmin,
  });

  const { data: connections, isLoading: connectionsLoading } = useQuery<ActiveConnection[]>({
    queryKey: ["/api/device/connections"],
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  const { data: unknownDevices, isLoading: unknownLoading } = useQuery<UnknownDevice[]>({
    queryKey: ["/api/device/unknown"],
    refetchInterval: 15000,
    enabled: isAdmin,
  });

  if (authFetched && !isAdmin) {
    navigate("/tracking");
    return null;
  }

  const isLoading = vehiclesLoading || connectionsLoading;

  const connectionMap = new Map<string, ActiveConnection>(
    (connections ?? []).map((c) => [c.imei, c])
  );

  const connectedCount = (vehicles ?? []).filter((v) => v.deviceId && connectionMap.has(v.deviceId)).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Device Diagnostics</h1>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Registered Devices</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold">{(vehicles ?? []).length}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Live TCP Connections</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-green-600">{connectedCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Unknown IMEIs Seen</p>
            {unknownLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${(unknownDevices ?? []).length > 0 ? "text-yellow-600" : ""}`}>
                {(unknownDevices ?? []).length}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle / device table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Registered Vehicles &amp; Device Status
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (vehicles ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No vehicles registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Vehicle</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">IMEI / Device ID</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Last Packet</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Packets</th>
                  </tr>
                </thead>
                <tbody>
                  {(vehicles ?? []).map((vehicle) => {
                    const conn = vehicle.deviceId ? connectionMap.get(vehicle.deviceId) : undefined;
                    const isConnected = !!conn;
                    return (
                      <tr
                        key={vehicle.id}
                        className="border-b last:border-0 hover-elevate"
                        data-testid={`row-device-${vehicle.id}`}
                      >
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{vehicle.name}</p>
                          {vehicle.licensePlate && (
                            <p className="text-xs text-muted-foreground font-mono">{vehicle.licensePlate}</p>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {vehicle.deviceId ? (
                            <span className="font-mono text-xs">{vehicle.deviceId}</span>
                          ) : (
                            <span className="text-muted-foreground text-xs italic">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          {isConnected ? (
                            <Badge className="gap-1 text-xs" data-testid={`status-connected-${vehicle.id}`}>
                              <Wifi className="h-3 w-3" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1 text-xs" data-testid={`status-disconnected-${vehicle.id}`}>
                              <WifiOff className="h-3 w-3" />
                              Disconnected
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {conn ? formatRelative(conn.lastPacketAt) : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {conn ? conn.packetCount.toLocaleString() : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unknown IMEI log */}
      {(unknownDevices ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Unknown IMEIs Sending Data
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Device ID / IMEI</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Last Seen</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Speed</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {(unknownDevices ?? []).map((dev, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`row-unknown-${i}`}>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        {dev.deviceId}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatRelative(dev.seenAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {dev.speed} km/h
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {dev.lat.toFixed(5)}, {dev.lng.toFixed(5)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">
        Data refreshes automatically. Connection status reflects active GT06/GT06N TCP sessions on the server.
        If a vehicle is sending data via HTTP, it will not appear as "Connected" here.
      </p>
    </div>
  );
}
