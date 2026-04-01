import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, WifiOff, Cpu, AlertTriangle, Activity } from "lucide-react";
import type { User } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

interface DeviceConnectionInfo {
  imei: string;
  vehicleId: string;
  vehicleName: string;
  remoteAddr: string | null;
  connectedAt: string | null;
  lastPacketAt: string | null;
  packetCount: number;
  connected: boolean;
  recentlyActive: boolean;
  lastLocationAt: string | null;
  lastRejection: { reason: string; at: string; count: number } | null;
}

interface UnknownImeiEntry {
  imei: string;
  remoteAddr: string;
  seenAt: string;
  connectCount: number;
}

function formatRelative(ts: string | Date | null | undefined): string {
  if (!ts) return "—";
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

  const { data: connections, isLoading: connectionsLoading } = useQuery<DeviceConnectionInfo[]>({
    queryKey: ["/api/device/connections"],
    refetchInterval: 5000,
    enabled: isAdmin,
  });

  const { data: unknownDevices, isLoading: unknownLoading } = useQuery<UnknownImeiEntry[]>({
    queryKey: ["/api/device/unknown"],
    refetchInterval: 10000,
    enabled: isAdmin,
  });

  if (authFetched && !isAdmin) {
    navigate("/tracking");
    return null;
  }

  const isLoading = connectionsLoading;

  const connectedCount = (connections ?? []).filter((d) => d.connected).length;
  const recentlyActiveCount = (connections ?? []).filter((d) => !d.connected && d.recentlyActive).length;
  const unknownCount = (unknownDevices ?? []).length;

  const hasRejections = (connections ?? []).some((d) => d.lastRejection !== null);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Device Diagnostics</h1>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Registered Devices</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold">{(connections ?? []).length}</p>
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
            <p className="text-xs text-muted-foreground mb-1">Recently Active</p>
            {isLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold text-amber-600">{recentlyActiveCount}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Unknown IMEIs Seen</p>
            {unknownLoading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className={`text-2xl font-bold ${unknownCount > 0 ? "text-yellow-600" : ""}`}>
                {unknownCount}
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
          ) : (connections ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No vehicles registered.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Vehicle</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">IMEI / Device ID</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Last Location</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">TCP Packets</th>
                    {hasRejections && (
                      <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Last Rejection</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(connections ?? []).map((device) => (
                    <tr
                      key={device.vehicleId}
                      className="border-b last:border-0 hover-elevate"
                      data-testid={`row-device-${device.vehicleId}`}
                    >
                      <td className="px-4 py-2.5">
                        <p className="font-medium">{device.vehicleName}</p>
                      </td>
                      <td className="px-4 py-2.5">
                        {device.imei ? (
                          <span className="font-mono text-xs">{device.imei}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs italic">Not set</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {device.connected ? (
                          <Badge className="gap-1 text-xs bg-green-600 hover:bg-green-600" data-testid={`status-connected-${device.vehicleId}`}>
                            <Wifi className="h-3 w-3" />
                            Connected
                          </Badge>
                        ) : device.recentlyActive ? (
                          <Badge className="gap-1 text-xs bg-amber-500 hover:bg-amber-500" data-testid={`status-recent-${device.vehicleId}`}>
                            <Activity className="h-3 w-3" />
                            Recently Active
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1 text-xs" data-testid={`status-disconnected-${device.vehicleId}`}>
                            <WifiOff className="h-3 w-3" />
                            Disconnected
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {device.lastLocationAt
                          ? formatRelative(device.lastLocationAt)
                          : device.lastPacketAt
                          ? formatRelative(device.lastPacketAt)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {device.packetCount > 0 ? device.packetCount.toLocaleString() : "—"}
                      </td>
                      {hasRejections && (
                        <td className="px-4 py-2.5 text-xs">
                          {device.lastRejection ? (
                            <div>
                              <p className="text-destructive font-medium truncate max-w-48" title={device.lastRejection.reason}>
                                {device.lastRejection.reason}
                              </p>
                              <p className="text-muted-foreground">
                                {device.lastRejection.count}× · {formatRelative(device.lastRejection.at)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Unknown IMEI log */}
      {unknownCount > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Unknown IMEIs Connecting
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">IMEI</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Last Seen</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Connect Count</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Remote Addr</th>
                  </tr>
                </thead>
                <tbody>
                  {(unknownDevices ?? []).map((dev, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`row-unknown-${i}`}>
                      <td className="px-4 py-2.5 font-mono text-xs font-medium text-yellow-700 dark:text-yellow-400">
                        {dev.imei}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {formatRelative(dev.seenAt)}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {dev.connectCount}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">
                        {dev.remoteAddr}
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
        <strong>Connected</strong> = active TCP session right now. <strong>Recently Active</strong> = location received within last 3 minutes (TCP session dropped after restart — device will reconnect automatically). Data refreshes every 5 seconds.
      </p>
    </div>
  );
}
