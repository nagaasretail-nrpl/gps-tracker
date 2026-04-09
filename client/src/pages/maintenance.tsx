import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { Vehicle } from "@shared/schema";

interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  odometer: number | null;
  cost: string | null;
  notes: string | null;
  nextDueOdometer: number | null;
  nextDueDate: string | null;
  createdAt: string;
}

const SERVICE_TYPES = [
  { value: "oil_change", label: "Oil Change" },
  { value: "tire", label: "Tire Service" },
  { value: "inspection", label: "Inspection" },
  { value: "battery", label: "Battery" },
  { value: "brake", label: "Brake Service" },
  { value: "filter", label: "Filter Replacement" },
  { value: "transmission", label: "Transmission" },
  { value: "other", label: "Other" },
];

function serviceLabel(type: string) {
  return SERVICE_TYPES.find((s) => s.value === type)?.label ?? type;
}

type RecordForm = {
  vehicleId: string;
  serviceType: string;
  serviceDate: string;
  odometer: string;
  cost: string;
  notes: string;
  nextDueOdometer: string;
  nextDueDate: string;
};

const EMPTY_FORM: RecordForm = {
  vehicleId: "", serviceType: "oil_change", serviceDate: format(new Date(), "yyyy-MM-dd"),
  odometer: "", cost: "", notes: "", nextDueOdometer: "", nextDueDate: "",
};

export default function MaintenancePage() {
  const { toast } = useToast();
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState<RecordForm>(EMPTY_FORM);

  const { data: vehiclesData } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const vehicles = vehiclesData ?? [];
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v.name]));

  const params = vehicleFilter !== "all" ? `?vehicleId=${vehicleFilter}` : "";
  const { data: recordsData, isLoading } = useQuery<MaintenanceRecord[]>({
    queryKey: ["/api/maintenance", vehicleFilter],
    queryFn: async () => {
      const res = await fetch(`/api/maintenance${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const records = recordsData ?? [];

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/maintenance", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] }); setSheetOpen(false); toast({ title: "Record added" }); },
    onError: () => toast({ title: "Failed to add record", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/maintenance/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] }); setSheetOpen(false); toast({ title: "Record updated" }); },
    onError: () => toast({ title: "Failed to update record", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/maintenance/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/maintenance"] }); toast({ title: "Record deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSheetOpen(true); };
  const openEdit = (r: MaintenanceRecord) => {
    setEditing(r);
    setForm({
      vehicleId: r.vehicleId,
      serviceType: r.serviceType,
      serviceDate: format(new Date(r.serviceDate), "yyyy-MM-dd"),
      odometer: r.odometer != null ? String(r.odometer) : "",
      cost: r.cost ?? "",
      notes: r.notes ?? "",
      nextDueOdometer: r.nextDueOdometer != null ? String(r.nextDueOdometer) : "",
      nextDueDate: r.nextDueDate ? format(new Date(r.nextDueDate), "yyyy-MM-dd") : "",
    });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!form.vehicleId) { toast({ title: "Please select a vehicle", variant: "destructive" }); return; }
    const payload = {
      vehicleId: form.vehicleId,
      serviceType: form.serviceType,
      serviceDate: form.serviceDate,
      odometer: form.odometer ? parseInt(form.odometer) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      notes: form.notes || null,
      nextDueOdometer: form.nextDueOdometer ? parseInt(form.nextDueOdometer) : null,
      nextDueDate: form.nextDueDate || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const isDue = (r: MaintenanceRecord) =>
    (r.nextDueDate && new Date(r.nextDueDate) <= new Date()) || false;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold" data-testid="heading-maintenance">Maintenance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Service records and reminders</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40" data-testid="select-vehicle-maintenance">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} data-testid="button-add-maintenance">
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              {isLoading ? "Loading…" : `${records.length} service record${records.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      No maintenance records. Add your first service record.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id} data-testid={`row-maintenance-${r.id}`}>
                      <TableCell className="font-medium">{vehicleMap.get(r.vehicleId) ?? r.vehicleId}</TableCell>
                      <TableCell className="text-sm">{serviceLabel(r.serviceType)}</TableCell>
                      <TableCell className="text-sm">{r.serviceDate ? format(new Date(r.serviceDate), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell className="text-sm">{r.odometer != null ? `${r.odometer.toLocaleString()} km` : "—"}</TableCell>
                      <TableCell className="text-sm">{r.cost != null ? `₹${parseFloat(r.cost).toLocaleString()}` : "—"}</TableCell>
                      <TableCell>
                        {r.nextDueDate ? (
                          <span className={`text-xs flex items-center gap-1 ${isDue(r) ? "text-destructive" : "text-muted-foreground"}`}>
                            {isDue(r) && <AlertTriangle className="h-3 w-3" />}
                            {format(new Date(r.nextDueDate), "dd MMM yyyy")}
                          </span>
                        ) : r.nextDueOdometer ? (
                          <span className="text-xs text-muted-foreground">{r.nextDueOdometer.toLocaleString()} km</span>
                        ) : <span className="text-muted-foreground text-sm">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(r)} data-testid={`button-edit-maintenance-${r.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)} data-testid={`button-delete-maintenance-${r.id}`}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Service Record" : "Add Service Record"}</SheetTitle>
          </SheetHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label>Vehicle *</Label>
              <Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-maintenance-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select vehicle</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Service Type</Label>
              <Select value={form.serviceType} onValueChange={(v) => setForm({ ...form, serviceType: v })}>
                <SelectTrigger data-testid="select-service-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Service Date</Label>
              <Input type="date" value={form.serviceDate} onChange={(e) => setForm({ ...form, serviceDate: e.target.value })} data-testid="input-service-date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Odometer (km)</Label>
                <Input type="number" value={form.odometer} onChange={(e) => setForm({ ...form, odometer: e.target.value })} placeholder="0" data-testid="input-odometer" />
              </div>
              <div className="grid gap-1.5">
                <Label>Cost (₹)</Label>
                <Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="0.00" data-testid="input-cost" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Next Due Odometer</Label>
                <Input type="number" value={form.nextDueOdometer} onChange={(e) => setForm({ ...form, nextDueOdometer: e.target.value })} placeholder="km" data-testid="input-next-odometer" />
              </div>
              <div className="grid gap-1.5">
                <Label>Next Due Date</Label>
                <Input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} data-testid="input-next-date" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional notes" data-testid="input-maintenance-notes" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} data-testid="button-cancel-maintenance">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-maintenance">
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
