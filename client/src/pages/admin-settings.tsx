import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Save, Settings, Map } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();
  const [showKey, setShowKey] = useState(false);
  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [keyLoaded, setKeyLoaded] = useState(false);

  const { isLoading } = useQuery<AppSetting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      const data: AppSetting[] = await res.json();
      const mapsKey = data.find((s) => s.key === "google_maps_key");
      if (mapsKey && !keyLoaded) {
        setGoogleMapsKey(mapsKey.value);
        setKeyLoaded(true);
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save setting");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ description: "Settings saved successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", description: err.message });
    },
  });

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Settings</h1>
          <p className="text-sm text-muted-foreground">Configure system-wide settings for GPS Tracker</p>
        </div>
      </div>

      <Separator />

      {/* Map Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Map className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Map Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the mapping provider used across the app. A Google Maps API key enables
            high-quality satellite and street maps.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-maps-key">Google Maps API Key</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="google-maps-key"
                  type={showKey ? "text" : "password"}
                  value={googleMapsKey}
                  onChange={(e) => setGoogleMapsKey(e.target.value)}
                  placeholder="AIza..."
                  disabled={isLoading}
                  data-testid="input-google-maps-key"
                  className="pr-10"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowKey(!showKey)}
                  data-testid="button-toggle-key-visibility"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <Button
                onClick={() => saveMutation.mutate({ key: "google_maps_key", value: googleMapsKey })}
                disabled={saveMutation.isPending || isLoading}
                data-testid="button-save-maps-key"
              >
                <Save className="h-4 w-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from the{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                Google Cloud Console
              </a>
              . Enable the Maps JavaScript API for your project.
            </p>
          </div>

          {googleMapsKey && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-muted-foreground">Key status</p>
              <p className="text-foreground">
                Key is configured ({googleMapsKey.length} characters).{" "}
                {googleMapsKey.startsWith("AIza") ? (
                  <span className="text-green-600 dark:text-green-400">Looks like a valid Google API key.</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Google API keys typically start with "AIza".
                  </span>
                )}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
