import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, Zap, Check, AlertCircle, Loader2 } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  maxVehicles: number;
  pricePerYear: number;
  features: string[];
}

interface ActivateResult {
  status: "created" | "existing";
  vehicle: { id: string; name: string; deviceId: string };
  message: string;
}

interface SlotLimitError {
  upgradeRequired: true;
  message: string;
  currentCount: number;
  maxVehicles: number;
}

interface BillingPageProps {
  defaultTab?: "plans" | "activate" | "status";
}

export default function BillingPage({ defaultTab = "plans" }: BillingPageProps) {
  const { toast } = useToast();
  const [imei, setImei] = useState("");
  const [vehicleName, setVehicleName] = useState("");
  const [activateResult, setActivateResult] = useState<ActivateResult | null>(null);
  const [slotLimitError, setSlotLimitError] = useState<SlotLimitError | null>(null);

  const { data: plansData, isLoading: plansLoading } = useQuery<{ plans: Plan[] }>({
    queryKey: ["/api/billing/plans"],
  });

  const { data: paymentStatus } = useQuery<{
    configured: boolean;
    amount: number | null;
    vehicleCount: number;
    planName: string | null;
  }>({ queryKey: ["/api/payments/status"] });

  const plans = plansData?.plans ?? [];

  const activateMutation = useMutation({
    mutationFn: async (data: { imei: string; name?: string }) => {
      const res = await apiRequest("POST", "/api/billing/activate", data);
      const json = await res.json();
      if (res.status === 422 && json.upgradeRequired) {
        throw { isSlotLimit: true, data: json as SlotLimitError };
      }
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Activation failed");
      return json as ActivateResult;
    },
    onSuccess: (result: ActivateResult) => {
      setActivateResult(result);
      setSlotLimitError(null);
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      if (result.status === "created") {
        toast({ title: "Device activated", description: result.message });
      } else {
        toast({ title: "Device already exists", description: result.message });
      }
    },
    onError: (err: unknown) => {
      const e = err as { isSlotLimit?: boolean; data?: SlotLimitError; message?: string };
      if (e?.isSlotLimit && e.data) {
        setSlotLimitError(e.data);
        setActivateResult(null);
      } else {
        toast({ title: "Activation failed", description: e?.message ?? "Failed to activate device", variant: "destructive" });
      }
    },
  });

  const handleActivate = () => {
    if (imei.trim().length < 10) {
      toast({ title: "IMEI must be at least 10 characters", variant: "destructive" });
      return;
    }
    setActivateResult(null);
    setSlotLimitError(null);
    activateMutation.mutate({ imei: imei.trim(), name: vehicleName.trim() || undefined });
  };

  const tierColor = (name: string) => {
    if (name.toLowerCase().includes("fleet")) return "border-primary";
    if (name.toLowerCase().includes("pro")) return "border-blue-400 dark:border-blue-500";
    return "";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold" data-testid="heading-billing">Billing & Activation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Manage your subscription and activate new devices</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue={defaultTab}>
          <TabsList data-testid="tabs-billing">
            <TabsTrigger value="plans" data-testid="tab-plans">Plans</TabsTrigger>
            <TabsTrigger value="activate" data-testid="tab-activate">Activate Device</TabsTrigger>
            <TabsTrigger value="status" data-testid="tab-status">Current Plan</TabsTrigger>
          </TabsList>

          <TabsContent value="plans" className="mt-4">
            <div className="mb-4">
              <h2 className="text-base font-medium">Subscription Plans</h2>
              <p className="text-sm text-muted-foreground">Per-vehicle annual pricing in INR</p>
            </div>
            {plansLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse"><CardContent className="p-6 h-64" /></Card>)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={`relative ${tierColor(plan.name)}`} data-testid={`card-plan-${plan.id}`}>
                    {plan.name.toLowerCase().includes("fleet") && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>Up to {plan.maxVehicles} vehicles</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">₹{plan.pricePerYear.toLocaleString("en-IN")}</span>
                        <span className="text-muted-foreground text-sm">/vehicle/year</span>
                      </div>
                      <ul className="space-y-2">
                        {(plan.features ?? []).map((f) => (
                          <li key={f} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                    <CardFooter>
                      <Button className="w-full" variant={plan.name.toLowerCase().includes("fleet") ? "default" : "outline"} data-testid={`button-plan-${plan.id}`}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Choose {plan.name}
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Payments are processed via Razorpay. Contact your administrator to upgrade your plan.
              GST as applicable.
            </p>
          </TabsContent>

          <TabsContent value="activate" className="mt-4">
            <Card className="max-w-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Activate a Device
                </CardTitle>
                <CardDescription>
                  Enter the IMEI number from your GPS tracker to register it in the system.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="imei-input">IMEI Number *</Label>
                  <Input
                    id="imei-input"
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    placeholder="e.g. 864285061234567"
                    maxLength={20}
                    data-testid="input-imei"
                  />
                  <p className="text-xs text-muted-foreground">Usually 15 digits, printed on the device label or via SMS *#06#</p>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="vehicle-name-input">Vehicle Name (optional)</Label>
                  <Input
                    id="vehicle-name-input"
                    value={vehicleName}
                    onChange={(e) => setVehicleName(e.target.value)}
                    placeholder="e.g. Truck 01 or Delhi Van"
                    data-testid="input-vehicle-name"
                  />
                </div>

                {slotLimitError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 space-y-3" data-testid="slot-limit-error">
                    <div className="flex items-start gap-2 text-sm">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                      <div>
                        <div className="font-semibold text-destructive">Plan limit reached</div>
                        <div className="text-muted-foreground mt-0.5">{slotLimitError.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Using {slotLimitError.currentCount} / {slotLimitError.maxVehicles} vehicle slots
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-medium">To add more vehicles, upgrade your plan:</div>
                    <div className="flex flex-wrap gap-2">
                      {plans.filter(p => p.maxVehicles > slotLimitError.maxVehicles).map(p => (
                        <Button key={p.id} size="default" variant="outline" className="flex-1 min-w-0" data-testid={`button-upgrade-${p.id}`}
                          onClick={() => toast({ title: "Contact support", description: `To upgrade to ${p.name} (up to ${p.maxVehicles} vehicles), contact your Nistagps administrator or call support.` })}>
                          <CreditCard className="h-4 w-4 mr-2 shrink-0" />
                          <span className="truncate">Upgrade to {p.name} — ₹{p.pricePerYear.toLocaleString("en-IN")}/vehicle/yr</span>
                        </Button>
                      ))}
                      {plans.filter(p => p.maxVehicles > slotLimitError.maxVehicles).length === 0 && (
                        <p className="text-xs text-muted-foreground">Contact support for enterprise options.</p>
                      )}
                    </div>
                  </div>
                )}

                {activateResult && (
                  <div className={`rounded-md border p-3 flex items-start gap-2 text-sm ${
                    activateResult.status === "created"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300"
                      : "border-yellow-300 bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300"
                  }`} data-testid="activation-result">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium">{activateResult.status === "created" ? "Device registered!" : "Already registered"}</div>
                      <div>{activateResult.message}</div>
                      <div className="text-xs mt-1">Vehicle: <strong>{activateResult.vehicle.name}</strong></div>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleActivate} disabled={activateMutation.isPending} data-testid="button-activate">
                  {activateMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Activating…</>
                  ) : (
                    <><Zap className="h-4 w-4 mr-2" />Activate Device</>
                  )}
                </Button>
              </CardFooter>
            </Card>

            <div className="mt-6 max-w-lg">
              <h3 className="text-sm font-medium mb-2">Activation Steps</h3>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Enter the IMEI from your GPS tracker above</li>
                <li>Click Activate Device to register it in the system</li>
                <li>Insert a SIM with GPRS/4G data plan into the tracker</li>
                <li>Configure APN settings via SMS (see device manual)</li>
                <li>Set server IP to your GPS server address, port 5023 (for GT06 devices)</li>
                <li>The device should appear online in Live Tracking within minutes</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="status" className="mt-4">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Current Subscription</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentStatus ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Plan</span>
                      <Badge variant="secondary" data-testid="badge-plan-name">{paymentStatus.planName ?? "Custom"}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Active Vehicles</span>
                      <span className="font-medium" data-testid="text-vehicle-count">{paymentStatus.vehicleCount}</span>
                    </div>
                    {paymentStatus.amount != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Annual Renewal</span>
                        <span className="font-medium" data-testid="text-renewal-amount">₹{paymentStatus.amount.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                    {!paymentStatus.configured && (
                      <p className="text-xs text-muted-foreground border rounded-md p-2">
                        Payment gateway not configured. Contact your administrator to set up billing.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Loading subscription status…</div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" onClick={() => window.location.href = "/renew"} data-testid="button-renew">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Renew Subscription
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
