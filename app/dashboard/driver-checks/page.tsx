import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Shield } from "lucide-react";
import { DriverCheckButton } from "@/components/driver-check/DriverCheckButton";

function ApprovalBadge({ status }: { status: string | null }) {
  if (status === "approved") {
    return (
      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
        Approved
      </Badge>
    );
  }
  if (status === "disapproved") {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20">
        Disapproved
      </Badge>
    );
  }
  if (status === "flagged") {
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
        Flagged
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="bg-slate-500/10 text-slate-400 border-slate-500/20">
      Pending
    </Badge>
  );
}

export default async function DriverChecksPage() {
  const operator = await getOperator();
  const supabase = createAdminClient();

  const { data: checks } = await supabase
    .from("driver_checks")
    .select("*")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const total = checks?.length ?? 0;
  const approved = checks?.filter((c) => c.approval_status === "approved").length ?? 0;
  const flagged =
    checks?.filter(
      (c) => c.approval_status === "flagged" || c.approval_status === "disapproved" || !c.approval_status
    ).length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Driver Checks</h1>
          <p className="text-muted-foreground">
            Verify driver licenses before putting them in your car. $50 per check.
          </p>
        </div>
        <DriverCheckButton />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
          <CardContent className="pt-6">
            <p className="text-sm text-white/50 mb-1">Total Checks</p>
            <p className="text-3xl font-bold text-white">{total}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
          <CardContent className="pt-6">
            <p className="text-sm text-white/50 mb-1">Approved</p>
            <p className="text-3xl font-bold text-emerald-400">{approved}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
          <CardContent className="pt-6">
            <p className="text-sm text-white/50 mb-1">Flagged / Pending</p>
            <p className="text-3xl font-bold text-amber-400">{flagged}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content */}
      {!checks || checks.length === 0 ? (
        <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Shield className="h-12 w-12 text-white/20 mb-4" />
            <h3 className="font-semibold text-white mb-1">No checks yet</h3>
            <p className="text-sm text-white/50 mb-6">
              Run your first driver verification.
            </p>
            <DriverCheckButton />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-white/50">Driver</TableHead>
                  <TableHead className="text-white/50">Email</TableHead>
                  <TableHead className="text-white/50">Date</TableHead>
                  <TableHead className="text-white/50">State</TableHead>
                  <TableHead className="text-white/50">Status</TableHead>
                  <TableHead className="text-white/50">Violations</TableHead>
                  <TableHead className="text-white/50">Accidents</TableHead>
                  <TableHead className="text-right text-white/50">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checks.map((check) => (
                  <TableRow key={check.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="font-medium text-white">
                      {check.renter_name || "—"}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {check.renter_email || "—"}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {check.created_at
                        ? new Date(check.created_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {check.renter_license_state || "—"}
                    </TableCell>
                    <TableCell>
                      <ApprovalBadge status={check.approval_status} />
                    </TableCell>
                    <TableCell className="text-white/60">
                      {check.violations_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-white/60">
                      {check.accidents_count ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <DriverCheckButton
                        renterEmail={check.renter_email ?? undefined}
                        renterName={check.renter_name ?? undefined}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
