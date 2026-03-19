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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Trash2, Plus, User as UserIcon, Pencil, Car } from "lucide-react";
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

export default function AdminUsers() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<UserWithoutPassword | null>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });

  const [editForm, setEditForm] = useState<{
    status: string;
    subscriptionType: string;
    subscriptionExpiry: string;
    allowedVehicleIds: string[];
    role: string;
    phone: string;
    department: string;
  }>({
    status: "active",
    subscriptionType: "basic",
    subscriptionExpiry: "",
    allowedVehicleIds: [],
    role: "user",
    phone: "",
    department: "",
  });

  const { data: users = [], isLoading } = useQuery<UserWithoutPassword[]>({
    queryKey: ["/api/users"],
  });

  const { data: vehicles = [] } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const openEditDialog = (user: UserWithoutPassword) => {
    setEditUser(user);
    setEditForm({
      status: (user as any).status || "active",
      subscriptionType: (user as any).subscriptionType || "basic",
      subscriptionExpiry: (user as any).subscriptionExpiry
        ? new Date((user as any).subscriptionExpiry).toISOString().split("T")[0]
        : "",
      allowedVehicleIds: (user as any).allowedVehicleIds || [],
      role: user.role,
      phone: user.phone || "",
      department: user.department || "",
    });
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to create user");
      }
      return response.json();
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
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/users/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to update user");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "User updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setEditUser(null);
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

  const handleSaveEdit = () => {
    if (!editUser) return;
    const payload: any = {
      status: editForm.status,
      subscriptionType: editForm.subscriptionType,
      role: editForm.role,
      phone: editForm.phone,
      department: editForm.department,
      allowedVehicleIds: editForm.allowedVehicleIds.length > 0 ? editForm.allowedVehicleIds : null,
    };
    if (editForm.subscriptionExpiry) {
      payload.subscriptionExpiry = new Date(editForm.subscriptionExpiry).toISOString();
    } else {
      payload.subscriptionExpiry = null;
    }
    updateMutation.mutate({ id: editUser.id, data: payload });
  };

  const toggleVehicle = (vehicleId: string) => {
    setEditForm((prev) => {
      const current = prev.allowedVehicleIds;
      const next = current.includes(vehicleId)
        ? current.filter((id) => id !== vehicleId)
        : [...current, vehicleId];
      return { ...prev, allowedVehicleIds: next };
    });
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="default">{role}</Badge>;
      case "user":
        return <Badge variant="secondary">{role}</Badge>;
      case "subuser":
        return <Badge variant="outline">{role}</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  const getStatusBadge = (status: string = "active") => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[status] || STATUS_COLORS.active}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
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
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-3 py-2 border border-input rounded-md bg-background text-sm"
                data-testid="select-new-user-role"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="subuser">Subuser</option>
              </select>
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
          <div className="text-center p-8">Loading...</div>
        ) : users.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground">No users found</div>
        ) : (
          users.map((user) => {
            const u = user as any;
            const assignedCount = u.allowedVehicleIds?.length || 0;
            const expiry = u.subscriptionExpiry ? new Date(u.subscriptionExpiry) : null;
            const isExpired = expiry && expiry < new Date();

            return (
              <Card key={user.id} data-testid={`card-user-${user.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <UserIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{user.name}</h3>
                          {getRoleBadge(user.role)}
                          {getStatusBadge(u.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {u.subscriptionType && (
                            <span className="text-xs text-muted-foreground">
                              Plan: <span className="font-medium">{SUBSCRIPTION_LABELS[u.subscriptionType] || u.subscriptionType}</span>
                            </span>
                          )}
                          {expiry && (
                            <span className={`text-xs ${isExpired ? "text-red-500" : "text-muted-foreground"}`}>
                              Expires: {expiry.toLocaleDateString()}
                              {isExpired && " (expired)"}
                            </span>
                          )}
                          {assignedCount > 0 ? (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              {assignedCount} vehicle{assignedCount !== 1 ? "s" : ""} assigned
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Car className="h-3 w-3" />
                              All vehicles
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditDialog(user)}
                        data-testid={`button-edit-user-${user.id}`}
                        title="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
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
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }}>
        <DialogContent className="max-w-lg" data-testid="dialog-edit-user">
          <DialogHeader>
            <DialogTitle>Edit User — {editUser?.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  data-testid="input-edit-phone"
                />
              </div>
              <div className="space-y-1">
                <Label>Department</Label>
                <Input
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  placeholder="e.g. Fleet Ops"
                  data-testid="input-edit-department"
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-1">
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger data-testid="select-edit-role">
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
              <Select value={editForm.status} onValueChange={(v) => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger data-testid="select-edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Subscription */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Subscription Plan</Label>
                <Select value={editForm.subscriptionType} onValueChange={(v) => setEditForm({ ...editForm, subscriptionType: v })}>
                  <SelectTrigger data-testid="select-edit-subscription">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Expiry Date</Label>
                <Input
                  type="date"
                  value={editForm.subscriptionExpiry}
                  onChange={(e) => setEditForm({ ...editForm, subscriptionExpiry: e.target.value })}
                  data-testid="input-edit-expiry"
                />
              </div>
            </div>

            {/* Vehicle access */}
            <div className="space-y-2">
              <Label>
                Vehicle Access
                <span className="text-xs text-muted-foreground ml-2">
                  (leave all unchecked = access to all vehicles)
                </span>
              </Label>
              <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                {vehicles.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No vehicles registered</p>
                ) : (
                  vehicles.map((v) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`vehicle-${v.id}`}
                        checked={editForm.allowedVehicleIds.includes(v.id)}
                        onCheckedChange={() => toggleVehicle(v.id)}
                        data-testid={`checkbox-vehicle-${v.id}`}
                      />
                      <label htmlFor={`vehicle-${v.id}`} className="text-sm cursor-pointer flex-1">
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
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              data-testid="button-save-edit"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
