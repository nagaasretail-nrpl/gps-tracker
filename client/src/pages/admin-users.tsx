import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Trash2, Plus, User as UserIcon } from "lucide-react";
import type { User } from "@shared/schema";

export default function AdminUsers() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newUser, setNewUser] = useState({ name: "", email: "", password: "", role: "user" });

  const { data: users = [], isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/users"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Failed to create user");
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "User created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      setNewUser({ name: "", email: "", password: "", role: "user" });
      setShowForm(false);
    },
    onError: () => {
      toast({ variant: "destructive", description: "Failed to create user" });
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

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
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
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                data-testid="input-new-user-password"
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                className="px-3 py-2 border border-input rounded-md bg-background"
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
          users.map((user) => (
            <Card key={user.id} className="hover-elevate">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <UserIcon className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <h3 className="font-medium">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getRoleBadge(user.role)}
                    {user.department && (
                      <Badge variant="outline">{user.department}</Badge>
                    )}
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteMutation.mutate(user.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-user-${user.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
