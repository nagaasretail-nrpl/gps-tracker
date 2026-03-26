import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Gauge,
  ParkingSquare,
  Timer,
  Shield,
  Bell,
  BellOff,
  CheckCircle,
  Clock,
  Smartphone,
  SmartphoneNfc,
} from "lucide-react";
import type { UserAlertSettings, Event, Vehicle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

const ALERT_EVENT_TYPES = ["speed_violation", "parking", "idle", "geofence_entry", "geofence_exit"];

function requestNotificationPermission() {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission();
  }
}

function NotificationPermissionBanner() {
  const [permission, setPermission] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );

  const request = async () => {
    if ("Notification" in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
  };

  if (permission === "granted" || permission === "unsupported") return null;

  return (
    <Card className="border-yellow-500/30 bg-yellow-500/5">
      <CardContent className="flex items-center gap-3 py-3 px-4">
        {permission === "denied" ? (
          <BellOff className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        ) : (
          <Bell className="h-4 w-4 text-yellow-600 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {permission === "denied" ? (
            <p className="text-xs text-muted-foreground">
              Browser notifications are blocked. Enable them in your browser settings to receive alerts.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Allow browser notifications to receive vehicle alerts even when you switch tabs.
            </p>
          )}
        </div>
        {permission !== "denied" && (
          <Button size="sm" variant="outline" onClick={request} data-testid="button-allow-notifications">
            Allow
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Push subscription card — enables Web Push so alerts arrive even when the browser is closed
function PushSubscriptionCard() {
  const { toast } = useToast();
  const [pushState, setPushState] = useState<"loading" | "unsupported" | "subscribed" | "unsubscribed">("loading");
  const [isBusy, setIsBusy] = useState(false);

  const supportsWebPush =
    "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

  useEffect(() => {
    if (!supportsWebPush) {
      setPushState("unsupported");
      return;
    }
    navigator.serviceWorker.ready.then((reg) => {
      reg.pushManager.getSubscription().then((sub) => {
        setPushState(sub ? "subscribed" : "unsubscribed");
      });
    });
  }, []);

  const subscribe = async () => {
    if (!supportsWebPush) return;
    setIsBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in browser settings to use push alerts.", variant: "destructive" });
        return;
      }

      // Get VAPID public key from server
      const keyRes = await apiRequest("GET", "/api/push/vapid-public-key");
      const { publicKey } = await keyRes.json();

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await apiRequest("POST", "/api/push/subscribe", sub.toJSON());
      setPushState("subscribed");
      toast({ title: "Push notifications enabled", description: "You will receive vehicle alerts on this device." });
    } catch (err) {
      console.error("[push] subscribe error:", err);
      toast({ title: "Error", description: "Failed to enable push notifications.", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  const unsubscribe = async () => {
    if (!supportsWebPush) return;
    setIsBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await apiRequest("DELETE", "/api/push/subscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setPushState("unsubscribed");
      toast({ title: "Push notifications disabled" });
    } catch (err) {
      console.error("[push] unsubscribe error:", err);
      toast({ title: "Error", description: "Failed to disable push notifications.", variant: "destructive" });
    } finally {
      setIsBusy(false);
    }
  };

  if (pushState === "loading") {
    return <Skeleton className="h-20" />;
  }

  if (pushState === "unsupported") {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {pushState === "subscribed" ? (
              <SmartphoneNfc className="h-4 w-4 text-primary flex-shrink-0" />
            ) : (
              <Smartphone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            )}
            <div className="min-w-0">
              <CardTitle className="text-sm">Push Notifications</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {pushState === "subscribed"
                  ? "This device will receive alerts even when the app is closed."
                  : "Enable to receive alerts on this device even when the app is closed."}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {pushState === "subscribed" && (
              <Badge variant="secondary" className="text-xs" data-testid="badge-push-enabled">
                Active
              </Badge>
            )}
            {pushState === "subscribed" ? (
              <Button
                size="sm"
                variant="outline"
                onClick={unsubscribe}
                disabled={isBusy}
                data-testid="button-push-unsubscribe"
              >
                {isBusy ? "Disabling…" : "Disable"}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={subscribe}
                disabled={isBusy}
                data-testid="button-push-subscribe"
              >
                {isBusy ? "Enabling…" : "Enable"}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

// Convert base64url string to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

function AlertSection({
  icon: Icon,
  title,
  description,
  enabled,
  onToggle,
  threshold,
  thresholdUnit,
  thresholdMin,
  thresholdMax,
  onThresholdChange,
  testId,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  threshold?: number;
  thresholdUnit?: string;
  thresholdMin?: number;
  thresholdMax?: number;
  onThresholdChange?: (v: number) => void;
  testId: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Icon className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="min-w-0">
              <CardTitle className="text-sm">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
            </div>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={onToggle}
            data-testid={`switch-${testId}`}
          />
        </div>
      </CardHeader>
      {threshold !== undefined && onThresholdChange && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2">
            <Label htmlFor={`threshold-${testId}`} className="text-xs text-muted-foreground whitespace-nowrap">
              Alert threshold
            </Label>
            <Input
              id={`threshold-${testId}`}
              type="number"
              min={thresholdMin}
              max={thresholdMax}
              value={threshold}
              disabled={!enabled}
              onChange={(e) => onThresholdChange(parseInt(e.target.value, 10) || 1)}
              className="w-24 text-sm"
              data-testid={`input-threshold-${testId}`}
            />
            <span className="text-xs text-muted-foreground">{thresholdUnit}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function AlertHistory({ vehicles }: { vehicles: Vehicle[] | undefined }) {
  const { data: events, isLoading } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const vehicleMap = new Map((vehicles ?? []).map((v) => [v.id, v.name]));

  const alertEvents = (events ?? [])
    .filter((e) => ALERT_EVENT_TYPES.includes(e.type))
    .slice(0, 50);

  const formatTime = (ts: Date | string) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return d.toLocaleDateString();
  };

  const severityColor: Record<string, string> = {
    info: "secondary",
    warning: "outline",
    critical: "destructive",
  };

  const typeLabel: Record<string, string> = {
    speed_violation: "Speed",
    parking: "Parking",
    idle: "Idle",
    geofence_entry: "Geofence Entry",
    geofence_exit: "Geofence Exit",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Clock className="h-4 w-4" />
        Recent Alerts
      </h3>
      {isLoading ? (
        [1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)
      ) : alertEvents.length > 0 ? (
        <div className="space-y-2">
          {alertEvents.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 p-3 rounded-md border bg-card text-sm"
              data-testid={`row-alert-${event.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={(severityColor[event.severity ?? "info"] ?? "secondary") as "secondary" | "outline" | "destructive"} className="text-xs">
                    {typeLabel[event.type] ?? event.type}
                  </Badge>
                  <span className="text-xs font-medium truncate">
                    {vehicleMap.get(event.vehicleId) ?? event.vehicleId}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{event.description}</p>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                {formatTime(event.timestamp)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No alerts recorded yet</p>
        </div>
      )}
    </div>
  );
}

export default function AlertSettings() {
  const { toast } = useToast();

  const { data: saved, isLoading } = useQuery<UserAlertSettings>({
    queryKey: ["/api/alert-settings"],
  });

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const [form, setForm] = useState<Omit<UserAlertSettings, "userId">>({
    speedAlertEnabled: false,
    speedThresholdKph: 80,
    parkingAlertEnabled: false,
    parkingThresholdMin: 60,
    idleAlertEnabled: false,
    idleThresholdMin: 10,
    geofenceAlertEnabled: true,
  });

  useEffect(() => {
    if (saved) {
      setForm({
        speedAlertEnabled: saved.speedAlertEnabled,
        speedThresholdKph: saved.speedThresholdKph,
        parkingAlertEnabled: saved.parkingAlertEnabled,
        parkingThresholdMin: saved.parkingThresholdMin,
        idleAlertEnabled: saved.idleAlertEnabled,
        idleThresholdMin: saved.idleThresholdMin,
        geofenceAlertEnabled: saved.geofenceAlertEnabled,
      });
    }
  }, [saved]);

  const saveMutation = useMutation({
    mutationFn: async (data: Omit<UserAlertSettings, "userId">) => {
      return await apiRequest("PUT", "/api/alert-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alert-settings"] });
      requestNotificationPermission();
      toast({ title: "Alert settings saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save alert settings.", variant: "destructive" });
    },
  });

  const update = (key: keyof typeof form, value: boolean | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          <div>
            <h1 className="text-xl font-semibold" data-testid="text-page-title">Alert Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Configure which vehicle events trigger notifications on this device.
            </p>
          </div>

          <NotificationPermissionBanner />

          <PushSubscriptionCard />

          {isLoading ? (
            [1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)
          ) : (
            <div className="space-y-3">
              <AlertSection
                icon={Gauge}
                title="Speed Alert"
                description="Notify when a vehicle exceeds the speed threshold"
                enabled={form.speedAlertEnabled}
                onToggle={(v) => update("speedAlertEnabled", v)}
                threshold={form.speedThresholdKph}
                thresholdUnit="km/h"
                thresholdMin={20}
                thresholdMax={300}
                onThresholdChange={(v) => update("speedThresholdKph", v)}
                testId="speed"
              />

              <AlertSection
                icon={ParkingSquare}
                title="Parking Alert"
                description="Notify when a vehicle has been stationary for too long"
                enabled={form.parkingAlertEnabled}
                onToggle={(v) => update("parkingAlertEnabled", v)}
                threshold={form.parkingThresholdMin}
                thresholdUnit="minutes"
                thresholdMin={5}
                thresholdMax={480}
                onThresholdChange={(v) => update("parkingThresholdMin", v)}
                testId="parking"
              />

              <AlertSection
                icon={Timer}
                title="Idle Alert"
                description="Notify when a vehicle is live but not moving (engine on, speed 0)"
                enabled={form.idleAlertEnabled}
                onToggle={(v) => update("idleAlertEnabled", v)}
                threshold={form.idleThresholdMin}
                thresholdUnit="minutes"
                thresholdMin={1}
                thresholdMax={120}
                onThresholdChange={(v) => update("idleThresholdMin", v)}
                testId="idle"
              />

              <AlertSection
                icon={Shield}
                title="Geofence Alert"
                description="Notify when a vehicle enters or exits a geofence boundary"
                enabled={form.geofenceAlertEnabled}
                onToggle={(v) => update("geofenceAlertEnabled", v)}
                testId="geofence"
              />

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending}
                  data-testid="button-save-alert-settings"
                >
                  {saveMutation.isPending ? "Saving…" : "Save Settings"}
                </Button>
              </div>
            </div>
          )}

          <div className="border-t pt-6">
            <AlertHistory vehicles={vehicles} />
          </div>
        </div>
      </div>
    </div>
  );
}
