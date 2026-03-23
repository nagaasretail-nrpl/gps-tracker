import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, User as UserIcon, ChevronDown, ChevronUp, ChevronRight, Car, Menu, Search, X } from "lucide-react";
import type { User, Vehicle } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

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

function getPlanByType(subscriptionType: string, plans: SubscriptionPlan[]): SubscriptionPlan | null {
  if (!plans.length) return null;
  const key = subscriptionType.toLowerCase();
  // Case-insensitive match; fall back to lowest-priced plan if no match found.
  return (
    plans.find((p) => p.name.toLowerCase() === key) ??
    [...plans].sort((a, b) => a.pricePerYear - b.pricePerYear)[0]
  );
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  basic: "Basic",
  premium: "Premium",
  pro: "Pro",
  enterprise: "Enterprise",
};

const ASSIGNABLE_MENU_GROUPS = [
  {
    label: "Personal Tracking",
    items: [
      { title: "Track Activity", url: "/track" },
      { title: "My Activities", url: "/activities" },
      { title: "Statistics", url: "/stats" },
    ],
  },
  {
    label: "Fleet Management",
    items: [
      { title: "Fleet Dashboard", url: "/" },
      { title: "Live Tracking", url: "/tracking" },
      { title: "Vehicles", url: "/vehicles" },
      { title: "Trips", url: "/trips" },
      { title: "Location History", url: "/history" },
      { title: "Geofences", url: "/geofences" },
      { title: "Routes", url: "/routes" },
      { title: "Points of Interest", url: "/pois" },
      { title: "Reports", url: "/reports" },
    ],
  },
  {
    label: "Account",
    items: [
      { title: "My Profile", url: "/profile" },
    ],
  },
];

const ALL_MENU_URLS = ASSIGNABLE_MENU_GROUPS.flatMap((g) => g.items.map((i) => i.url));

function oneYearFromNow(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split("T")[0];
}

interface EditState {
  status: string;
  subscriptionType: string;
  subscriptionExpiry: string;
  allowedVehicleIds: string[];
  allowedMenus: string[] | null;
  role: string;
  phone: string;
  email: string;
  department: string;
}

function buildEditState(user: UserWithoutPassword): EditState {
  return {
    status: user.status ?? "active",
    subscriptionType: user.subscriptionType ?? "basic",
    subscriptionExpiry: user.subscriptionExpiry
      ? new Date(user.subscriptionExpiry).toISOString().split("T")[0]
      : "",
    allowedVehicleIds: user.allowedVehicleIds ?? [],
    allowedMenus: user.allowedMenus ?? null,
    role: user.role,
    phone: user.phone ?? "",
    email: user.email ?? "",
    department: user.department ?? "",
  };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [newUser, setNewUser] = useState({ name: "", phone: "", password: "", role: "user" });
  const [openMenuPanels, setOpenMenuPanels] = useState<Record<string, boolean>>({});
  const [vehicleSearches, setVehicleSearches] = useState<Record<string, string>>({});
  const [userToDelete, setUserToDelete] = useState<UserWithoutPassword | null>(null);
  const [deleteUserConfirmText, setDeleteUserConfirmText] = useState("");
  const [passwordInputs, setPasswordInputs] = useState<Record<string, string>>({});

  const { data: users = [], isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const { data: settingsData = [] } = useQuery<AppSetting[]>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings", { credentials: "include" });
      if (!res.ok) throw new Error("Failed");
      return res.json() as Promise<AppSetting[]>;
    },
  });

  const subscriptionPlans: SubscriptionPlan[] = (() => {
    const s = settingsData.find((x) => x.key === "subscription_plans");
    if (!s?.value) return [];
    try { return JSON.parse(s.value) as SubscriptionPlan[]; } catch { return []; }
  })();

  const renewalAmountFallback: number | null = (() => {
    const s = settingsData.find((x) => x.key === "renewal_amount");
    if (!s?.value) return null;
    const n = parseInt(s.value, 10);
    return isNaN(n) ? null : n;
  })();

  const toggleExpand = (user: UserWithoutPassword) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(user.id);
      if (!editStates[user.id]) {
        setEditStates((prev) => ({ ...prev, [user.id]: buildEditState(user) }));
      }
    }
  };

  const updateEditState = (userId: string, partial: Partial<EditState>) => {
    setEditStates((prev) => ({ ...prev, [userId]: { ...prev[userId], ...partial } }));
  };

  const toggleVehicle = (userId: string, vehicleId: string) => {
    const current = editStates[userId]?.allowedVehicleIds ?? [];
    const next = current.includes(vehicleId)
      ? current.filter((id) => id !== vehicleId)
      : [...current, vehicleId];
    updateEditState(userId, { allowedVehicleIds: next });
  };

  const isMenuAllowed = (userId: string, menuUrl: string): boolean => {
    const state = editStates[userId];
    if (!state) return true;
    if (state.allowedMenus === null) return true;
    return state.allowedMenus.includes(menuUrl);
  };

  const toggleMenu = (userId: string, menuUrl: string) => {
    const state = editStates[userId];
    if (!state) return;
    const current = state.allowedMenus;
    if (current === null) {
      // Currently unrestricted — uncheck one menu to start restricting
      updateEditState(userId, { allowedMenus: ALL_MENU_URLS.filter((u) => u !== menuUrl) });
    } else if (current.includes(menuUrl)) {
      const next = current.filter((u) => u !== menuUrl);
      // When last menu is unchecked, reset to null (unrestricted = all menus)
      updateEditState(userId, { allowedMenus: next.length === 0 ? null : next });
    } else {
      const next = [...current, menuUrl];
      // When all menus are checked, collapse back to null (unrestricted)
      updateEditState(userId, { allowedMenus: next.length >= ALL_MENU_URLS.length ? null : next });
    }
  };

  const allowAllMenus = (userId: string) => {
    updateEditState(userId, { allowedMenus: null });
  };

  const handleStatusChange = (userId: string, newStatus: string) => {
    const state = editStates[userId];
    const updates: Partial<EditState> = { status: newStatus };
    if (newStatus === "active") {
      const currentExpiry = state?.subscriptionExpiry ?? "";
      const today = new Date().toISOString().split("T")[0];
      const isBlankOrPast = !currentExpiry || currentExpiry < today;
      if (isBlankOrPast) {
        updates.subscriptionExpiry = oneYearFromNow();
      }
    }
    updateEditState(userId, updates);
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json() as { error?: string };
        throw new Error(err.error ?? "Failed to create user");
      }
      return response.json() as Promise<UserWithoutPassword>;
    },
    onSuccess: () => {
      toast({ description: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setNewUser({ name: "", phone: "", password: "", role: "user" });
      setShowForm(false);
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json() as { error?: string };
        throw new Error(err.error ?? "Failed to update user");
      }
      return response.json() as Promise<UserWithoutPassword>;
    },
    onSuccess: (_, variables) => {
      toast({ description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setExpandedUserId(null);
      setEditStates((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      setPasswordInputs((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
    },
    onError: (err: Error) => {
      toast({ variant: "destructive", description: err.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      toast({ description: "User deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to delete user" });
    },
  });

  const handleSave = (userId: string) => {
    const state = editStates[userId];
    if (!state) return;
    const newPassword = passwordInputs[userId]?.trim();
    if (newPassword && newPassword.length < 8) {
      toast({ variant: "destructive", description: "Password must be at least 8 characters" });
      return;
    }
    const payload: Record<string, unknown> = {
      status: state.status,
      subscriptionType: state.subscriptionType,
      role: state.role,
      phone: state.phone,
      email: state.email || null,
      department: state.department,
      allowedVehicleIds: state.allowedVehicleIds.length > 0 ? state.allowedVehicleIds : null,
      allowedMenus: state.allowedMenus,
      subscriptionExpiry: state.subscriptionExpiry
        ? new Date(state.subscriptionExpiry).toISOString()
        : null,
    };
    if (newPassword) payload.password = newPassword;
    updateMutation.mutate({ id: userId, data: payload });
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") return <Badge variant="default">{role}</Badge>;
    if (role === "subuser") return <Badge variant="outline">{role}</Badge>;
    return <Badge variant="secondary">{role}</Badge>;
  };

  const getStatusSpan = (status: string = "active") => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={() => setShowForm(!showForm)} data-testid="button-create-user">
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Create User Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New User</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="Name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                data-testid="input-new-user-name"
              />
              <Input
                type="tel"
                placeholder="Mobile Number"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                data-testid="input-new-user-phone"
              />
              <Input
                type="password"
                placeholder="Password (min 8 chars)"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="input-new-user-password"
              />
              <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                <SelectTrigger data-testid="select-new-user-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="subuser">Subuser</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => createMutation.mutate(newUser)}
                disabled={createMutation.isPending || !newUser.name || !newUser.phone || !newUser.password}
                data-testid="button-save-new-user"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)} data-testid="button-cancel-create">
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Users List */}
      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center p-8 text-muted-foreground">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No users found</div>
        ) : (
          users.map((user) => {
            const isExpanded = expandedUserId === user.id;
            const state = editStates[user.id];
            const expiry = user.subscriptionExpiry ? new Date(user.subscriptionExpiry) : null;
            const isExpired = expiry !== null && expiry < new Date();
            const assignedCount = user.allowedVehicleIds?.length ?? 0;
            const isSaving = updateMutation.isPending && updateMutation.variables?.id === user.id;
            const menuPanelOpen = openMenuPanels[user.id] ?? false;
            const restrictedMenuCount = user.allowedMenus?.length ?? null;
            const billingVehicleCount = assignedCount > 0 ? assignedCount : vehicles.length;
            const matchedPlan = user.role !== "admin"
              ? getPlanByType(user.subscriptionType ?? "basic", subscriptionPlans)
              : null;
            // unitRate only exists when a real plan is matched (per-vehicle pricing).
            // flatFallback is used when no plans are configured — shown as-is, not multiplied.
            const unitRate = matchedPlan != null ? matchedPlan.pricePerYear : null;
            const flatFallback = matchedPlan == null && user.role !== "admin" ? renewalAmountFallback : null;
            const totalRate = unitRate != null ? unitRate * Math.max(billingVehicleCount, 1) : null;

            return (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{user.name}</span>
                          {getRoleBadge(user.role)}
                          {getStatusSpan(user.status ?? "active")}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.phone ?? user.email ?? "—"}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Plan: <span className="font-medium">
                              {matchedPlan?.name ?? SUBSCRIPTION_LABELS[user.subscriptionType ?? "basic"] ?? user.subscriptionType ?? "Basic"}
                            </span>
                          </span>
                          {expiry && (
                            <span className={`text-xs ${isExpired ? "text-red-500" : "text-muted-foreground"}`}>
                              Expires: {expiry.toLocaleDateString()}{isExpired ? " (expired)" : ""}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {assignedCount > 0 ? `${assignedCount} vehicle${assignedCount !== 1 ? "s" : ""}` : "All vehicles"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Menu className="h-3 w-3" />
                            {restrictedMenuCount !== null && restrictedMenuCount > 0
                              ? `${restrictedMenuCount} menu${restrictedMenuCount !== 1 ? "s" : ""} allowed`
                              : "All menus"}
                          </span>
                          {unitRate != null ? (
                            <span
                              className="text-xs font-semibold text-primary"
                              data-testid={`text-billing-amount-${user.id}`}
                            >
                              ₹{unitRate.toLocaleString("en-IN")}/vehicle/yr
                              {billingVehicleCount > 1 && totalRate != null && (
                                <> · ₹{totalRate.toLocaleString("en-IN")}/yr total</>
                              )}
                            </span>
                          ) : flatFallback != null ? (
                            <span
                              className="text-xs font-semibold text-primary"
                              data-testid={`text-billing-amount-${user.id}`}
                            >
                              ₹{flatFallback.toLocaleString("en-IN")}/yr
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleExpand(user)}
                        data-testid={`button-expand-user-${user.id}`}
                        title={isExpanded ? "Collapse" : "Edit user"}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => setUserToDelete(user)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-user-${user.id}`}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Expandable detail section */}
                  {isExpanded && state && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {/* Phone */}
                        <div className="space-y-1">
                          <Label htmlFor={`phone-${user.id}`}>Phone</Label>
                          <Input
                            id={`phone-${user.id}`}
                            value={state.phone}
                            onChange={(e) => updateEditState(user.id, { phone: e.target.value })}
                            placeholder="+91 9876543210"
                            data-testid={`input-phone-${user.id}`}
                          />
                        </div>

                        {/* Email */}
                        <div className="space-y-1">
                          <Label htmlFor={`email-${user.id}`}>Email (optional)</Label>
                          <Input
                            id={`email-${user.id}`}
                            type="email"
                            value={state.email}
                            onChange={(e) => updateEditState(user.id, { email: e.target.value })}
                            placeholder="e.g. user@example.com"
                            data-testid={`input-email-${user.id}`}
                          />
                        </div>

                        {/* Department */}
                        <div className="space-y-1">
                          <Label htmlFor={`dept-${user.id}`}>Department</Label>
                          <Input
                            id={`dept-${user.id}`}
                            value={state.department}
                            onChange={(e) => updateEditState(user.id, { department: e.target.value })}
                            placeholder="e.g. Fleet Ops"
                            data-testid={`input-department-${user.id}`}
                          />
                        </div>

                        {/* New Password */}
                        <div className="space-y-1">
                          <Label htmlFor={`password-${user.id}`}>New Password <span className="text-muted-foreground font-normal">(leave blank to keep current)</span></Label>
                          <Input
                            id={`password-${user.id}`}
                            type="password"
                            value={passwordInputs[user.id] ?? ""}
                            onChange={(e) => setPasswordInputs((prev) => ({ ...prev, [user.id]: e.target.value }))}
                            placeholder="Min 8 characters"
                            data-testid={`input-password-${user.id}`}
                          />
                        </div>

                        {/* Role */}
                        <div className="space-y-1">
                          <Label>Role</Label>
                          <Select value={state.role} onValueChange={(v) => updateEditState(user.id, { role: v })}>
                            <SelectTrigger data-testid={`select-role-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="subuser">Subuser</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Status — auto-fills expiry on Active */}
                        <div className="space-y-1">
                          <Label>Account Status</Label>
                          <Select
                            value={state.status}
                            onValueChange={(v) => handleStatusChange(user.id, v)}
                          >
                            <SelectTrigger data-testid={`select-status-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                              <SelectItem value="suspended">Suspended</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subscription plan */}
                        <div className="space-y-1">
                          <Label>Subscription Plan</Label>
                          <Select value={state.subscriptionType} onValueChange={(v) => updateEditState(user.id, { subscriptionType: v })}>
                            <SelectTrigger data-testid={`select-subscription-${user.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {subscriptionPlans.length > 0 ? (
                                subscriptionPlans.map((p) => (
                                  <SelectItem key={p.name.toLowerCase()} value={p.name.toLowerCase()}>
                                    {p.name} — ₹{p.pricePerYear.toLocaleString("en-IN")}/vehicle/yr
                                  </SelectItem>
                                ))
                              ) : (
                                <>
                                  <SelectItem value="basic">Basic</SelectItem>
                                  <SelectItem value="premium">Premium</SelectItem>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subscription expiry */}
                        <div className="space-y-1">
                          <Label htmlFor={`expiry-${user.id}`}>
                            Validity Expiry Date
                            <span className="text-xs text-muted-foreground font-normal ml-1">(auto-set 1 yr on Active)</span>
                          </Label>
                          <Input
                            id={`expiry-${user.id}`}
                            type="date"
                            value={state.subscriptionExpiry}
                            onChange={(e) => updateEditState(user.id, { subscriptionExpiry: e.target.value })}
                            data-testid={`input-expiry-${user.id}`}
                          />
                        </div>
                      </div>

                      {/* Vehicle access */}
                      <div className="space-y-2">
                        <Label>
                          Vehicle Access
                          <span className="text-xs text-muted-foreground ml-2">(unchecked = all vehicles)</span>
                        </Label>
                        {vehicles.length > 0 && (
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                            <Input
                              placeholder="Search vehicles…"
                              value={vehicleSearches[user.id] ?? ""}
                              onChange={(e) => setVehicleSearches((prev) => ({ ...prev, [user.id]: e.target.value }))}
                              className="pl-8 h-8 text-sm"
                              data-testid={`input-vehicle-search-${user.id}`}
                            />
                            {vehicleSearches[user.id] && (
                              <button
                                type="button"
                                onClick={() => setVehicleSearches((prev) => ({ ...prev, [user.id]: "" }))}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                data-testid={`button-clear-vehicle-search-${user.id}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )}
                        <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                          {vehicles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No vehicles registered</p>
                          ) : (() => {
                            const q = (vehicleSearches[user.id] ?? "").toLowerCase();
                            const filtered = q
                              ? vehicles.filter((v) =>
                                  v.name.toLowerCase().includes(q) ||
                                  (v.licensePlate ?? "").toLowerCase().includes(q) ||
                                  (v.deviceId ?? "").toLowerCase().includes(q)
                                )
                              : vehicles;
                            if (filtered.length === 0) {
                              return <p className="text-sm text-muted-foreground">No vehicles match your search</p>;
                            }
                            return filtered.map((v) => (
                              <div key={v.id} className="flex items-center gap-2">
                                <Checkbox
                                  id={`vehicle-${user.id}-${v.id}`}
                                  checked={state.allowedVehicleIds.includes(v.id)}
                                  onCheckedChange={() => toggleVehicle(user.id, v.id)}
                                  data-testid={`checkbox-vehicle-${user.id}-${v.id}`}
                                />
                                <label
                                  htmlFor={`vehicle-${user.id}-${v.id}`}
                                  className="text-sm cursor-pointer flex-1"
                                >
                                  <span className="font-medium">{v.name}</span>
                                  {v.licensePlate && (
                                    <span className="text-muted-foreground ml-2">({v.licensePlate})</span>
                                  )}
                                </label>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>

                      {/* Menu access — collapsible */}
                      <div className="border rounded-md overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenMenuPanels((prev) => ({ ...prev, [user.id]: !prev[user.id] }))}
                          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium bg-muted/50 hover:bg-muted transition-colors"
                          data-testid={`button-toggle-menu-access-${user.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <Menu className="h-3.5 w-3.5 text-muted-foreground" />
                            Menu Access
                            <span className="text-xs text-muted-foreground font-normal">
                              ({(state.allowedMenus == null || state.allowedMenus.length === 0) ? "All menus allowed" : `${state.allowedMenus.length} menu${state.allowedMenus.length !== 1 ? "s" : ""} allowed`})
                            </span>
                          </span>
                          {menuPanelOpen
                            ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          }
                        </button>

                        {menuPanelOpen && (
                          <div className="px-3 py-3 bg-background space-y-3">
                            {/* Allow all shortcut */}
                            <div className="flex items-center gap-3 pb-1 border-b">
                              <span className="text-xs text-muted-foreground">Quick actions:</span>
                              <button
                                type="button"
                                className="text-xs text-primary underline-offset-2 hover:underline"
                                onClick={() => allowAllMenus(user.id)}
                                data-testid={`button-menu-allow-all-${user.id}`}
                              >
                                Allow all menus
                              </button>
                            </div>

                            {ASSIGNABLE_MENU_GROUPS.map((group) => (
                              <div key={group.label} className="space-y-1.5">
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{group.label}</p>
                                <div className="space-y-1">
                                  {group.items.map((item) => (
                                    <div key={item.url} className="flex items-center gap-2">
                                      <Checkbox
                                        id={`menu-${user.id}-${item.url}`}
                                        checked={isMenuAllowed(user.id, item.url)}
                                        onCheckedChange={() => toggleMenu(user.id, item.url)}
                                        data-testid={`checkbox-menu-${user.id}-${item.url.replace(/\//g, "-")}`}
                                      />
                                      <label
                                        htmlFor={`menu-${user.id}-${item.url}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        {item.title}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSave(user.id)}
                          disabled={isSaving}
                          data-testid={`button-save-user-${user.id}`}
                        >
                          {isSaving ? "Saving..." : "Save Changes"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setExpandedUserId(null)}
                          data-testid={`button-cancel-user-${user.id}`}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Delete user confirmation dialog */}
      <AlertDialog open={!!userToDelete} onOpenChange={(open) => { if (!open) { setUserToDelete(null); setDeleteUserConfirmText(""); } }}>
        <AlertDialogContent data-testid="dialog-delete-user-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{userToDelete?.name}</span>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-sm text-muted-foreground mb-1.5 block">
              Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm
            </Label>
            <Input
              value={deleteUserConfirmText}
              onChange={(e) => setDeleteUserConfirmText(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
              data-testid="input-delete-user-confirm"
              autoComplete="off"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-user-cancel">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteUserConfirmText !== "DELETE"}
              data-testid="button-delete-user-confirm"
              onClick={() => {
                if (userToDelete && deleteUserConfirmText === "DELETE") {
                  deleteMutation.mutate(userToDelete.id);
                  setUserToDelete(null);
                  setDeleteUserConfirmText("");
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
