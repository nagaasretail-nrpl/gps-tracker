import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, MapPin as MapPinIcon, X, Check } from "lucide-react";
import type { Poi, InsertPoi } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { MapComponent } from "@/components/map-component";
import { Badge } from "@/components/ui/badge";

const categories = [
  { value: "parking", label: "Parking" },
  { value: "fuel", label: "Fuel Station" },
  { value: "service", label: "Service Center" },
  { value: "warehouse", label: "Warehouse" },
  { value: "office", label: "Office" },
  { value: "custom", label: "Custom" },
];

export default function Pois() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPoi, setNewPoi] = useState<Partial<InsertPoi>>({
    name: "",
    description: "",
    latitude: "0",
    longitude: "0",
    category: "custom",
  });
  const [clickedPosition, setClickedPosition] = useState<[number, number] | null>(null);
  const { toast } = useToast();

  const { data: pois, isLoading } = useQuery<Poi[]>({
    queryKey: ["/api/pois"],
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertPoi) => {
      return await apiRequest("POST", "/api/pois", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pois"] });
      setIsAddOpen(false);
      setNewPoi({
        name: "",
        description: "",
        latitude: "0",
        longitude: "0",
        category: "custom",
      });
      setClickedPosition(null);
      toast({
        title: "POI created",
        description: "The point of interest has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create POI. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/pois/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pois"] });
      toast({
        title: "POI deleted",
        description: "The point of interest has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete POI. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMapClick = (lat: number, lng: number) => {
    if (isAddOpen) {
      setClickedPosition([lat, lng]);
      setNewPoi((prev) => ({
        ...prev,
        latitude: lat.toFixed(7),
        longitude: lng.toFixed(7),
      }));
    }
  };

  const handleSubmit = () => {
    if (!newPoi.name?.trim() || !clickedPosition) {
      toast({
        title: "Validation error",
        description: "Please provide a name and click a location on the map.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newPoi as InsertPoi);
  };

  const cancelAdd = () => {
    setIsAddOpen(false);
    setClickedPosition(null);
    setNewPoi({
      name: "",
      description: "",
      latitude: "0",
      longitude: "0",
      category: "custom",
    });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-96 border-r bg-card flex flex-col overflow-hidden">

        {isAddOpen ? (
          <>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h2 className="text-sm font-semibold">Add Point of Interest</h2>
              <Button
                size="icon"
                variant="ghost"
                onClick={cancelAdd}
                data-testid="button-cancel-add"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* "Click on map" instruction strip */}
            <div
              className="flex items-center gap-2 px-4 py-2 text-xs border-b"
              style={{ background: "hsl(var(--primary)/0.08)" }}
            >
              <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "hsl(var(--primary))" }} />
              <span className="text-muted-foreground">
                {clickedPosition
                  ? `Pin placed at ${clickedPosition[0].toFixed(5)}, ${clickedPosition[1].toFixed(5)}`
                  : "Click anywhere on the map to place the pin"}
              </span>
              {clickedPosition && (
                <Check className="h-3.5 w-3.5 ml-auto flex-shrink-0 text-green-500" />
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <Label htmlFor="poi-name">Name</Label>
                <Input
                  id="poi-name"
                  value={newPoi.name}
                  onChange={(e) => setNewPoi((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Main Office"
                  data-testid="input-poi-name"
                />
              </div>
              <div>
                <Label htmlFor="poi-category">Category</Label>
                <Select
                  value={newPoi.category}
                  onValueChange={(value) => setNewPoi((prev) => ({ ...prev, category: value }))}
                >
                  <SelectTrigger id="poi-category" data-testid="select-poi-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="poi-description">Description</Label>
                <Textarea
                  id="poi-description"
                  value={newPoi.description}
                  onChange={(e) => setNewPoi((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description"
                  data-testid="input-poi-description"
                />
              </div>
            </div>

            <div className="border-t p-4 flex gap-2 justify-end">
              <Button variant="outline" onClick={cancelAdd} data-testid="button-cancel">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={addMutation.isPending}
                data-testid="button-submit"
              >
                {addMutation.isPending ? "Saving…" : "Add POI"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Points of Interest</h2>
              <Button
                size="icon"
                onClick={() => setIsAddOpen(true)}
                data-testid="button-add-poi"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                [1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)
              ) : pois && pois.length > 0 ? (
                pois.map((poi) => (
                  <Card key={poi.id} data-testid={`card-poi-${poi.id}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPinIcon className="h-4 w-4 text-primary flex-shrink-0" />
                          <CardTitle className="text-sm truncate">{poi.name}</CardTitle>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate(poi.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-${poi.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2">
                      {poi.category && (
                        <Badge variant="secondary" className="text-xs capitalize">
                          {poi.category}
                        </Badge>
                      )}
                      {poi.description && (
                        <p className="text-muted-foreground text-xs">{poi.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {parseFloat(poi.latitude).toFixed(5)}, {parseFloat(poi.longitude).toFixed(5)}
                      </p>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <div className="text-center py-12">
                  <MapPinIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No points of interest yet</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Mark important locations on your map
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsAddOpen(true)}
                    data-testid="button-create-first-poi"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add POI
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 relative">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <MapComponent
            pois={pois}
            className="h-full"
            onMapClick={isAddOpen ? handleMapClick : undefined}
          />
        )}
      </div>
    </div>
  );
}
