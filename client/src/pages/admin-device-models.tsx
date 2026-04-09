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
import { Plus, Pencil, Trash2, Cpu } from "lucide-react";
import type { DeviceModel } from "@shared/schema";

const PROTOCOLS = [
  { value: "gt06", label: "GT06" },
  { value: "teltonika", label: "Teltonika" },
  { value: "queclink", label: "Queclink" },
  { value: "tk103", label: "TK103" },
  { value: "meitrack", label: "Meitrack" },
  { value: "suntech", label: "Suntech" },
  { value: "ruptela", label: "Ruptela" },
  { value: "gosafe", label: "GoSafe" },
  { value: "calamp", label: "CalAmp" },
  { value: "eelink", label: "Eelink" },
  { value: "syrus", label: "Syrus" },
  { value: "other", label: "Other" },
];

const CONNECTION_TYPES = [
  { value: "tcp", label: "TCP" },
  { value: "udp", label: "UDP" },
  { value: "both", label: "TCP + UDP" },
];

type ModelForm = {
  manufacturer: string;
  modelName: string;
  protocol: string;
  port: string;
  connectionType: string;
  activationNotes: string;
};

const EMPTY_FORM: ModelForm = {
  manufacturer: "", modelName: "", protocol: "gt06", port: "5023", connectionType: "tcp", activationNotes: "",
};

function protocolBadge(protocol: string) {
  const colors: Record<string, string> = {
    gt06: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700",
    teltonika: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700",
    queclink: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700",
  };
  return <Badge className={colors[protocol] ?? ""} variant={colors[protocol] ? undefined : "secondary"}>{protocol.toUpperCase()}</Badge>;
}

export default function AdminDeviceModelsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<DeviceModel | null>(null);
  const [form, setForm] = useState<ModelForm>(EMPTY_FORM);

  const { data: modelsData, isLoading } = useQuery<DeviceModel[]>({ queryKey: ["/api/device-models"] });
  const models = modelsData ?? [];

  const filtered = search
    ? models.filter((m) =>
        m.manufacturer.toLowerCase().includes(search.toLowerCase()) ||
        m.modelName.toLowerCase().includes(search.toLowerCase()) ||
        m.protocol.toLowerCase().includes(search.toLowerCase())
      )
    : models;

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/device-models", data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-models"] }); setSheetOpen(false); toast({ title: "Device model added" }); },
    onError: () => toast({ title: "Failed to add model", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => apiRequest("PUT", `/api/device-models/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-models"] }); setSheetOpen(false); toast({ title: "Device model updated" }); },
    onError: () => toast({ title: "Failed to update model", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/device-models/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/device-models"] }); toast({ title: "Model removed" }); },
    onError: () => toast({ title: "Failed to remove model", variant: "destructive" }),
  });

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setSheetOpen(true); };
  const openEdit = (m: DeviceModel) => {
    setEditing(m);
    setForm({
      manufacturer: m.manufacturer,
      modelName: m.modelName,
      protocol: m.protocol,
      port: m.port != null ? String(m.port) : "",
      connectionType: m.connectionType,
      activationNotes: m.activationNotes ?? "",
    });
    setSheetOpen(true);
  };

  const handleSubmit = () => {
    if (!form.manufacturer.trim() || !form.modelName.trim()) {
      toast({ title: "Manufacturer and model name are required", variant: "destructive" });
      return;
    }
    const payload = {
      manufacturer: form.manufacturer,
      modelName: form.modelName,
      protocol: form.protocol,
      port: form.port ? parseInt(form.port) : null,
      connectionType: form.connectionType,
      activationNotes: form.activationNotes || null,
    };
    if (editing) updateMutation.mutate({ id: editing.id, data: payload });
    else createMutation.mutate(payload);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold" data-testid="heading-device-models">Device Model Registry</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Supported GPS tracker models and protocols</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search models…"
            className="w-48"
            data-testid="input-search-models"
          />
          <Button onClick={openCreate} data-testid="button-add-model">
            <Plus className="h-4 w-4 mr-2" />Add Model
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              {isLoading ? "Loading…" : `${filtered.length} model${filtered.length !== 1 ? "s" : ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Manufacturer</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Protocol</TableHead>
                  <TableHead>Port</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Activation Notes</TableHead>
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>)}</TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                      {search ? "No models match your search." : "No device models yet."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((m) => (
                    <TableRow key={m.id} data-testid={`row-model-${m.id}`}>
                      <TableCell className="font-medium">{m.manufacturer}</TableCell>
                      <TableCell>{m.modelName}</TableCell>
                      <TableCell>{protocolBadge(m.protocol)}</TableCell>
                      <TableCell className="text-sm">{m.port ?? "—"}</TableCell>
                      <TableCell className="text-sm uppercase">{m.connectionType}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">{m.activationNotes ?? "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(m)} data-testid={`button-edit-model-${m.id}`}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(m.id)} data-testid={`button-delete-model-${m.id}`}><Trash2 className="h-4 w-4" /></Button>
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
          <SheetHeader><SheetTitle>{editing ? "Edit Device Model" : "Add Device Model"}</SheetTitle></SheetHeader>
          <div className="py-4 flex flex-col gap-4">
            <div className="grid gap-1.5">
              <Label>Manufacturer *</Label>
              <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} placeholder="e.g. Concox" data-testid="input-manufacturer" />
            </div>
            <div className="grid gap-1.5">
              <Label>Model Name *</Label>
              <Input value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })} placeholder="e.g. GT06N" data-testid="input-model-name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Protocol</Label>
                <Select value={form.protocol} onValueChange={(v) => setForm({ ...form, protocol: v })}>
                  <SelectTrigger data-testid="select-protocol"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PROTOCOLS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Port</Label>
                <Input type="number" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })} placeholder="5023" data-testid="input-port" />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Connection Type</Label>
              <Select value={form.connectionType} onValueChange={(v) => setForm({ ...form, connectionType: v })}>
                <SelectTrigger data-testid="select-connection-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONNECTION_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Activation Notes</Label>
              <Textarea value={form.activationNotes} onChange={(e) => setForm({ ...form, activationNotes: e.target.value })} placeholder="Configuration instructions…" data-testid="input-activation-notes" />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)} data-testid="button-cancel-model">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-model">
              {createMutation.isPending || updateMutation.isPending ? "Saving…" : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
