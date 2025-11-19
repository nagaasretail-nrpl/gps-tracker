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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, MapPin as MapPinIcon } from "lucide-react";
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
      setNewPoi({
        ...newPoi,
        latitude: lat.toFixed(7),
        longitude: lng.toFixed(7),
      });
    }
  };

  const handleSubmit = () => {
    if (!newPoi.name || !clickedPosition) {
      toast({
        title: "Validation error",
        description: "Please provide a name and click a location on the map.",
        variant: "destructive",
      });
      return;
    }
    addMutation.mutate(newPoi as InsertPoi);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      <div className="w-96 border-r bg-card overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Points of Interest</h2>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-add-poi">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add Point of Interest</DialogTitle>
                  <DialogDescription>
                    Click on the map to select a location.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={newPoi.name}
                      onChange={(e) => setNewPoi({ ...newPoi, name: e.target.value })}
                      placeholder="e.g., Main Office"
                      data-testid="input-poi-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select
                      value={newPoi.category}
                      onValueChange={(value) => setNewPoi({ ...newPoi, category: value })}
                    >
                      <SelectTrigger data-testid="select-poi-category">
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
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newPoi.description}
                      onChange={(e) => setNewPoi({ ...newPoi, description: e.target.value })}
                      placeholder="Optional description"
                      data-testid="input-poi-description"
                    />
                  </div>
                  {clickedPosition && (
                    <div className="text-sm text-muted-foreground">
                      <p>Latitude: {clickedPosition[0].toFixed(7)}</p>
                      <p>Longitude: {clickedPosition[1].toFixed(7)}</p>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsAddOpen(false);
                        setClickedPosition(null);
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
                      {addMutation.isPending ? "Creating..." : "Add POI"}
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
              <Skeleton key={i} className="h-28" />
            ))
          ) : pois && pois.length > 0 ? (
            pois.map((poi) => (
              <Card key={poi.id} data-testid={`card-poi-${poi.id}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MapPinIcon className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm">{poi.name}</CardTitle>
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
        {isAddOpen && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border rounded-md px-4 py-2 shadow-lg">
            <p className="text-sm font-medium">
              Click on the map to place a POI marker
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
