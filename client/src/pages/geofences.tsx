import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, Shield, X, Check, Map, List } from "lucide-react";
import type { Geofence, InsertGeofence } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";

type MobileView = "list" | "map";

export default function Geofences() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");
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
      cancelAdd();
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
      setNewGeofence((prev) => ({ ...prev, coordinates: newPoints }));
    }
  };

  const handleSubmit = () => {
    if (!newGeofence.name?.trim() || drawingPoints.length < 3) {
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
    setNewGeofence((prev) => ({ ...prev, coordinates: [] }));
  };

  const cancelAdd = () => {
    setIsAddOpen(false);
    setDrawingPoints([]);
    setMobileView("list");
    setNewGeofence({
      name: "",
      description: "",
      type: "polygon",
      coordinates: [],
      color: "#10b981",
      alertOnEntry: true,
      alertOnExit: true,
    });
  };

  const mapEl = (
    <MapComponent
      geofences={geofences}
      className="h-full"
      onMapClick={isAddOpen ? handleMapClick : undefined}
    />
  );

  return (
    <>
      {/* ── Desktop layout (sm / 640px+): side-by-side ── */}
      <div className="hidden sm:flex h-[calc(100vh-4rem)]">
        {/* Sidebar panel */}
        <div className="w-96 border-r bg-card flex flex-col overflow-hidden">
          {isAddOpen ? (
            <>
              <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0">
                <h2 className="text-sm font-semibold">Create Geofence</h2>
                <Button size="icon" variant="ghost" onClick={cancelAdd} data-testid="button-cancel-add">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div
                className="flex items-center gap-2 px-4 py-2 text-xs border-b flex-shrink-0"
                style={{ background: "hsl(var(--primary)/0.08)" }}
              >
                <Shield className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
                <span className="text-muted-foreground">
                  {drawingPoints.length === 0
                    ? "Click on the map to draw polygon points"
                    : `${drawingPoints.length} point${drawingPoints.length !== 1 ? "s" : ""} placed${drawingPoints.length >= 3 ? " — ready" : " — need at least 3"}`}
                </span>
                {drawingPoints.length >= 3 && (
                  <Check className="h-3.5 w-3.5 ml-auto flex-shrink-0 text-green-500" />
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div>
                  <Label htmlFor="geofence-name">Name</Label>
                  <Input
                    id="geofence-name"
                    value={newGeofence.name}
                    onChange={(e) => setNewGeofence((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Warehouse Zone"
                    data-testid="input-geofence-name"
                  />
                </div>
                <div>
                  <Label htmlFor="geofence-description">Description</Label>
                  <Textarea
                    id="geofence-description"
                    value={newGeofence.description ?? ""}
                    onChange={(e) => setNewGeofence((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description"
                    data-testid="input-geofence-description"
                  />
                </div>
                <div>
                  <Label htmlFor="geofence-color">Color</Label>
                  <Input
                    id="geofence-color"
                    type="color"
                    value={newGeofence.color ?? "#10b981"}
                    onChange={(e) => setNewGeofence((prev) => ({ ...prev, color: e.target.value }))}
                    data-testid="input-geofence-color"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-entry">Alert on Entry</Label>
                  <Switch
                    id="alert-entry"
                    checked={newGeofence.alertOnEntry ?? true}
                    onCheckedChange={(checked) => setNewGeofence((prev) => ({ ...prev, alertOnEntry: checked }))}
                    data-testid="switch-alert-entry"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="alert-exit">Alert on Exit</Label>
                  <Switch
                    id="alert-exit"
                    checked={newGeofence.alertOnExit ?? true}
                    onCheckedChange={(checked) => setNewGeofence((prev) => ({ ...prev, alertOnExit: checked }))}
                    data-testid="switch-alert-exit"
                  />
                </div>
                {drawingPoints.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearDrawing} data-testid="button-clear-drawing">
                    Clear drawing ({drawingPoints.length} points)
                  </Button>
                )}
              </div>

              <div className="border-t p-4 flex gap-2 justify-end flex-shrink-0">
                <Button variant="outline" onClick={cancelAdd} data-testid="button-cancel">Cancel</Button>
                <Button onClick={handleSubmit} disabled={addMutation.isPending} data-testid="button-submit">
                  {addMutation.isPending ? "Creating..." : "Create Geofence"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-semibold">Geofences</h2>
                <Button size="icon" onClick={() => setIsAddOpen(true)} data-testid="button-add-geofence">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isLoading ? (
                  [1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)
                ) : geofences && geofences.length > 0 ? (
                  geofences.map((geofence) => (
                    <Card key={geofence.id} data-testid={`card-geofence-${geofence.id}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: geofence.color || "#10b981" }} />
                            <CardTitle className="text-sm truncate">{geofence.name}</CardTitle>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(geofence.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-${geofence.id}`}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="text-sm space-y-2">
                        {geofence.description && <p className="text-muted-foreground text-xs">{geofence.description}</p>}
                        <div className="flex gap-1 flex-wrap">
                          {geofence.alertOnEntry && <Badge variant="secondary" className="text-xs">Entry Alert</Badge>}
                          {geofence.alertOnExit && <Badge variant="secondary" className="text-xs">Exit Alert</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">No geofences yet</p>
                    <p className="text-xs text-muted-foreground mb-4">Create virtual boundaries to monitor vehicle zones</p>
                    <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} data-testid="button-create-first-geofence">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Geofence
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {isLoading ? <Skeleton className="h-full w-full" /> : mapEl}
        </div>
      </div>

      {/* ── Mobile layout (<sm / <640px): single-pane ── */}
      <div className="flex sm:hidden flex-col h-[calc(100vh-4rem)]">

        {isAddOpen ? (
          /* CREATE MODE: map top-half + form bottom-half */
          <>
            {/* Map — top 45% */}
            <div className="relative flex-shrink-0" style={{ height: "45%" }}>
              {isLoading ? <Skeleton className="h-full w-full" /> : mapEl}
              {/* Floating instruction chip */}
              <div
                className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-1.5 text-xs"
                style={{ background: "hsl(var(--primary)/0.85)" }}
              >
                <Shield className="h-3 w-3 flex-shrink-0 text-white" />
                <span className="text-white flex-1">
                  {drawingPoints.length === 0
                    ? "Tap the map above to place polygon points"
                    : `${drawingPoints.length} point${drawingPoints.length !== 1 ? "s" : ""} placed${drawingPoints.length >= 3 ? " — ready" : " — need at least 3"}`}
                </span>
                {drawingPoints.length >= 3 && <Check className="h-3 w-3 flex-shrink-0 text-white" />}
              </div>
            </div>

            {/* Form — bottom 55%, scrollable */}
            <div className="flex flex-col bg-card border-t overflow-hidden" style={{ height: "55%" }}>
              <div className="px-4 py-2 flex items-center justify-between flex-shrink-0 border-b">
                <h2 className="text-sm font-semibold">Create Geofence</h2>
                <Button size="icon" variant="ghost" onClick={cancelAdd} data-testid="button-cancel-add-mobile">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <div>
                  <Label htmlFor="m-geofence-name" className="text-xs">Name</Label>
                  <Input
                    id="m-geofence-name"
                    value={newGeofence.name}
                    onChange={(e) => setNewGeofence((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Warehouse Zone"
                    data-testid="input-geofence-name-mobile"
                  />
                </div>
                <div>
                  <Label htmlFor="m-geofence-color" className="text-xs">Color</Label>
                  <Input
                    id="m-geofence-color"
                    type="color"
                    value={newGeofence.color ?? "#10b981"}
                    onChange={(e) => setNewGeofence((prev) => ({ ...prev, color: e.target.value }))}
                    data-testid="input-geofence-color-mobile"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="m-alert-entry" className="text-xs">Alert on Entry</Label>
                  <Switch
                    id="m-alert-entry"
                    checked={newGeofence.alertOnEntry ?? true}
                    onCheckedChange={(checked) => setNewGeofence((prev) => ({ ...prev, alertOnEntry: checked }))}
                    data-testid="switch-alert-entry-mobile"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="m-alert-exit" className="text-xs">Alert on Exit</Label>
                  <Switch
                    id="m-alert-exit"
                    checked={newGeofence.alertOnExit ?? true}
                    onCheckedChange={(checked) => setNewGeofence((prev) => ({ ...prev, alertOnExit: checked }))}
                    data-testid="switch-alert-exit-mobile"
                  />
                </div>
                {drawingPoints.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearDrawing} data-testid="button-clear-drawing-mobile">
                    Clear drawing ({drawingPoints.length} points)
                  </Button>
                )}
              </div>

              <div className="border-t px-4 py-2 flex gap-2 justify-end flex-shrink-0">
                <Button variant="outline" size="sm" onClick={cancelAdd} data-testid="button-cancel-mobile">Cancel</Button>
                <Button size="sm" onClick={handleSubmit} disabled={addMutation.isPending} data-testid="button-submit-mobile">
                  {addMutation.isPending ? "Creating..." : "Create Geofence"}
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* LIST MODE: tab toggle between list and map */
          <>
            <div className="flex border-b bg-card flex-shrink-0">
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  mobileView === "list" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setMobileView("list")}
                data-testid="button-tab-list"
              >
                <List className="h-3.5 w-3.5" />
                Geofences
              </button>
              <button
                type="button"
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                  mobileView === "map" ? "border-primary text-foreground" : "border-transparent text-muted-foreground"
                }`}
                onClick={() => setMobileView("map")}
                data-testid="button-tab-map"
              >
                <Map className="h-3.5 w-3.5" />
                Map
              </button>
            </div>

            <div className="flex-1 relative overflow-hidden">
              {/* Map — always rendered so Google Maps doesn't re-init on tab switch */}
              <div className={`absolute inset-0 ${mobileView === "map" ? "visible" : "invisible"}`}>
                {isLoading ? <Skeleton className="h-full w-full" /> : mapEl}
              </div>

              {/* List */}
              {mobileView === "list" && (
                <div className="absolute inset-0 bg-background flex flex-col overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
                    <h2 className="text-lg font-semibold">Geofences</h2>
                    <Button size="icon" onClick={() => setIsAddOpen(true)} data-testid="button-add-geofence-mobile">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {isLoading ? (
                      [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
                    ) : geofences && geofences.length > 0 ? (
                      geofences.map((geofence) => (
                        <Card key={geofence.id} data-testid={`card-geofence-mobile-${geofence.id}`}>
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: geofence.color || "#10b981" }} />
                                <CardTitle className="text-sm truncate">{geofence.name}</CardTitle>
                              </div>
                              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(geofence.id)} disabled={deleteMutation.isPending} data-testid={`button-delete-mobile-${geofence.id}`}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </CardHeader>
                          <CardContent className="text-sm space-y-1.5 pb-3">
                            <div className="flex gap-1 flex-wrap">
                              {geofence.alertOnEntry && <Badge variant="secondary" className="text-xs">Entry Alert</Badge>}
                              {geofence.alertOnExit && <Badge variant="secondary" className="text-xs">Exit Alert</Badge>}
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    ) : (
                      <div className="text-center py-10">
                        <Shield className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                        <p className="text-sm font-medium mb-1">No geofences yet</p>
                        <p className="text-xs text-muted-foreground mb-4">Create virtual boundaries to monitor vehicle zones</p>
                        <Button size="sm" variant="outline" onClick={() => setIsAddOpen(true)} data-testid="button-create-first-geofence-mobile">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Geofence
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
