import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, CreditCard, Car } from "lucide-react";
import type { User } from "@shared/schema";

interface PaymentStatus {
  configured: boolean;
  amount: number | null;
  unitRate: number | null;
  vehicleCount: number;
  planName: string | null;
}

const SUBSCRIPTION_LABELS: Record<string, string> = {
  basic: "Basic",
  premium: "Premium",
  pro: "Pro",
  enterprise: "Enterprise",
};

function formatExpiry(raw: Date | string | null | undefined): string {
  if (!raw) return "—";
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getDaysInfo(raw: Date | string | null | undefined): { days: number; expired: boolean } | null {
  if (!raw) return null;
  const d = new Date(raw as string);
  if (isNaN(d.getTime())) return null;
  const diffMs = d.getTime() - Date.now();
  const days = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
  return { days, expired: diffMs < 0 };
}

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: user, isLoading } = useQuery<Omit<User, "password">>({
    queryKey: ["/api/auth/me"],
    select: (data: unknown) => {
      const d = data as { user?: Omit<User, "password"> } | Omit<User, "password">;
      if (d && "user" in d && d.user) return d.user;
      return d as Omit<User, "password">;
    },
  });

  const { data: paymentStatus, isLoading: paymentLoading } = useQuery<PaymentStatus>({
    queryKey: ["/api/payments/status"],
    enabled: !!user && user.role !== "admin",
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/users/${user?.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Profile updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setIsEditing(false);
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to update profile" });
    },
  });

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (!user) return <div className="p-8 text-center">User not found</div>;

  const displayName = user.name || user.phone || user.email || "User";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase();
  const expiryInfo = getDaysInfo(user.subscriptionExpiry);

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <CardTitle>My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={user.avatar || ""} />
              <AvatarFallback className="text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-muted-foreground">{user.email}</p>
              <p className="text-sm text-muted-foreground capitalize">
                Role: {user.role}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Details */}
      {!isEditing ? (
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Name</p>
                <p>{user.name}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p>{user.email}</p>
              </div>
              {user.phone && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Phone</p>
                  <p>{user.phone}</p>
                </div>
              )}
              {user.department && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Department</p>
                  <p>{user.department}</p>
                </div>
              )}
            </div>
            <Button onClick={() => {
              setFormData({
                name: user.name,
                phone: user.phone || "",
                department: user.department || "",
              });
              setIsEditing(true);
            }} data-testid="button-edit-profile">
              Edit Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-profile-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Phone</label>
              <Input
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
                data-testid="input-profile-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <Input
                value={formData.department || ""}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                placeholder="e.g., Fleet Operations"
                data-testid="input-profile-department"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => updateMutation.mutate(formData)}
                disabled={updateMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsEditing(false)}
                data-testid="button-cancel-profile"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subscription section — only for non-admin users */}
      {user.role !== "admin" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {paymentLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i}>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-5 w-32" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Plan</p>
                  <p className="font-semibold" data-testid="text-subscription-plan">
                    {paymentStatus?.planName ?? SUBSCRIPTION_LABELS[user.subscriptionType ?? "basic"] ?? "Basic"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Vehicles</p>
                  <p className="flex items-center gap-1" data-testid="text-subscription-vehicles">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    {paymentStatus?.vehicleCount ?? "—"}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                  <p data-testid="text-subscription-expiry">
                    {formatExpiry(user.subscriptionExpiry)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  {expiryInfo === null ? (
                    <p className="text-muted-foreground" data-testid="text-subscription-status">No expiry set</p>
                  ) : expiryInfo.expired ? (
                    <p className="text-red-500 font-medium" data-testid="text-subscription-status">
                      Expired {expiryInfo.days} day{expiryInfo.days !== 1 ? "s" : ""} ago
                    </p>
                  ) : (
                    <p className="text-green-600 dark:text-green-400 font-medium" data-testid="text-subscription-status">
                      {expiryInfo.days} day{expiryInfo.days !== 1 ? "s" : ""} remaining
                    </p>
                  )}
                </div>

                {paymentStatus?.unitRate != null && paymentStatus.unitRate > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rate</p>
                    <p className="font-semibold" data-testid="text-subscription-unit-rate">
                      ₹{paymentStatus.unitRate.toLocaleString("en-IN")}/vehicle/yr
                    </p>
                  </div>
                )}
                {paymentStatus?.amount != null && paymentStatus.amount > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Renewal Total
                      {paymentStatus.vehicleCount > 1 && paymentStatus.unitRate != null && (
                        <span className="font-normal ml-1">({paymentStatus.vehicleCount} vehicles)</span>
                      )}
                    </p>
                    <p className="font-semibold text-lg text-primary" data-testid="text-subscription-amount">
                      ₹{paymentStatus.amount.toLocaleString("en-IN")}/yr
                    </p>
                  </div>
                )}
              </div>
            )}

            <Button asChild data-testid="button-renew-subscription">
              <Link href="/renew">Renew Subscription</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
