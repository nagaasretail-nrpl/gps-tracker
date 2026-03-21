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
import { Plus, Trash2, Copy, Check, Radio, Globe, Signal, AlertCircle, Pencil, ChevronDown, ChevronRight } from "lucide-react";
import type { Vehicle, InsertVehicle } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertVehicleSchema } from "@shared/schema";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VEHICLE_TYPE_OPTIONS, getMarkerSvg, getVehicleImg } from "@/lib/vehicleIcons";

const FUEL_TYPE_OPTIONS = [
  { value: "petrol", label: "Petrol" },
  { value: "diesel", label: "Diesel" },
  { value: "cng", label: "CNG" },
  { value: "electric", label: "Electric" },
] as const;

type FuelTypeValue = typeof FUEL_TYPE_OPTIONS[number]["value"] | "" | "none";

function fuelEfficiencyLabel(fuelType: FuelTypeValue): string {
  return fuelType === "electric" ? "Efficiency (km/kWh)" : "Efficiency (km/L)";
}

const addVehicleFormSchema = insertVehicleSchema.extend({
  fuelEfficiency: z.coerce.number().positive("Must be a positive number").nullable().optional(),
  fuelType: z.enum(["petrol", "diesel", "cng", "electric", "none"]).nullable().optional(),
  fuelRatePerLiter: z.coerce.number().positive("Must be a positive number").nullable().optional(),
  fuelTankCapacity: z.coerce.number().positive("Must be a positive number").nullable().optional(),
  devicePhone: z.string().nullable().optional(),
});

const iconColors = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea",
  "#0891b2", "#db2777", "#ca8a04", "#0d9488", "#64748b",
  "#f97316", "#7c3aed", "#059669", "#b91c1c", "#1d4ed8",
];

export default function Vehicles() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editName, setEditName] = useState("");
  const [editDeviceId, setEditDeviceId] = useState("");
  const [editIconColor, setEditIconColor] = useState("#2563eb");
  const [editType, setEditType] = useState("car");
  const [editFuelType, setEditFuelType] = useState<FuelTypeValue>("");
  const [editFuelEfficiency, setEditFuelEfficiency] = useState<string>("");
  const [editFuelRatePerLiter, setEditFuelRatePerLiter] = useState<string>("");
  const [editFuelTankCapacity, setEditFuelTankCapacity] = useState<string>("");
  const [editDevicePhone, setEditDevicePhone] = useState<string>("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedGt06Id, setCopiedGt06Id] = useState<string | null>(null);
  const [setupExpanded, setSetupExpanded] = useState(false);
  const { toast } = useToast();

  const serverUrl = window.location.origin;
  const serverHost = window.location.hostname;
  const gt06Port = 5023;

  const copyUrl = (cardId: string) => {
    const url = `${serverUrl}/api/device/location`;
    navigator.clipboard.writeText(url);
    setCopiedId(cardId);
    toast({ description: "HTTP endpoint URL copied to clipboard" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyGt06Cmd = (cardId: string) => {
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

  type AddVehicleForm = z.infer<typeof addVehicleFormSchema>;
  const form = useForm<AddVehicleForm>({
    resolver: zodResolver(addVehicleFormSchema),
    defaultValues: {
      name: "",
      deviceId: "",
      type: "car",
      status: "offline",
      iconColor: "#2563eb",
      fuelType: null,
      fuelEfficiency: null,
      fuelRatePerLiter: null,
      fuelTankCapacity: null,
      devicePhone: null,
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: AddVehicleForm) => {
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
    mutationFn: async ({ id, name, deviceId, iconColor, type, fuelType, fuelEfficiency, fuelRatePerLiter, fuelTankCapacity, devicePhone }: { id: string; name: string; deviceId: string; iconColor: string; type: string; fuelType: string | null; fuelEfficiency: number | null; fuelRatePerLiter: number | null; fuelTankCapacity: number | null; devicePhone: string | null }) => {
      return await apiRequest("PATCH", `/api/vehicles/${id}`, { name, deviceId, iconColor, type, fuelType: fuelType || null, fuelEfficiency, fuelRatePerLiter, fuelTankCapacity, devicePhone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      setEditingVehicle(null);
      toast({ title: "Vehicle updated", description: "Changes saved successfully." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update vehicle.", variant: "destructive" });
    },
  });

  const openEdit = (v: Vehicle) => {
    setEditingVehicle(v);
    setEditName(v.name);
    setEditDeviceId(v.deviceId);
    setEditIconColor(v.iconColor || "#2563eb");
    setEditType(v.type || "car");
    setEditFuelType(v.fuelType ? (v.fuelType as FuelTypeValue) : "none");
    setEditFuelEfficiency(v.fuelEfficiency != null ? String(v.fuelEfficiency) : "");
    setEditFuelRatePerLiter(v.fuelRatePerLiter != null ? String(v.fuelRatePerLiter) : "");
    setEditFuelTankCapacity(v.fuelTankCapacity != null ? String(v.fuelTankCapacity) : "");
    setEditDevicePhone(v.devicePhone ?? "");
    setSetupExpanded(false);
  };

  const onSubmit = (data: AddVehicleForm) => {
    addMutation.mutate({ ...data, fuelType: (data.fuelType === "none" ? null : data.fuelType) ?? null });
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold mb-1">Vehicles</h1>
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
          <DialogContent className="max-h-[90vh] overflow-y-auto">
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
                  render={({ field }) => {
                    const currentColor = form.watch("iconColor") ?? "#2563eb";
                    return (
                      <FormItem>
                        <FormLabel>Icon Type</FormLabel>
                        <FormControl>
                          <div className="grid grid-cols-5 gap-1.5">
                            {VEHICLE_TYPE_OPTIONS.map((vt) => (
                              <button
                                key={vt.value}
                                type="button"
                                onClick={() => field.onChange(vt.value)}
                                data-testid={`button-add-type-${vt.value}`}
                                className={`flex flex-col items-center gap-1 p-1.5 rounded-md border-2 transition-colors ${field.value === vt.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"}`}
                              >
                                {vt.img ? (
                                  <div className="w-8 h-8 rounded-md bg-neutral-900 flex items-center justify-center overflow-hidden pointer-events-none">
                                    <img src={vt.img} alt={vt.label} className="w-7 h-7 object-contain" />
                                  </div>
                                ) : (
                                  <span
                                    dangerouslySetInnerHTML={{ __html: getMarkerSvg(vt.value, currentColor, 0) }}
                                    className="w-8 h-8 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full pointer-events-none"
                                  />
                                )}
                                <span className="text-[9px] text-muted-foreground leading-none">{vt.label}</span>
                              </button>
                            ))}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                <FormField
                  control={form.control}
                  name="iconColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Icon Color</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {iconColors.map((color) => (
                              <button
                                key={color}
                                type="button"
                                className="w-7 h-7 rounded-full border-2 transition-transform focus:outline-none"
                                style={{
                                  backgroundColor: color,
                                  borderColor: field.value === color ? "white" : "transparent",
                                  outline: field.value === color ? `2px solid ${color}` : "none",
                                  transform: field.value === color ? "scale(1.2)" : "scale(1)",
                                }}
                                onClick={() => field.onChange(color)}
                                title={color}
                                data-testid={`button-add-color-${color.replace("#", "")}`}
                              />
                            ))}
                            <label
                              className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/50 cursor-pointer hover:border-foreground transition-colors"
                              title="Custom color"
                            >
                              <span className="text-[10px] text-muted-foreground font-bold">+</span>
                              <input
                                type="color"
                                className="sr-only"
                                value={field.value ?? "#2563eb"}
                                onChange={e => field.onChange(e.target.value)}
                                data-testid="input-add-custom-color"
                              />
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-4 h-4 rounded-full border border-border/50"
                              style={{ backgroundColor: field.value ?? "#2563eb" }}
                            />
                            <span className="text-xs text-muted-foreground font-mono">{field.value}</span>
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fuel Type */}
                <FormField
                  control={form.control}
                  name="fuelType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={(val) => field.onChange(val || null)}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-add-fuel-type">
                            <SelectValue placeholder="Not set" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not set</SelectItem>
                          {FUEL_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fuel Efficiency */}
                <FormField
                  control={form.control}
                  name="fuelEfficiency"
                  render={({ field }) => {
                    const watchedFuelType = form.watch("fuelType") as FuelTypeValue ?? "";
                    return (
                      <FormItem>
                        <FormLabel>{fuelEfficiencyLabel(watchedFuelType)} <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            placeholder="e.g. 15"
                            value={field.value ?? ""}
                            onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                            data-testid="input-add-fuel-efficiency"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    );
                  }}
                />

                {/* Fuel Rate Per Liter */}
                <FormField
                  control={form.control}
                  name="fuelRatePerLiter"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Rate (per Liter) <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          placeholder="e.g. 100"
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          data-testid="input-add-fuel-rate"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fuel Tank Capacity */}
                <FormField
                  control={form.control}
                  name="fuelTankCapacity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Tank Capacity (Liters) <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="e.g. 50"
                          value={field.value ?? ""}
                          onChange={e => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                          data-testid="input-add-fuel-tank"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="devicePhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Device Phone <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="SIM phone number on tracker"
                          data-testid="input-add-device-phone"
                        />
                      </FormControl>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vehicle</DialogTitle>
            <DialogDescription>Update vehicle details, icon color, and type.</DialogDescription>
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
            <div className="space-y-1">
              <Label htmlFor="edit-device-phone">Device Phone <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Input
                id="edit-device-phone"
                value={editDevicePhone}
                onChange={e => setEditDevicePhone(e.target.value)}
                placeholder="SIM phone number on tracker"
                data-testid="input-edit-device-phone"
              />
              <p className="text-xs text-muted-foreground">SIM card number installed in the GPS tracker.</p>
            </div>
            <div className="space-y-2">
              <Label>Icon Type</Label>
              <div className="grid grid-cols-5 gap-1.5">
                {VEHICLE_TYPE_OPTIONS.map(vt => (
                  <button
                    key={vt.value}
                    type="button"
                    onClick={() => setEditType(vt.value)}
                    data-testid={`button-edit-type-${vt.value}`}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-md border-2 transition-colors ${editType === vt.value ? "border-primary bg-primary/10" : "border-border hover:border-muted-foreground/40"}`}
                  >
                    {vt.img ? (
                      <div className="w-8 h-8 rounded-md bg-neutral-900 flex items-center justify-center overflow-hidden pointer-events-none">
                        <img src={vt.img} alt={vt.label} className="w-7 h-7 object-contain" />
                      </div>
                    ) : (
                      <span
                        dangerouslySetInnerHTML={{ __html: getMarkerSvg(vt.value, editIconColor, 0) }}
                        className="w-8 h-8 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full pointer-events-none"
                      />
                    )}
                    <span className="text-[9px] text-muted-foreground leading-none">{vt.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Icon Color</Label>
              <div className="flex flex-wrap gap-2">
                {iconColors.map(color => (
                  <button
                    key={color}
                    type="button"
                    className="w-7 h-7 rounded-full border-2 transition-transform focus:outline-none"
                    style={{
                      backgroundColor: color,
                      borderColor: editIconColor === color ? "white" : "transparent",
                      outline: editIconColor === color ? `2px solid ${color}` : "none",
                      transform: editIconColor === color ? "scale(1.2)" : "scale(1)",
                    }}
                    onClick={() => setEditIconColor(color)}
                    title={color}
                    data-testid={`button-edit-color-${color.replace("#", "")}`}
                  />
                ))}
                <label
                  className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/50 cursor-pointer hover:border-foreground transition-colors"
                  title="Custom color"
                  data-testid="label-custom-color"
                >
                  <span className="text-[10px] text-muted-foreground font-bold">+</span>
                  <input
                    type="color"
                    className="sr-only"
                    value={editIconColor}
                    onChange={e => setEditIconColor(e.target.value)}
                    data-testid="input-custom-color"
                  />
                </label>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <div
                  className="w-5 h-5 rounded-full border border-border"
                  style={{ backgroundColor: editIconColor }}
                />
                <span className="text-xs text-muted-foreground font-mono">{editIconColor}</span>
              </div>
            </div>

            {/* Fuel Type */}
            <div className="space-y-1">
              <Label>Fuel Type <span className="text-muted-foreground font-normal text-xs">(optional)</span></Label>
              <Select
                value={editFuelType}
                onValueChange={(val) => setEditFuelType(val as FuelTypeValue)}
              >
                <SelectTrigger data-testid="select-edit-fuel-type">
                  <SelectValue placeholder="Not set" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Not set</SelectItem>
                  {FUEL_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Fuel Efficiency */}
            <div className="space-y-1">
              <Label htmlFor="edit-fuel-efficiency">
                {fuelEfficiencyLabel(editFuelType)} <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                id="edit-fuel-efficiency"
                type="number"
                min="0.1"
                step="0.1"
                placeholder="e.g. 15"
                value={editFuelEfficiency}
                onChange={e => setEditFuelEfficiency(e.target.value)}
                data-testid="input-edit-fuel-efficiency"
              />
            </div>

            {/* Fuel Rate Per Liter */}
            <div className="space-y-1">
              <Label htmlFor="edit-fuel-rate">
                Fuel Rate (per Liter) <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                id="edit-fuel-rate"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 100"
                value={editFuelRatePerLiter}
                onChange={e => setEditFuelRatePerLiter(e.target.value)}
                data-testid="input-edit-fuel-rate"
              />
            </div>

            {/* Fuel Tank Capacity */}
            <div className="space-y-1">
              <Label htmlFor="edit-fuel-tank">
                Fuel Tank Capacity (Liters) <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Input
                id="edit-fuel-tank"
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 50"
                value={editFuelTankCapacity}
                onChange={e => setEditFuelTankCapacity(e.target.value)}
                data-testid="input-edit-fuel-tank"
              />
            </div>

            {/* Device Setup — collapsible section in Edit dialog */}
            <div className="border rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setSetupExpanded(v => !v)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium bg-muted/50 hover:bg-muted transition-colors"
                data-testid="button-toggle-device-setup"
              >
                <span>Device Setup</span>
                {setupExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </button>
              {setupExpanded && (
                <div className="px-3 py-3 space-y-3 text-sm bg-background">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Radio className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold">GT06N (Binary TCP)</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Set IMEI = <code className="text-xs font-mono">{editDeviceId || "your-device-id"}</code> in fleet, then send this SMS:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs break-all flex-1 bg-muted rounded px-1.5 py-1 font-mono">
                        SERVER,1,{serverHost},{gt06Port}#
                      </code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyGt06Cmd("edit")}
                        data-testid="button-copy-gt06-edit"
                        title="Copy GT06N SMS command"
                      >
                        {copiedGt06Id === "edit" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">TCP port <strong>{gt06Port}</strong> · IMEI must match Device ID above</p>
                  </div>
                  <div className="space-y-1.5 border-t pt-2.5">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <p className="text-xs font-semibold">HTTP JSON (other trackers)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs break-all flex-1 bg-muted rounded px-1.5 py-1 font-mono">{serverUrl}/api/device/location</code>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => copyUrl("edit")}
                        data-testid="button-copy-url-edit"
                        title="Copy HTTP endpoint URL"
                      >
                        {copiedId === "edit" ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">POST · Body: <code className="text-xs font-mono">{"{ deviceId, latitude, longitude, speed }"}</code></p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingVehicle(null)}>Cancel</Button>
              <Button
                disabled={editMutation.isPending || !editName.trim() || !editDeviceId.trim()}
                onClick={() => editingVehicle && editMutation.mutate({
                  id: editingVehicle.id,
                  name: editName.trim(),
                  deviceId: editDeviceId.trim(),
                  iconColor: editIconColor,
                  type: editType,
                  fuelType: (editFuelType === "none" || editFuelType === "") ? null : editFuelType as string,
                  fuelEfficiency: editFuelEfficiency !== "" ? parseFloat(editFuelEfficiency) : null,
                  fuelRatePerLiter: editFuelRatePerLiter !== "" ? parseFloat(editFuelRatePerLiter) : null,
                  fuelTankCapacity: editFuelTankCapacity !== "" ? parseFloat(editFuelTankCapacity) : null,
                  devicePhone: editDevicePhone.trim() !== "" ? editDevicePhone.trim() : null,
                })}
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

      {/* Vehicle list — compact rows */}
      {isLoading ? (
        <div className="flex flex-col gap-1">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : vehicles && vehicles.length > 0 ? (
        <Card>
          <div className="divide-y">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex items-center gap-3 px-4 py-3 min-h-[48px]"
                data-testid={`row-vehicle-${vehicle.id}`}
              >
                {/* Vehicle icon */}
                <div
                  className="w-9 h-9 rounded-lg bg-neutral-900 flex items-center justify-center shrink-0 overflow-hidden"
                  data-testid={`dot-vehicle-${vehicle.id}`}
                >
                  {getVehicleImg(vehicle.type ?? "car") ? (
                    <img
                      src={getVehicleImg(vehicle.type ?? "car")!}
                      alt={vehicle.type ?? "car"}
                      className="w-8 h-8 object-contain"
                    />
                  ) : (
                    <span
                      dangerouslySetInnerHTML={{ __html: getMarkerSvg(vehicle.type ?? "car", vehicle.iconColor ?? "#2563eb", 0) }}
                      className="w-8 h-8 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full pointer-events-none"
                    />
                  )}
                </div>

                {/* Name */}
                <span
                  className="font-medium text-sm flex-1 min-w-0 truncate"
                  data-testid={`text-vehicle-name-${vehicle.id}`}
                >
                  {vehicle.name}
                </span>

                {/* Device ID */}
                <span
                  className="text-xs text-muted-foreground font-mono truncate max-w-[120px] sm:max-w-[200px]"
                  title={vehicle.deviceId}
                  data-testid={`text-vehicle-deviceid-${vehicle.id}`}
                >
                  {vehicle.deviceId}
                </span>

                {/* Status badge */}
                <Badge
                  variant={getStatusBadge(vehicle.status)}
                  className="shrink-0 capitalize"
                  data-testid={`badge-vehicle-status-${vehicle.id}`}
                >
                  {vehicle.status}
                </Badge>

                {/* Action buttons */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(vehicle)}
                    data-testid={`button-edit-${vehicle.id}`}
                    title="Edit vehicle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteMutation.mutate(vehicle.id)}
                    disabled={deleteMutation.isPending}
                    data-testid={`button-delete-${vehicle.id}`}
                    title="Delete vehicle"
                    className="text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
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
