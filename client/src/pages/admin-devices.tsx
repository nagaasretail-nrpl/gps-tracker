import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Wifi, WifiOff, Cpu, AlertTriangle, Activity, Radio } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  // Per-IMEI packet stats (since last server start)
  packetsReceived: number;
  locationsAccepted: number;
  locationsRejected: number;
  lastRejectionReason: string | null;
  lastRejectionAt: string | null;
  // DB-persistent count (survives restart)
  storedToday: number;
}

interface UnknownImeiEntry {
  imei: string;
  remoteAddr: string;
  seenAt: string;
  connectCount: number;
}

interface RawAttemptEntry {
  remoteAddr: string;
  seenAt: string;
  rawHex: string;
  loginCompleted: boolean;
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

  const { data: rawAttempts } = useQuery<RawAttemptEntry[]>({
    queryKey: ["/api/device/raw-attempts"],
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
  const failedAttempts = (rawAttempts ?? []).filter((r) => !r.loginCompleted).length;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <Cpu className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold">Device Diagnostics</h1>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Failed TCP Logins</p>
            <p className={`text-2xl font-bold ${failedAttempts > 0 ? "text-red-600" : ""}`}>
              {failedAttempts}
            </p>
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
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Packets (this session)</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Stored Today</th>
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
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {device.packetsReceived > 0 ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5 font-mono">
                              <span className="text-muted-foreground">Recv</span>
                              <span className="font-medium">{device.packetsReceived.toLocaleString()}</span>
                              <span className="text-muted-foreground/50">·</span>
                              <span className="text-green-600 dark:text-green-400">OK {device.locationsAccepted.toLocaleString()}</span>
                              {device.locationsRejected > 0 && (
                                <>
                                  <span className="text-muted-foreground/50">·</span>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-destructive cursor-help underline decoration-dotted">
                                        Rej {device.locationsRejected.toLocaleString()}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="max-w-72">
                                      <p className="font-medium text-xs mb-0.5">Last rejection reason:</p>
                                      <p className="text-xs">{device.lastRejectionReason}</p>
                                      {device.lastRejectionAt && (
                                        <p className="text-xs text-muted-foreground mt-0.5">{formatRelative(device.lastRejectionAt)}</p>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">
                        {device.storedToday > 0
                          ? device.storedToday.toLocaleString()
                          : "—"}
                      </td>
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

      {/* Raw TCP connection attempts log */}
      {(rawAttempts ?? []).length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
              <Radio className="h-4 w-4" />
              Raw TCP Connection Attempts
              <Badge variant="secondary" className="ml-1">{(rawAttempts ?? []).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Remote Addr</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Seen</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-2 text-xs font-semibold text-muted-foreground">First Bytes (hex)</th>
                  </tr>
                </thead>
                <tbody>
                  {(rawAttempts ?? []).map((attempt, i) => (
                    <tr key={i} className="border-b last:border-0" data-testid={`row-raw-attempt-${i}`}>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{attempt.remoteAddr}</td>
                      <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatRelative(attempt.seenAt)}</td>
                      <td className="px-4 py-2.5 text-xs">
                        {attempt.loginCompleted ? (
                          <Badge variant="secondary" className="text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-400">Login OK</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-400">No Login</Badge>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{attempt.rawHex}</td>
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
