import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Route as RouteIcon } from "lucide-react";
import type { Route as RouteType, InsertRoute } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MapComponent } from "@/components/map-component";

export default function Routes() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newRoute, setNewRoute] = useState<Partial<InsertRoute>>({
    name: "",
    description: "",
    coordinates: [],
    color: "#3b82f6",
  });
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const { toast } = useToast();

  const { data: routes, isLoading } = useQuery<RouteType[]>({
    queryKey: ["/api/routes"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertRoute) => {
      return await apiRequest("POST", "/api/routes", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      setIsAddOpen(false);
      setNewRoute({
        name: "",
        description: "",
        coordinates: [],
        color: "#3b82f6",
      });
      setDrawingPoints([]);
      toast({
        title: "Route created",
        description: "The route has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create route. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/routes/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/routes"] });
      toast({
        title: "Route deleted",
        description: "The route has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete route. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddOpen) {
      const newPoints = [...drawingPoints, [lat, lng] as [number, number]];
      setDrawingPoints(newPoints);
      setNewRoute({ ...newRoute, coordinates: newPoints });
    }
  };

  const handleSubmit = () => {
    if (!newRoute.name || drawingPoints.length < 2) {
      toast({
        title: "Validation error",
        description: "Please provide a name and draw at least 2 points on the map.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newRoute as InsertRoute);
  };

  const clearDrawing = () => {
    setDrawingPoints([]);
    setNewRoute({ ...newRoute, coordinates: [] });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-96 border-r bg-card overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Routes</h2>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-route">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Route</DialogTitle>
                  <DialogDescription>
                    Click on the map to draw a route path.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newRoute.name}
                      onChange={(e) => setNewRoute({ ...newRoute, name: e.target.value })}
                      placeholder="e.g., Main Delivery Route"
                      data-testid="input-route-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newRoute.description ?? ""}
                      onChange={(e) => setNewRoute({ ...newRoute, description: e.target.value })}
                      placeholder="Optional description"
                      data-testid="input-route-description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={newRoute.color ?? "#e4006e"}
                      onChange={(e) => setNewRoute({ ...newRoute, color: e.target.value })}
                      data-testid="input-route-color"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Points drawn: {drawingPoints.length}
                    {drawingPoints.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearDrawing}
                        className="ml-2"
                        data-testid="button-clear-drawing"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddOpen(false);
                        clearDrawing();
                      }}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={addMutation.isPending}
                      data-testid="button-submit"
                    >
                      {addMutation.isPending ? "Creating..." : "Create Route"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            [1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24" />
            ))
          ) : routes && routes.length > 0 ? (
            routes.map((route) => (
              <Card key={route.id} data-testid={`card-route-${route.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: route.color || "#3b82f6" }}
                      />
                      <CardTitle className="text-sm">{route.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(route.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${route.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                {route.description && (
                  <CardContent className="text-sm">
                    <p className="text-muted-foreground text-xs">{route.description}</p>
                  </CardContent>
                )}
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <RouteIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No routes yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Draw routes to track vehicle paths
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddOpen(true)}
                data-testid="button-create-first-route"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Route
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapComponent
            routes={routes}
            className="h-full"
            onMapClick={isAddOpen ? handleMapClick : undefined}
          />
        )}
        {isAddOpen && drawingPoints.length > 0 && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border rounded-md px-4 py-2 shadow-lg">
            <p className="text-sm font-medium">
              Drawing mode active - Click to add points ({drawingPoints.length} points)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
