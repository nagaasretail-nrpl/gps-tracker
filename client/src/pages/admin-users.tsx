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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, User as UserIcon, ChevronDown, ChevronUp, Car } from "lucide-react";
import type { User, Vehicle } from "@shared/schema";

type UserWithoutPassword = Omit<User, "password">;

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  suspended: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const SUBSCRIPTION_LABELS: Record<string, string> = {
  basic: "Basic",
  pro: "Pro",
  enterprise: "Enterprise",
};

interface EditState {
  status: string;
  subscriptionType: string;
  subscriptionExpiry: string;
  allowedVehicleIds: string[];
  role: string;
  phone: string;
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
    role: user.role,
    phone: user.phone ?? "",
    department: user.department ?? "",
  };
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editStates, setEditStates] = useState<Record<string, EditState>>({});
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });

  const { data: users = [], isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const toggleExpand = (user: UserWithoutPassword) => {
    if (expandedUserId === user.id) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(user.id);
      // Initialize edit state for this user if not set
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
      setNewUser({ name: "", email: "", password: "", role: "user" });
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
      setExpandedUserId(null);
      // Clear cached edit state so it's rebuilt from fresh server data next time
      setEditStates((prev) => {
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
    const payload: Record<string, unknown> = {
      status: state.status,
      subscriptionType: state.subscriptionType,
      role: state.role,
      phone: state.phone,
      department: state.department,
      allowedVehicleIds: state.allowedVehicleIds.length > 0 ? state.allowedVehicleIds : null,
      subscriptionExpiry: state.subscriptionExpiry
        ? new Date(state.subscriptionExpiry).toISOString()
        : null,
    };
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
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                data-testid="input-new-user-email"
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
                disabled={createMutation.isPending || !newUser.name || !newUser.email || !newUser.password}
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

            return (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                {/* Row header — always visible */}
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
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            Plan: <span className="font-medium">{SUBSCRIPTION_LABELS[user.subscriptionType ?? "basic"] ?? user.subscriptionType}</span>
                          </span>
                          {expiry && (
                            <span className={`text-xs ${isExpired ? "text-red-500" : "text-muted-foreground"}`}>
                              Expires: {expiry.toLocaleDateString()}{isExpired ? " (expired)" : ""}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Car className="h-3 w-3" />
                            {assignedCount > 0 ? `${assignedCount} vehicle${assignedCount !== 1 ? "s" : ""} assigned` : "All vehicles"}
                          </span>
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
                        onClick={() => deleteMutation.mutate(user.id)}
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

                        {/* Status */}
                        <div className="space-y-1">
                          <Label>Account Status</Label>
                          <Select value={state.status} onValueChange={(v) => updateEditState(user.id, { status: v })}>
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
                              <SelectItem value="basic">Basic</SelectItem>
                              <SelectItem value="pro">Pro</SelectItem>
                              <SelectItem value="enterprise">Enterprise</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Subscription expiry */}
                        <div className="space-y-1">
                          <Label htmlFor={`expiry-${user.id}`}>Expiry Date</Label>
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
                          <span className="text-xs text-muted-foreground ml-2">
                            (unchecked = access to all vehicles)
                          </span>
                        </Label>
                        <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                          {vehicles.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No vehicles registered</p>
                          ) : (
                            vehicles.map((v) => (
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
                            ))
                          )}
                        </div>
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
    </div>
  );
}
