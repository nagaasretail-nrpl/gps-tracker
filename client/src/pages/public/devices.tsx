import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PublicLayout } from "@/components/public-layout";
import { Search, Server, ChevronRight } from "lucide-react";

const SERVER_IP = "34.133.128.65";

interface DeviceModel {
  manufacturer: string;
  model: string;
  protocol: string;
  port: number;
  connType: "TCP" | "UDP" | "TCP/UDP";
  notes: string;
}

const DEVICES: DeviceModel[] = [
  { manufacturer: "Concox", model: "GT06N", protocol: "GT06", port: 5023, connType: "TCP", notes: "Standard GT06. Most common GT06 variant." },
  { manufacturer: "Concox", model: "GT06E", protocol: "GT06", port: 5023, connType: "TCP", notes: "GT06 extended variant. Heartbeat 0x8a is normal." },
  { manufacturer: "Concox", model: "JM-VG01U", protocol: "GT06", port: 5023, connType: "TCP", notes: "GT06 compatible, 3G module." },
  { manufacturer: "Concox", model: "WeTrack Lite", protocol: "GT06", port: 5023, connType: "TCP", notes: "Budget GT06 tracker. Popular in India." },
  { manufacturer: "Concox", model: "WeTrack2", protocol: "GT06", port: 5023, connType: "TCP", notes: "Upgraded WeTrack with ACC detection." },
  { manufacturer: "Concox", model: "ET25", protocol: "GT06", port: 5023, connType: "TCP", notes: "4G LTE variant of GT06 series." },
  { manufacturer: "Teltonika", model: "FMB120", protocol: "Teltonika CODEC8", port: 5027, connType: "TCP", notes: "CODEC8 protocol. High accuracy, GNSS multi-system." },
  { manufacturer: "Teltonika", model: "FMB130", protocol: "Teltonika CODEC8", port: 5027, connType: "TCP", notes: "External GNSS antenna variant." },
  { manufacturer: "Teltonika", model: "FMB920", protocol: "Teltonika CODEC8", port: 5027, connType: "TCP", notes: "Ultra-compact 4G LTE tracker." },
  { manufacturer: "Teltonika", model: "FMC130", protocol: "Teltonika CODEC8", port: 5027, connType: "TCP", notes: "4G Cat-M1 version of FMB130." },
  { manufacturer: "Teltonika", model: "FMB003", protocol: "Teltonika CODEC8", port: 5027, connType: "TCP", notes: "OBD plug-and-play tracker." },
  { manufacturer: "Queclink", model: "GV300", protocol: "GL200", port: 5028, connType: "TCP", notes: "Professional fleet tracker, GL200 protocol." },
  { manufacturer: "Queclink", model: "GV350", protocol: "GL200", port: 5028, connType: "TCP", notes: "3-axis accelerometer and gyroscope." },
  { manufacturer: "Queclink", model: "GV500", protocol: "GL200", port: 5028, connType: "TCP", notes: "Heavy-duty vehicle tracker, CAN bus support." },
  { manufacturer: "Queclink", model: "GL300", protocol: "GL200", port: 5028, connType: "TCP", notes: "Portable personal/asset tracker." },
  { manufacturer: "Coban", model: "GPS303", protocol: "GT06", port: 5023, connType: "TCP", notes: "GT06 compatible. SMS and data commands supported." },
  { manufacturer: "Coban", model: "GPS306", protocol: "GT06", port: 5023, connType: "TCP", notes: "Waterproof variant, same protocol as GPS303." },
  { manufacturer: "TK Star", model: "TK103", protocol: "GT06", port: 5023, connType: "TCP", notes: "Classic TK103. GT06 protocol variant." },
  { manufacturer: "TK Star", model: "TK303", protocol: "GT06", port: 5023, connType: "TCP", notes: "OBD version of TK103." },
  { manufacturer: "Sinotrack", model: "ST-901", protocol: "GT06", port: 5023, connType: "TCP", notes: "Magnetic mount, GT06 compatible." },
  { manufacturer: "Sinotrack", model: "ST-906", protocol: "GT06", port: 5023, connType: "TCP", notes: "Motorbike tracker with cut-off relay." },
  { manufacturer: "Sinotrack", model: "ST-907", protocol: "GT06", port: 5023, connType: "TCP", notes: "OBD II tracker." },
  { manufacturer: "Meitrack", model: "MT90", protocol: "Meitrack", port: 5029, connType: "TCP", notes: "Personal/vehicle tracker. Meitrack binary protocol." },
  { manufacturer: "Meitrack", model: "T366", protocol: "Meitrack", port: 5029, connType: "TCP", notes: "4G LTE fleet tracker." },
  { manufacturer: "Meitrack", model: "T399", protocol: "Meitrack", port: 5029, connType: "TCP", notes: "Industrial-grade with CAN bus." },
  { manufacturer: "Xexun", model: "TK102", protocol: "Xexun", port: 5030, connType: "TCP", notes: "Legacy Xexun protocol. Older model." },
  { manufacturer: "Xexun", model: "TK103", protocol: "Xexun", port: 5030, connType: "TCP", notes: "TK103 with Xexun protocol (different from Sinotrack TK103)." },
  { manufacturer: "Topflytech", model: "TLP1-SF", protocol: "Topflytech", port: 5031, connType: "TCP", notes: "Solar-powered asset tracker." },
  { manufacturer: "Ruptela", model: "FM-Pro4", protocol: "Ruptela", port: 5032, connType: "TCP", notes: "Ruptela binary protocol. European brand." },
  { manufacturer: "Calamp", model: "LMU-4230", protocol: "Calamp LMU", port: 5033, connType: "UDP", notes: "UDP-based Calamp protocol. North American market." },
  { manufacturer: "Jointech", model: "GP6000", protocol: "GT06", port: 5023, connType: "TCP", notes: "GT06 compatible. Anti-tamper alerts." },
  { manufacturer: "Huabao", model: "HB-TK103", protocol: "GT06", port: 5023, connType: "TCP", notes: "OEM GT06-based tracker." },
  { manufacturer: "Bitrek", model: "BI 868", protocol: "GT06", port: 5023, connType: "TCP", notes: "European compact tracker, GT06 compatible." },
  { manufacturer: "Benway", model: "BW-GPS102", protocol: "GT06", port: 5023, connType: "TCP", notes: "GT06 variant popular in South Asia." },
  { manufacturer: "Reachfar", model: "RF-V16", protocol: "GT06", port: 5023, connType: "TCP", notes: "Personal / elderly GT06 tracker." },
];

const MANUFACTURERS = Array.from(new Set(DEVICES.map((d) => d.manufacturer))).sort();
const PROTOCOLS = Array.from(new Set(DEVICES.map((d) => d.protocol))).sort();

const PROTOCOL_DESCRIPTIONS: Record<string, string> = {
  "GT06": "The most common GPS tracker binary protocol in Asia. Used by Concox, Coban, Sinotrack, TK Star, and many OEM trackers. Port 5023.",
  "Teltonika CODEC8": "Teltonika's own binary protocol used across the FMBxxx product line. Efficient, reliable, supports extended I/O. Port 5027.",
  "GL200": "Queclink's text-based protocol, also known as GL200. Used across GV and GL product lines. Port 5028.",
  "Meitrack": "Meitrack's own binary protocol used by MT and T series devices. Supports rich event types. Port 5029.",
  "Xexun": "Legacy Xexun text protocol. Older devices only. Port 5030.",
  "Topflytech": "Topflytech binary protocol for their asset and solar tracker range. Port 5031.",
  "Ruptela": "Ruptela binary protocol used by European-market trackers. Port 5032.",
  "Calamp LMU": "UDP-based Calamp LMU protocol. Used by Calamp devices in North America. Port 5033.",
};

export default function DevicesPage() {
  const [search, setSearch] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("All");
  const [selectedProtocol, setSelectedProtocol] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return DEVICES.filter((d) => {
      if (selectedManufacturer !== "All" && d.manufacturer !== selectedManufacturer) return false;
      if (selectedProtocol !== "All" && d.protocol !== selectedProtocol) return false;
      if (!q) return true;
      return (
        d.model.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q) ||
        d.protocol.toLowerCase().includes(q) ||
        String(d.port).includes(q)
      );
    });
  }, [search, selectedManufacturer, selectedProtocol]);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="border-b bg-card py-12 md:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Supported GPS Devices
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            NistaGPS works with 30+ tracker models from leading manufacturers. Find your device below to get the server configuration details.
          </p>
        </div>
      </section>

      {/* Server connection info */}
      <section className="border-b bg-primary/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <Server className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Server connection details</span>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
              <span>IP / Host: <span className="font-mono font-medium text-foreground">{SERVER_IP}</span></span>
              <span>GT06 Port: <span className="font-mono font-medium text-foreground">5023</span> (TCP)</span>
              <span>Teltonika Port: <span className="font-mono font-medium text-foreground">5027</span> (TCP)</span>
              <span>Queclink Port: <span className="font-mono font-medium text-foreground">5028</span> (TCP)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Search and filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by model name, manufacturer, protocol, or port..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              data-testid="input-device-search"
            />
          </div>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedManufacturer}
            onChange={(e) => setSelectedManufacturer(e.target.value)}
            data-testid="select-manufacturer"
          >
            <option value="All">All manufacturers</option>
            {MANUFACTURERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={selectedProtocol}
            onChange={(e) => setSelectedProtocol(e.target.value)}
            data-testid="select-protocol"
          >
            <option value="All">All protocols</option>
            {PROTOCOLS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Showing {filtered.length} of {DEVICES.length} device models
        </p>
      </div>

      {/* Device table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="table-devices">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Manufacturer</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Model</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Protocol</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Port</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-background">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-muted-foreground">
                      No devices found matching your search.
                    </td>
                  </tr>
                ) : (
                  filtered.map((device, idx) => (
                    <tr
                      key={idx}
                      className="hover-elevate"
                      data-testid={`device-row-${device.model.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{device.manufacturer}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{device.model}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary font-medium">
                          {device.protocol}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono whitespace-nowrap">{device.port}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          device.connType === "UDP"
                            ? "bg-muted text-muted-foreground"
                            : "bg-muted/60 text-foreground"
                        }`}>
                          {device.connType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{device.notes}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Protocol guide */}
      <section className="border-t bg-card py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold mb-6">Protocol Reference</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PROTOCOL_DESCRIPTIONS).map(([proto, desc]) => (
              <div
                key={proto}
                className="p-4 rounded-md border bg-background"
                data-testid={`protocol-card-${proto.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <h3 className="font-semibold text-sm mb-1">{proto}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Device config example */}
      <section className="py-14 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl font-bold mb-6">Quick device configuration</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-md border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">GT06 devices (SMS command)</h3>
            <div className="rounded-md bg-muted/60 px-4 py-3 font-mono text-sm overflow-x-auto">
              SERVER,1,{SERVER_IP},5023,0#
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send this SMS from your phone to the SIM number inside the tracker. Replace port if using a different protocol.
            </p>
          </div>
          <div className="rounded-md border bg-card p-5">
            <h3 className="font-semibold text-sm mb-3">Teltonika devices (Configurator)</h3>
            <div className="rounded-md bg-muted/60 px-4 py-3 text-sm space-y-1">
              <div className="font-mono">Server IP: {SERVER_IP}</div>
              <div className="font-mono">Server Port: 5027</div>
              <div className="font-mono">Protocol: TCP</div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Use Teltonika Configurator software or the FOTA web tool to apply these settings.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link href="/getting-started">
            <Button data-testid="devices-setup-link">
              Full Setup Guide <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link href="/troubleshooting">
            <Button variant="outline" data-testid="devices-troubleshoot-link">
              Troubleshooting
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}
