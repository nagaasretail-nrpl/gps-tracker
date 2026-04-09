import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt } from "lucide-react";
import { format } from "date-fns";

interface BillingRecord {
  id: string;
  vehicleId: string;
  vehicleName: string;
  deviceId: string | null;
  plan: string;
  status: string;
  expiresAt: string | null;
  createdAt: string | null;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="default" data-testid={`badge-status-${status}`}>Active</Badge>;
  if (status === "expired") return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Expired</Badge>;
  if (status === "cancelled") return <Badge variant="destructive" data-testid={`badge-status-${status}`}>Cancelled</Badge>;
  return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status}</Badge>;
}

export default function BillingHistoryPage() {
  const { data: history = [], isLoading } = useQuery<BillingRecord[]>({
    queryKey: ["/api/billing/history"],
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b flex-shrink-0">
        <h1 className="text-xl font-semibold" data-testid="heading-billing-history">Billing History</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Vehicle subscription and payment records</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              {isLoading ? "Loading…" : `${history.length} record${history.length !== 1 ? "s" : ""}`}
            </CardTitle>
            <CardDescription>All vehicle subscription records and payment history</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activated</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : history.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                      No billing records yet. Activate a device to create the first record.
                    </TableCell>
                  </TableRow>
                ) : (
                  history.map((rec) => (
                    <TableRow key={rec.id} data-testid={`row-billing-${rec.id}`}>
                      <TableCell className="font-medium text-sm">{rec.vehicleName}</TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">{rec.deviceId ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{rec.plan}</TableCell>
                      <TableCell>{statusBadge(rec.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rec.createdAt ? format(new Date(rec.createdAt), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {rec.expiresAt ? format(new Date(rec.expiresAt), "dd MMM yyyy") : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
