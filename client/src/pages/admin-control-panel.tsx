import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Save, Plus, Trash2, Key, Shield, Palette, FileText, ClipboardList } from "lucide-react";
import type { AppSetting } from "@shared/schema";

function SettingField({ label, settingKey, description, multiline = false }: {
  label: string; settingKey: string; description?: string; multiline?: boolean;
}) {
  const { toast } = useToast();
  const { data: settings } = useQuery<AppSetting[]>({ queryKey: ["/api/settings"] });
  const setting = settings?.find((s) => s.key === settingKey);
  const [value, setValue] = useState<string | null>(null);
  const currentValue = value ?? setting?.value ?? "";

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", `/api/settings/${settingKey}`, { value: currentValue }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {multiline ? (
        <Textarea value={currentValue} onChange={(e) => setValue(e.target.value)} rows={4} data-testid={`input-setting-${settingKey}`} />
      ) : (
        <Input value={currentValue} onChange={(e) => setValue(e.target.value)} data-testid={`input-setting-${settingKey}`} />
      )}
      <Button size="default" variant="outline" className="w-fit" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid={`button-save-${settingKey}`}>
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function BrandingTab() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Branding Settings</CardTitle>
          <CardDescription>Customize your GPS platform appearance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingField label="Platform Name" settingKey="platform_name" description="Shown in emails and notifications" />
          <SettingField label="Logo URL" settingKey="logo_url" description="Full URL to your company logo (PNG recommended)" />
          <SettingField label="Primary Color" settingKey="primary_color" description="Hex color code for brand accent (e.g. #e4006e)" />
          <SettingField label="Support Email" settingKey="support_email" description="Contact email shown to users" />
          <SettingField label="Support Phone" settingKey="support_phone" description="Contact phone shown in footer" />
        </CardContent>
      </Card>
    </div>
  );
}

function ApiKeysTab() {
  const { toast } = useToast();
  const { data: settings } = useQuery<AppSetting[]>({ queryKey: ["/api/settings"] });
  const apiKeysSetting = settings?.find((s) => s.key === "api_keys");
  const apiKeys: { key: string; label: string; createdAt: string }[] = apiKeysSetting?.value
    ? JSON.parse(apiKeysSetting.value)
    : [];

  const saveMutation = useMutation({
    mutationFn: (keys: typeof apiKeys) => apiRequest("PUT", "/api/settings/api_keys", { value: JSON.stringify(keys) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Saved" }); },
    onError: () => toast({ title: "Failed to save", variant: "destructive" }),
  });

  const generateKey = () => {
    const newKey = {
      key: "nista_" + Array.from(crypto.getRandomValues(new Uint8Array(20))).map((b) => b.toString(16).padStart(2, "0")).join(""),
      label: `API Key ${apiKeys.length + 1}`,
      createdAt: new Date().toISOString(),
    };
    saveMutation.mutate([...apiKeys, newKey]);
  };

  const revokeKey = (key: string) => {
    saveMutation.mutate(apiKeys.filter((k) => k.key !== key));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <CardDescription>Keys for integrating external systems with your GPS platform</CardDescription>
          </div>
          <Button size="default" onClick={generateKey} disabled={saveMutation.isPending} data-testid="button-generate-key">
            <Plus className="h-4 w-4 mr-2" />
            Generate Key
          </Button>
        </CardHeader>
        <CardContent>
          {apiKeys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys. Generate one to get started.</p>
          ) : (
            <div className="space-y-3">
              {apiKeys.map((k) => (
                <div key={k.key} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3" data-testid={`card-api-key-${k.key.slice(-8)}`}>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{k.label}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">{k.key}</div>
                    <div className="text-xs text-muted-foreground">Created {new Date(k.createdAt).toLocaleDateString()}</div>
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => revokeKey(k.key)} data-testid={`button-revoke-${k.key.slice(-8)}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FirewallTab() {
  const { toast } = useToast();
  const [newIp, setNewIp] = useState("");
  const { data: settings } = useQuery<AppSetting[]>({ queryKey: ["/api/settings"] });
  const firewallSetting = settings?.find((s) => s.key === "blocked_ips");
  const blockedIps: string[] = firewallSetting?.value ? JSON.parse(firewallSetting.value) : [];

  const saveMutation = useMutation({
    mutationFn: (ips: string[]) => apiRequest("PUT", "/api/settings/blocked_ips", { value: JSON.stringify(ips) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Firewall updated" }); },
    onError: () => toast({ title: "Failed to update", variant: "destructive" }),
  });

  const addIp = () => {
    const ip = newIp.trim();
    if (!ip) return;
    if (blockedIps.includes(ip)) { toast({ title: "IP already blocked" }); return; }
    saveMutation.mutate([...blockedIps, ip]);
    setNewIp("");
  };

  const removeIp = (ip: string) => saveMutation.mutate(blockedIps.filter((i) => i !== ip));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Blocked IP Addresses</CardTitle>
          <CardDescription>Connections from these IPs will be rejected by the GPS server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={newIp}
              onChange={(e) => setNewIp(e.target.value)}
              placeholder="IP address or CIDR (e.g. 192.168.1.100)"
              onKeyDown={(e) => e.key === "Enter" && addIp()}
              data-testid="input-blocked-ip"
            />
            <Button onClick={addIp} disabled={saveMutation.isPending} data-testid="button-block-ip">
              <Plus className="h-4 w-4 mr-2" />
              Block
            </Button>
          </div>
          {blockedIps.length === 0 ? (
            <p className="text-sm text-muted-foreground">No IPs blocked. All connections are allowed.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {blockedIps.map((ip) => (
                <Badge key={ip} variant="secondary" className="gap-1.5 pr-1.5" data-testid={`badge-ip-${ip}`}>
                  {ip}
                  <button onClick={() => removeIp(ip)} className="hover:text-destructive transition-colors" data-testid={`button-unblock-${ip}`}>
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TemplatesTab() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Email Templates</CardTitle>
          <CardDescription>Customize notification email content</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingField
            label="Subscription Expiry Email"
            settingKey="email_expiry_template"
            description="Sent when subscription is about to expire. Use {name}, {expiry_date}, {renewal_link} as placeholders."
            multiline
          />
          <SettingField
            label="Welcome Email"
            settingKey="email_welcome_template"
            description="Sent when a new user account is created."
            multiline
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">SMS Templates</CardTitle>
          <CardDescription>Customize SMS alert messages sent to device SIM cards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SettingField
            label="Speed Alert SMS"
            settingKey="sms_speed_template"
            description="Sent when a speed violation is detected. Use {vehicle}, {speed}, {limit}."
          />
          <SettingField
            label="Geofence Alert SMS"
            settingKey="sms_geofence_template"
            description="Sent for geofence entry/exit. Use {vehicle}, {geofence}, {event}."
          />
        </CardContent>
      </Card>
    </div>
  );
}

type Activity = {
  id: string;
  userId: string | null;
  action: string;
  detail: string | null;
  createdAt: string | null;
};

function AuditTab() {
  const { data: auditItems = [], isLoading } = useQuery<Activity[]>({ queryKey: ["/api/audit-log"] });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit Log</CardTitle>
          <CardDescription>Recent administrative actions (read-only)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted animate-pulse rounded-md" />)}
            </div>
          ) : auditItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No audit entries yet</p>
          ) : (
            <div className="space-y-0">
              {auditItems.map((item, i) => (
                <div key={item.id ?? i} className="flex flex-wrap items-start gap-3 py-2 border-b last:border-b-0" data-testid={`row-audit-${i}`}>
                  <div className="text-xs text-muted-foreground whitespace-nowrap w-32">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString("en-IN", { hour12: false, month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{item.action}</div>
                    {item.detail && <div className="text-xs text-muted-foreground truncate">{item.detail}</div>}
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{item.userId ? "admin" : "system"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminControlPanelPage() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold" data-testid="heading-control-panel">Control Panel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Platform configuration and administration</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Tabs defaultValue="branding">
          <TabsList className="mb-4 flex-wrap h-auto" data-testid="tabs-control-panel">
            <TabsTrigger value="branding" data-testid="tab-branding">
              <Palette className="h-4 w-4 mr-1.5" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="api-keys" data-testid="tab-api-keys">
              <Key className="h-4 w-4 mr-1.5" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="firewall" data-testid="tab-firewall">
              <Shield className="h-4 w-4 mr-1.5" />
              Firewall
            </TabsTrigger>
            <TabsTrigger value="templates" data-testid="tab-templates">
              <FileText className="h-4 w-4 mr-1.5" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">
              <ClipboardList className="h-4 w-4 mr-1.5" />
              Audit Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="branding"><BrandingTab /></TabsContent>
          <TabsContent value="api-keys"><ApiKeysTab /></TabsContent>
          <TabsContent value="firewall"><FirewallTab /></TabsContent>
          <TabsContent value="templates"><TemplatesTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
