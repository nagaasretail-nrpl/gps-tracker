import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Eye, EyeOff, Save, Settings, Map, CreditCard, Plus, Trash2, LayoutList } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface SubscriptionPlan {
  name: string;
  maxVehicles: number;
  pricePerYear: number;
}

interface AppSetting {
  key: string;
  value: string;
  updatedAt: string;
}

export default function AdminSettings() {
  const { toast } = useToast();

  // Map settings state
  const [showMapsKey, setShowMapsKey] = useState(false);
  const [googleMapsKey, setGoogleMapsKey] = useState("");

  // Payment gateway state
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState("");
  const [razorpayKeySecret, setRazorpayKeySecret] = useState("");
  const [renewalAmount, setRenewalAmount] = useState("");

  // Subscription plans state
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isSavingPlans, setIsSavingPlans] = useState(false);

  // Track whether we have initialized local state from server data.
  // Using refs so they reset on unmount/remount but don't cause extra renders.
  const keyInitialized = useRef(false);
  const paymentInitialized = useRef(false);
  const plansInitialized = useRef(false);

  const { data: settingsData, isLoading } = useQuery<AppSetting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch settings");
      return (await res.json()) as AppSetting[];
    },
  });

  // Initialize form fields from server data (runs on initial data load only)
  useEffect(() => {
    if (!settingsData) return;

    if (!keyInitialized.current) {
      const mapsKey = settingsData.find((s) => s.key === "google_maps_key");
      if (mapsKey) setGoogleMapsKey(mapsKey.value);
      keyInitialized.current = true;
    }

    if (!paymentInitialized.current) {
      const rzpId = settingsData.find((s) => s.key === "razorpay_key_id");
      const rzpSecret = settingsData.find((s) => s.key === "razorpay_key_secret");
      const amount = settingsData.find((s) => s.key === "renewal_amount");
      if (rzpId) setRazorpayKeyId(rzpId.value);
      if (rzpSecret) setRazorpayKeySecret(rzpSecret.value);
      if (amount) setRenewalAmount(amount.value);
      paymentInitialized.current = true;
    }

    if (!plansInitialized.current) {
      const plansSetting = settingsData.find((s) => s.key === "subscription_plans");
      if (plansSetting?.value) {
        try {
          const parsed = JSON.parse(plansSetting.value);
          if (Array.isArray(parsed)) setPlans(parsed);
        } catch {
          // ignore malformed JSON
        }
      }
      plansInitialized.current = true;
    }
  }, [settingsData]);

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

  const updatePlan = (idx: number, field: keyof SubscriptionPlan, value: string) => {
    setPlans(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      if (field === "name") return { ...p, name: value };
      const num = parseInt(value, 10);
      if (field === "maxVehicles") return { ...p, maxVehicles: isNaN(num) ? 0 : num };
      if (field === "pricePerYear") return { ...p, pricePerYear: isNaN(num) ? 0 : num };
      return p;
    }));
  };

  const addPlan = () => {
    setPlans(prev => [...prev, { name: "", maxVehicles: 0, pricePerYear: 0 }]);
  };

  const removePlan = (idx: number) => {
    setPlans(prev => prev.filter((_, i) => i !== idx));
  };

  const savePlans = async () => {
    const invalid = plans.find(p => !p.name.trim() || p.maxVehicles <= 0 || p.pricePerYear <= 0);
    if (invalid) {
      toast({ variant: "destructive", description: "Each plan must have a name, max vehicles > 0, and price > 0" });
      return;
    }
    setIsSavingPlans(true);
    try {
      await saveMutation.mutateAsync({ key: "subscription_plans", value: JSON.stringify(plans) });
    } catch {
      // error already shown
    } finally {
      setIsSavingPlans(false);
    }
  };

  const savePaymentSettings = async () => {
    const amount = parseInt(renewalAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      toast({ variant: "destructive", description: "Renewal amount must be a positive number" });
      return;
    }
    try {
      await Promise.all([
        saveMutation.mutateAsync({ key: "razorpay_key_id", value: razorpayKeyId.trim() }),
        saveMutation.mutateAsync({ key: "razorpay_key_secret", value: razorpayKeySecret.trim() }),
        saveMutation.mutateAsync({ key: "renewal_amount", value: String(amount) }),
      ]);
    } catch {
      // errors already shown via onError
    }
  };

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
                  type={showMapsKey ? "text" : "password"}
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
                  onClick={() => setShowMapsKey(!showMapsKey)}
                  data-testid="button-toggle-maps-key-visibility"
                >
                  {showMapsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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

      {/* Subscription Plans */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <LayoutList className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Subscription Plans</CardTitle>
          </div>
          <CardDescription>
            Define vehicle-based pricing tiers. Users are billed based on how many vehicles they have access to.
            The plan with the lowest max-vehicles that still covers the user's vehicle count is applied automatically.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No plans configured. Add tiers below, or the system will fall back to the fixed renewal amount set in Payment Gateway.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
                <span>Plan Name</span>
                <span>Max Vehicles</span>
                <span>Price/Year (₹)</span>
                <span />
              </div>
              {plans.map((plan, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_120px_120px_40px] gap-2 items-center" data-testid={`row-plan-${idx}`}>
                  <Input
                    value={plan.name}
                    onChange={(e) => updatePlan(idx, "name", e.target.value)}
                    placeholder="e.g. Starter"
                    data-testid={`input-plan-name-${idx}`}
                  />
                  <Input
                    type="number"
                    min="1"
                    value={plan.maxVehicles || ""}
                    onChange={(e) => updatePlan(idx, "maxVehicles", e.target.value)}
                    placeholder="5"
                    data-testid={`input-plan-maxvehicles-${idx}`}
                  />
                  <Input
                    type="number"
                    min="1"
                    value={plan.pricePerYear || ""}
                    onChange={(e) => updatePlan(idx, "pricePerYear", e.target.value)}
                    placeholder="1999"
                    data-testid={`input-plan-price-${idx}`}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removePlan(idx)}
                    data-testid={`button-remove-plan-${idx}`}
                    title="Remove tier"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={addPlan}
              data-testid="button-add-plan"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Tier
            </Button>
            {plans.length > 0 && (
              <Button
                onClick={savePlans}
                disabled={isSavingPlans || isLoading}
                data-testid="button-save-plans"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSavingPlans ? "Saving..." : "Save Plans"}
              </Button>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Plans are matched in order of max vehicles. A user with 7 vehicles and plans at 5 and 15 max
            will be assigned the 15-vehicle plan (₹ price). The highest tier acts as a catch-all.
          </p>
        </CardContent>
      </Card>

      {/* Payment Gateway Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Payment Gateway</CardTitle>
          </div>
          <CardDescription>
            Configure Razorpay credentials to enable subscription renewal payments. Users with an
            expired subscription will be prompted to pay via Razorpay.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="razorpay-key-id">Razorpay Key ID</Label>
            <Input
              id="razorpay-key-id"
              type="text"
              value={razorpayKeyId}
              onChange={(e) => setRazorpayKeyId(e.target.value)}
              placeholder="rzp_live_..."
              disabled={isLoading}
              data-testid="input-razorpay-key-id"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="razorpay-key-secret">Razorpay Key Secret</Label>
            <div className="relative">
              <Input
                id="razorpay-key-secret"
                type={showRazorpaySecret ? "text" : "password"}
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                placeholder="••••••••••••••••"
                disabled={isLoading}
                data-testid="input-razorpay-key-secret"
                className="pr-10"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}
                data-testid="button-toggle-secret-visibility"
              >
                {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="renewal-amount">Renewal Amount (₹)</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">₹</span>
                <Input
                  id="renewal-amount"
                  type="number"
                  min="1"
                  value={renewalAmount}
                  onChange={(e) => setRenewalAmount(e.target.value)}
                  placeholder="1000"
                  disabled={isLoading}
                  data-testid="input-renewal-amount"
                  className="pl-7"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Amount in Indian Rupees that users will pay to renew their subscription for one year.
            </p>
          </div>

          <Button
            onClick={savePaymentSettings}
            disabled={saveMutation.isPending || isLoading}
            data-testid="button-save-payment-settings"
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Payment Settings"}
          </Button>

          {razorpayKeyId && (
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium text-muted-foreground">Configuration status</p>
              <p className="text-foreground">
                {razorpayKeyId && razorpayKeySecret && renewalAmount ? (
                  <span className="text-green-600 dark:text-green-400">
                    Payment gateway is configured. Renewal amount: ₹{renewalAmount}.
                  </span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400">
                    Incomplete configuration — fill in all fields to enable payments.
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
