import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Plus, Trash2, Copy, Check, Radio, Globe, Signal, AlertCircle, Pencil } from "lucide-react";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const vehicleTypes = [
  { value: "car", label: "Car" },
  { value: "truck", label: "Truck" },
  { value: "motorcycle", label: "Motorcycle" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
];

const iconColors = [
  { value: "#2563eb", label: "Blue" },
  { value: "#dc2626", label: "Red" },
  { value: "#16a34a", label: "Green" },
  { value: "#ea580c", label: "Orange" },
  { value: "#9333ea", label: "Purple" },
];

export default function Vehicles() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editName, setEditName] = useState("");
  const [editDeviceId, setEditDeviceId] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGt06Id, setCopiedGt06Id] = useState<string | null>(null);
  const { toast } = useToast();

  const serverUrl = window.location.origin;
  const serverHost = window.location.hostname;
  const gt06Port = 5023;

  const copyUrl = (vehicleDeviceId: string, cardId: string) => {
    const url = `${serverUrl}/api/device/location`;
    navigator.clipboard.writeText(url);
    setCopiedId(cardId);
    toast({ description: "HTTP endpoint URL copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyGt06Cmd = (vehicleDeviceId: string, cardId: string) => {
    const cmd = `SERVER,1,${serverHost},${gt06Port}#`;
    navigator.clipboard.writeText(cmd);
    setCopiedGt06Id(cardId);
    toast({ description: "GT06N SMS command copied to clipboard" });
    setTimeout(() => setCopiedGt06Id(null), 2000);
  };

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  type UnknownDevice = { deviceId: string; lat: number; lng: number; speed: number; seenAt: string };
  const { data: unknownDevices } = useQuery<UnknownDevice[]>({
    queryKey: ["/api/device/unknown"],
    refetchInterval: 10_000,
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      name: "",
      deviceId: "",
      type: "car",
      status: "offline",
      iconColor: "#2563eb",
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      return await apiRequest("POST", "/api/vehicles", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setIsAddOpen(false);
      form.reset();
      toast({
        title: "Vehicle added",
        description: "The vehicle has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add vehicle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/vehicles/${id}`, undefined);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been removed successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete vehicle. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, name, deviceId }: { id: string; name: string; deviceId: string }) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}`, { name, deviceId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setEditingVehicle(null);
      toast({ title: "Vehicle updated", description: "Device ID saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update vehicle.", variant: "destructive" });
    },
  });

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditName(v.name);
    setEditDeviceId(v.deviceId);
  };

  const onSubmit = (data: InsertVehicle) => {
    addMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "stopped":
        return "secondary";
      case "offline":
        return "outline";
      default:
        return "outline";
    }
  };

  const useDeviceId = (deviceId: string) => {
    form.setValue("deviceId", deviceId);
    setIsAddOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold mb-2">Vehicles</h1>
          <p className="text-sm text-muted-foreground">
            Manage your fleet vehicles
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-vehicle">
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>
                Add a new vehicle to your fleet tracking system.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Name</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., Delivery Van 1"
                          data-testid="input-vehicle-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="e.g., GPS-12345"
                          data-testid="input-device-id"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehicle Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-vehicle-type">
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {vehicleTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iconColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Color</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-icon-color">
                            <SelectValue placeholder="Select color" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconColors.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: color.value }}
                                />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddOpen(false)}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={addMutation.isPending} data-testid="button-submit">
                    {addMutation.isPending ? "Adding..." : "Add Vehicle"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Edit Vehicle Dialog */}
      <Dialog open={!!editingVehicle} onOpenChange={(open) => { if (!open) setEditingVehicle(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>Update the vehicle name or Device ID (IMEI).</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Vehicle Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                data-testid="input-edit-vehicle-name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-device-id">Device ID (IMEI)</Label>
              <Input
                id="edit-device-id"
                value={editDeviceId}
                onChange={e => setEditDeviceId(e.target.value)}
                placeholder="15-digit IMEI"
                data-testid="input-edit-device-id"
              />
              <p className="text-xs text-muted-foreground">Must exactly match the tracker's IMEI.</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingVehicle(null)}>Cancel</Button>
              <Button
                disabled={editMutation.isPending || !editName.trim() || !editDeviceId.trim()}
                onClick={() => editingVehicle && editMutation.mutate({ id: editingVehicle.id, name: editName.trim(), deviceId: editDeviceId.trim() })}
                data-testid="button-save-edit-vehicle"
              >
                {editMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {unknownDevices && unknownDevices.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader className="pb-2 flex flex-row items-center gap-2 flex-wrap">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <CardTitle className="text-sm text-amber-700 dark:text-amber-400">
              Unregistered device signals received
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-3">
            <p>
              The following Device IDs sent location data but could not be matched to any vehicle.
              If one of these is your tracker's IMEI, update your vehicle's Device ID to match it exactly.
            </p>
            {unknownDevices.map((d) => (
              <div
                key={d.deviceId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 bg-background"
                data-testid={`row-unknown-device-${d.deviceId}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Signal className="h-4 w-4 text-amber-500 shrink-0" />
                  <span className="font-mono font-semibold text-foreground" data-testid={`text-unknown-imei-${d.deviceId}`}>{d.deviceId}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-muted-foreground">
                    {d.lat.toFixed(5)}, {d.lng.toFixed(5)} · {d.speed} km/h
                  </span>
                  <span className="text-muted-foreground">{new Date(d.seenAt).toLocaleTimeString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => useDeviceId(d.deviceId)}
                    data-testid={`button-use-device-id-${d.deviceId}`}
                  >
                    Use this ID
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : vehicles && vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} data-testid={`card-vehicle-${vehicle.id}`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: vehicle.iconColor || "#2563eb" }}
                    />
                    <CardTitle className="text-base">{vehicle.name}</CardTitle>
                  </div>
                  <Badge variant={getStatusBadge(vehicle.status)}>
                    {vehicle.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Device ID: </span>
                    <span className="font-medium">{vehicle.deviceId}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span className="font-medium capitalize">{vehicle.type}</span>
                  </div>

                  <div className="pt-2 rounded-md bg-muted p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">GPS Device Setup</p>

                    {/* GT06N / Binary TCP section */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Radio className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium">GT06N (Binary TCP)</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Set IMEI = <code className="text-xs">{vehicle.deviceId}</code> in fleet, then send this SMS to your device:
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="text-xs break-all flex-1 bg-background rounded px-1.5 py-0.5">SERVER,1,{serverHost},{gt06Port}#</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyGt06Cmd(vehicle.deviceId, vehicle.id)}
                          data-testid={`button-copy-gt06-${vehicle.id}`}
                          title="Copy GT06N SMS command"
                        >
                          {copiedGt06Id === vehicle.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        TCP port <strong>{gt06Port}</strong> · Device IMEI must match the Device ID above
                      </p>
                    </div>

                    {/* HTTP section */}
                    <div className="space-y-1 border-t pt-2">
                      <div className="flex items-center gap-1.5">
                        <Globe className="h-3 w-3 text-muted-foreground" />
                        <p className="text-xs font-medium">HTTP JSON (other trackers)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs break-all flex-1 bg-background rounded px-1.5 py-0.5">{serverUrl}/api/device/location</code>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => copyUrl(vehicle.deviceId, vehicle.id)}
                          data-testid={`button-copy-url-${vehicle.id}`}
                          title="Copy HTTP endpoint URL"
                        >
                          {copiedId === vehicle.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">POST · Body: <code className="text-xs">{"{ deviceId, latitude, longitude, speed }"}</code></p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEdit(vehicle)}
                      data-testid={`button-edit-${vehicle.id}`}
                      title="Edit vehicle"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => deleteMutation.mutate(vehicle.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${vehicle.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">No vehicles added yet</p>
            <Button onClick={() => setIsAddOpen(true)} data-testid="button-add-first-vehicle">
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
