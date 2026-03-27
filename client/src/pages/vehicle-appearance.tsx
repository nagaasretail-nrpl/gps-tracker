import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { VEHICLE_TYPE_OPTIONS, getMarkerSvg, getVehicleImg } from "@/lib/vehicleIcons";
import type { Vehicle } from "@shared/schema";
import { Palette } from "lucide-react";

const iconColors = [
  "#2563eb", "#dc2626", "#16a34a", "#ea580c", "#9333ea",
  "#0891b2", "#db2777", "#ca8a04", "#0d9488", "#64748b",
  "#f97316", "#7c3aed", "#059669", "#b91c1c", "#1d4ed8",
];

function VehicleAppearanceCard({ vehicle }: { vehicle: Vehicle }) {
  const { toast } = useToast();

  const [localType, setLocalType] = useState(vehicle.type ?? "car");
  const [localColor, setLocalColor] = useState(vehicle.iconColor ?? "#2563eb");

  const mutation = useMutation({
    mutationFn: async (data: { type?: string; iconColor?: string }) =>
      apiRequest("PATCH", `/api/vehicles/${vehicle.id}/appearance`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
    },
    onError: () => {
      toast({ title: "Failed to save appearance", variant: "destructive" });
    },
  });

  const handleTypeChange = (newType: string) => {
    setLocalType(newType);
    mutation.mutate({ type: newType, iconColor: localColor });
  };

  const handleColorChange = (newColor: string) => {
    setLocalColor(newColor);
    mutation.mutate({ type: localType, iconColor: newColor });
  };

  return (
    <Card data-testid={`card-vehicle-appearance-${vehicle.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base" data-testid={`text-vehicle-name-${vehicle.id}`}>
            {vehicle.name}
          </CardTitle>
          {mutation.isPending && (
            <span className="text-xs text-muted-foreground" data-testid={`status-saving-${vehicle.id}`}>Saving…</span>
          )}
        </div>
        {vehicle.licensePlate && (
          <p className="text-xs text-muted-foreground">{vehicle.licensePlate}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Icon Type</p>
          <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            {VEHICLE_TYPE_OPTIONS.map(vt => {
              const previewColor = localType === "arrow" ? "#22c55e" : localColor;
              return (
                <button
                  key={vt.value}
                  type="button"
                  onClick={() => handleTypeChange(vt.value)}
                  data-testid={`button-type-${vt.value}-${vehicle.id}`}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-md border-2 transition-colors ${localType === vt.value ? "border-primary bg-primary/10" : "border-border"}`}
                >
                  {vt.img ? (
                    <div className="w-8 h-8 rounded-md bg-neutral-900 flex items-center justify-center overflow-hidden pointer-events-none">
                      <img src={vt.img} alt={vt.label} className="w-7 h-7 object-contain" />
                    </div>
                  ) : (
                    <span
                      dangerouslySetInnerHTML={{ __html: getMarkerSvg(vt.value, vt.value === "arrow" ? "#22c55e" : previewColor, 0) }}
                      className="w-8 h-8 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full pointer-events-none"
                    />
                  )}
                  <span className="text-[9px] text-muted-foreground leading-none">{vt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {localType !== "arrow" && (
          <div>
            <p className="text-sm font-medium mb-2">Icon Color</p>
            <div className="flex flex-wrap gap-2">
              {iconColors.map(color => (
                <button
                  key={color}
                  type="button"
                  className="w-7 h-7 rounded-full border-2 transition-transform focus:outline-none"
                  style={{
                    backgroundColor: color,
                    borderColor: localColor === color ? "white" : "transparent",
                    outline: localColor === color ? `2px solid ${color}` : "none",
                    transform: localColor === color ? "scale(1.2)" : "scale(1)",
                  }}
                  onClick={() => handleColorChange(color)}
                  title={color}
                  data-testid={`button-color-${color.replace("#", "")}-${vehicle.id}`}
                />
              ))}
              <label
                className="flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed border-muted-foreground/50 cursor-pointer hover:border-foreground transition-colors"
                title="Custom color"
                data-testid={`label-custom-color-${vehicle.id}`}
              >
                <span className="text-[10px] text-muted-foreground font-bold">+</span>
                <input
                  type="color"
                  className="sr-only"
                  value={localColor}
                  onChange={e => handleColorChange(e.target.value)}
                  data-testid={`input-custom-color-${vehicle.id}`}
                />
              </label>
            </div>
          </div>
        )}

        {localType === "arrow" && (
          <div className="rounded-md bg-muted/60 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              Arrow icon color is automatic: <span className="text-green-600 dark:text-green-400 font-medium">green</span> when moving,{" "}
              <span className="text-orange-500 font-medium">orange</span> when ignition on,{" "}
              <span className="text-red-500 font-medium">red</span> when stopped.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function VehicleAppearance() {
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Palette className="h-5 w-5 text-primary shrink-0" />
        <h1 className="text-xl font-semibold" data-testid="heading-vehicle-appearance">Vehicle Appearance</h1>
      </div>
      <p className="text-sm text-muted-foreground -mt-2">
        Personalise the icon and color for each of your vehicles on the map.
      </p>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map(j => <Skeleton key={j} className="h-12 w-full rounded-md" />)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!isLoading && (!vehicles || vehicles.length === 0) && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm" data-testid="text-no-vehicles">
            No vehicles assigned to your account.
          </CardContent>
        </Card>
      )}

      {!isLoading && vehicles && vehicles.length > 0 && (
        <div className="space-y-4">
          {vehicles.map(vehicle => (
            <VehicleAppearanceCard key={vehicle.id} vehicle={vehicle} />
          ))}
        </div>
      )}
    </div>
  );
}
