import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Loader2, Check, X } from "lucide-react";
import type { User } from "@shared/schema";

export default function Profile() {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const { data: user, isLoading } = useQuery<Omit<User, "password">>({
    queryKey: ["/api/auth/me"],
    // /api/auth/me returns { user: {...} } — extract the user object
    select: (data: unknown) => {
      const d = data as { user?: Omit<User, "password"> } | Omit<User, "password">;
      if (d && "user" in d && d.user) return d.user;
      return d as Omit<User, "password">;
    },
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
    onSuccess: (updatedUser: any) => {
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
  const initials = displayName.split(" ").map(n => n[0]).join("").toUpperCase();

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
    </div>
  );
}
