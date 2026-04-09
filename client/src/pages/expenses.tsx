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
import { Plus, Pencil, Trash2, Banknote, Fuel } from "lucide-react";
import { format, subDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Vehicle } from "@shared/schema";

interface Expense {
  id: string;
  vehicleId: string;
  category: string;
  date: string;
  amount: string;
  liters: string | null;
  notes: string | null;
  createdAt: string;
}

const CATEGORIES = [
  { value: "fuel", label: "Fuel", icon: "Fuel" },
  { value: "repair", label: "Repair" },
  { value: "other", label: "Other" },
];

function categoryBadge(cat: string) {
  if (cat === "fuel") return <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700">Fuel</Badge>;
  if (cat === "repair") return <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">Repair</Badge>;
  return <Badge variant="secondary">Other</Badge>;
}

type ExpenseForm = { vehicleId: string; category: string; date: string; amount: string; liters: string; notes: string };
const EMPTY_FORM: ExpenseForm = { vehicleId: "", category: "fuel", date: format(new Date(), "yyyy-MM-dd"), amount: "", liters: "", notes: "" };

export default function ExpensesPage() {
  const { toast } = useToast();
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [startDate] = useState(subDays(new Date(), 30));

  const { data: vehiclesData } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const vehicles = vehiclesData ?? [];
  const vehicleMap = new Map(vehicles.map((v) => [v.id, v.name]));

  const params = new URLSearchParams({ startDate: startDate.toISOString() });
  if (vehicleFilter !== "all") params.set("vehicleId", vehicleFilter);

  const { data: expensesData, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", vehicleFilter],
    queryFn: async () => {
      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });
  const allExpenses = expensesData ?? [];

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/expenses", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setSheetOpen(false); toast({ title: "Expense added" }); },
    onError: () => toast({ title: "Failed to add expense", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/expenses/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); setSheetOpen(false); toast({ title: "Expense updated" }); },
    onError: () => toast({ title: "Failed to update expense", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/expenses/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/expenses"] }); toast({ title: "Expense deleted" }); },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSheetOpen(true); };
  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ vehicleId: e.vehicleId, category: e.category, date: format(new Date(e.date), "yyyy-MM-dd"), amount: e.amount, liters: e.liters ?? "", notes: e.notes ?? "" });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!form.vehicleId) { toast({ title: "Please select a vehicle", variant: "destructive" }); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { toast({ title: "Amount must be positive", variant: "destructive" }); return; }
    const payload = {
      vehicleId: form.vehicleId,
      category: form.category,
      date: form.date,
      amount: parseFloat(form.amount),
      liters: form.liters ? parseFloat(form.liters) : null,
      notes: form.notes || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  // Per-vehicle summary for chart
  const vehicleTotals = vehicles.map((v) => {
    const vExpenses = allExpenses.filter((e) => e.vehicleId === v.id);
    const total = vExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    return { name: v.name.length > 10 ? v.name.slice(0, 10) + "…" : v.name, total };
  }).filter((v) => v.total > 0);

  const totalAmount = allExpenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold" data-testid="heading-expenses">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fuel fills and repair costs</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="w-40" data-testid="select-vehicle-expenses">
              <SelectValue placeholder="All Vehicles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={openCreate} data-testid="button-add-expense">
            <Plus className="h-4 w-4 mr-2" />Add Expense
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Expenses (30 days)</div>
              <div className="text-2xl font-semibold" data-testid="stat-total-expenses">₹{totalAmount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Fuel Expenses</div>
              <div className="text-2xl font-semibold" data-testid="stat-fuel-expenses">
                ₹{allExpenses.filter((e) => e.category === "fuel").reduce((s, e) => s + parseFloat(e.amount), 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground mb-1">Total Entries</div>
              <div className="text-2xl font-semibold" data-testid="stat-expense-count">{allExpenses.length}</div>
            </CardContent>
          </Card>
        </div>

        {vehicleTotals.length > 1 && (
          <Card>
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">Cost by Vehicle (30 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={vehicleTotals}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${v}`} />
                  <Tooltip formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Total"]} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Banknote className="h-4 w-4" />
              {isLoading ? "Loading…" : `${allExpenses.length} expense${allExpenses.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Liters</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : allExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">No expense entries. Add your first expense.</TableCell>
                  </TableRow>
                ) : (
                  allExpenses.map((e) => (
                    <TableRow key={e.id} data-testid={`row-expense-${e.id}`}>
                      <TableCell className="font-medium">{vehicleMap.get(e.vehicleId) ?? e.vehicleId}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{e.date ? format(new Date(e.date), "dd MMM yyyy") : "—"}</TableCell>
                      <TableCell>{categoryBadge(e.category)}</TableCell>
                      <TableCell className="font-medium">₹{parseFloat(e.amount).toLocaleString("en-IN")}</TableCell>
                      <TableCell className="text-sm">{e.liters != null ? `${parseFloat(e.liters).toFixed(2)} L` : "—"}</TableCell>
                      <TableCell className="text-sm max-w-xs truncate">{e.notes ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(e)} data-testid={`button-edit-expense-${e.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(e.id)} data-testid={`button-delete-expense-${e.id}`}><Trash2 className="h-4 w-4" /></Button>
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
          <SheetHeader><SheetTitle>{editing ? "Edit Expense" : "Add Expense"}</SheetTitle></SheetHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label>Vehicle *</Label>
              <Select value={form.vehicleId || "none"} onValueChange={(v) => setForm({ ...form, vehicleId: v === "none" ? "" : v })}>
                <SelectTrigger data-testid="select-expense-vehicle"><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select vehicle</SelectItem>
                  {vehicles.map((v) => <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="select-expense-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="input-expense-date" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Amount (₹) *</Label>
                <Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="0.00" data-testid="input-expense-amount" />
              </div>
              {form.category === "fuel" && (
                <div className="grid gap-1.5">
                  <Label>Liters</Label>
                  <Input type="number" value={form.liters} onChange={(e) => setForm({ ...form, liters: e.target.value })} placeholder="0.0" data-testid="input-expense-liters" />
                </div>
              )}
            </div>
            <div className="grid gap-1.5">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" data-testid="input-expense-notes" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} data-testid="button-cancel-expense">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-expense">
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
