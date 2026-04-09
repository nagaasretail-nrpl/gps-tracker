import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";
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
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import type { Driver, Vehicle } from "@shared/schema";

type DriverForm = {
  name: string;
  phone: string;
  licenseNumber: string;
  assignedVehicleId: string;
  notes: string;
};

const EMPTY_FORM: DriverForm = { name: "", phone: "", licenseNumber: "", assignedVehicleId: "", notes: "" };

export default function DriversPage() {
  const { toast } = useToast();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [form, setForm] = useState<DriverForm>(EMPTY_FORM);

  const { data: driversData, isLoading } = useQuery<Driver[]>({ queryKey: ["/api/drivers"] });
  const { data: vehiclesData } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });

  const drivers = driversData ?? [];
  const vehicles = vehiclesData ?? [];
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v.name]));

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/drivers", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/drivers"] }); setSheetOpen(false); toast({ title: "Driver added" }); },
    onError: () => toast({ title: "Failed to add driver", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/drivers/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/drivers"] }); setSheetOpen(false); toast({ title: "Driver updated" }); },
    onError: () => toast({ title: "Failed to update driver", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/drivers/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/drivers"] }); toast({ title: "Driver removed" }); },
    onError: () => toast({ title: "Failed to remove driver", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSheetOpen(true); };
  const openEdit = (d: Driver) => {
    setEditing(d);
    setForm({
      name: d.name,
      phone: d.phone ?? "",
      licenseNumber: d.licenseNumber ?? "",
      assignedVehicleId: d.assignedVehicleId ?? "",
      notes: d.notes ?? "",
    });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast({ title: "Driver name is required", variant: "destructive" }); return; }
    const payload = {
      name: form.name,
      phone: form.phone || null,
      licenseNumber: form.licenseNumber || null,
      assignedVehicleId: form.assignedVehicleId || null,
      notes: form.notes || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold" data-testid="heading-drivers">Drivers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your fleet drivers</p>
        </div>
        <Button onClick={openCreate} data-testid="button-add-driver">
          <Plus className="h-4 w-4 mr-2" />
          Add Driver
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              {isLoading ? "Loading…" : `${drivers.length} driver${drivers.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>License</TableHead>
                  <TableHead>Assigned Vehicle</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : drivers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                      No drivers yet. Add your first driver.
                    </TableCell>
                  </TableRow>
                ) : (
                  drivers.map((d) => (
                    <TableRow key={d.id} data-testid={`row-driver-${d.id}`}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-sm">{d.phone ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-sm">{d.licenseNumber ?? <span className="text-muted-foreground">—</span>}</TableCell>
                      <TableCell>
                        {d.assignedVehicleId ? (
                          <Badge variant="secondary">{vehicleMap.get(d.assignedVehicleId) ?? d.assignedVehicleId}</Badge>
                        ) : <span className="text-muted-foreground text-sm">Unassigned</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(d)} data-testid={`button-edit-driver-${d.id}`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(d.id)} data-testid={`button-delete-driver-${d.id}`}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
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
            <SheetTitle>{editing ? "Edit Driver" : "Add Driver"}</SheetTitle>
          </SheetHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="driver-name">Name *</Label>
              <Input id="driver-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Driver name" data-testid="input-driver-name" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="driver-phone">Phone</Label>
              <Input id="driver-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" data-testid="input-driver-phone" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="driver-license">License Number</Label>
              <Input id="driver-license" value={form.licenseNumber} onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })} placeholder="DL-XXXXXXXXXX" data-testid="input-driver-license" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="driver-vehicle">Assign to Vehicle</Label>
              <Select value={form.assignedVehicleId || "none"} onValueChange={(v) => setForm({ ...form, assignedVehicleId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-driver-vehicle">
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="driver-notes">Notes</Label>
              <Textarea id="driver-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any additional info" data-testid="input-driver-notes" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} data-testid="button-cancel-driver">Cancel</Button>
            <Button onClick={handleSubmit} disabled={isPending} data-testid="button-save-driver">
              {isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
