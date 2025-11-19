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
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, MapPin, Shield } from "lucide-react";
import type { Geofence, InsertGeofence } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";

export default function Geofences() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newGeofence, setNewGeofence] = useState<Partial<InsertGeofence>>({
    name: "",
    description: "",
    type: "polygon",
    coordinates: [],
    color: "#10b981",
    alertOnEntry: true,
    alertOnExit: true,
  });
  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const { toast } = useToast();

  const { data: geofences, isLoading } = useQuery<Geofence[]>({
    queryKey: ["/api/geofences"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertGeofence) => {
      return await apiRequest("POST", "/api/geofences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      setIsAddOpen(false);
      setNewGeofence({
        name: "",
        description: "",
        type: "polygon",
        coordinates: [],
        color: "#10b981",
        alertOnEntry: true,
        alertOnExit: true,
      });
      setDrawingPoints([]);
      toast({
        title: "Geofence created",
        description: "The geofence has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create geofence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/geofences/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
      toast({
        title: "Geofence deleted",
        description: "The geofence has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete geofence. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddOpen) {
      const newPoints = [...drawingPoints, [lat, lng] as [number, number]];
      setDrawingPoints(newPoints);
      setNewGeofence({ ...newGeofence, coordinates: newPoints });
    }
  };

  const handleSubmit = () => {
    if (!newGeofence.name || drawingPoints.length < 3) {
      toast({
        title: "Validation error",
        description: "Please provide a name and draw at least 3 points on the map.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newGeofence as InsertGeofence);
  };

  const clearDrawing = () => {
    setDrawingPoints([]);
    setNewGeofence({ ...newGeofence, coordinates: [] });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-96 border-r bg-card overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Geofences</h2>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-geofence">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Geofence</DialogTitle>
                  <DialogDescription>
                    Click on the map to draw a geofence polygon.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newGeofence.name}
                      onChange={(e) => setNewGeofence({ ...newGeofence, name: e.target.value })}
                      placeholder="e.g., Warehouse Zone"
                      data-testid="input-geofence-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newGeofence.description}
                      onChange={(e) => setNewGeofence({ ...newGeofence, description: e.target.value })}
                      placeholder="Optional description"
                      data-testid="input-geofence-description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="color">Color</Label>
                    <Input
                      id="color"
                      type="color"
                      value={newGeofence.color}
                      onChange={(e) => setNewGeofence({ ...newGeofence, color: e.target.value })}
                      data-testid="input-geofence-color"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-entry">Alert on Entry</Label>
                    <Switch
                      id="alert-entry"
                      checked={newGeofence.alertOnEntry}
                      onCheckedChange={(checked) => setNewGeofence({ ...newGeofence, alertOnEntry: checked })}
                      data-testid="switch-alert-entry"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="alert-exit">Alert on Exit</Label>
                    <Switch
                      id="alert-exit"
                      checked={newGeofence.alertOnExit}
                      onCheckedChange={(checked) => setNewGeofence({ ...newGeofence, alertOnExit: checked })}
                      data-testid="switch-alert-exit"
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
                      {addMutation.isPending ? "Creating..." : "Create Geofence"}
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
              <Skeleton key={i} className="h-32" />
            ))
          ) : geofences && geofences.length > 0 ? (
            geofences.map((geofence) => (
              <Card key={geofence.id} data-testid={`card-geofence-${geofence.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: geofence.color || "#10b981" }}
                      />
                      <CardTitle className="text-sm">{geofence.name}</CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(geofence.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${geofence.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  {geofence.description && (
                    <p className="text-muted-foreground text-xs">{geofence.description}</p>
                  )}
                  <div className="flex gap-1 flex-wrap">
                    {geofence.alertOnEntry && (
                      <Badge variant="secondary" className="text-xs">Entry Alert</Badge>
                    )}
                    {geofence.alertOnExit && (
                      <Badge variant="secondary" className="text-xs">Exit Alert</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No geofences yet</p>
              <p className="text-xs text-muted-foreground mb-4">
                Create virtual boundaries to monitor vehicle zones
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsAddOpen(true)}
                data-testid="button-create-first-geofence"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Geofence
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
            geofences={geofences}
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
