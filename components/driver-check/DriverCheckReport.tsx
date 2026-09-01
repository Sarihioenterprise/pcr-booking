import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldCheck, ShieldAlert, Clock, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";

interface DriverCheck {
  id: string;
  status: "pending" | "consent_sent" | "running" | "complete" | "failed" | "cancelled";
  result: "clear" | "review" | "suspended" | "revoked" | "expired" | null;
  license_status: string | null;
  license_class: string | null;
  violations_count: number | null;
  accidents_count: number | null;
  completed_at: string | null;
  created_at: string;
  renter_name: string | null;
}

interface Props {
  check: DriverCheck;
}

const STATUS_CONFIG = {
  pending: { label: "Pending Payment", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: Clock },
  consent_sent: { label: "Awaiting Consent", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: Clock },
  running: { label: "Running", color: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Loader2 },
  complete: { label: "Complete", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: CheckCircle },
  failed: { label: "Failed", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: AlertTriangle },
  cancelled: { label: "Cancelled", color: "bg-slate-500/10 text-slate-400 border-slate-500/20", icon: AlertTriangle },
};

const RESULT_CONFIG = {
  clear: { label: "CLEAR", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", icon: ShieldCheck },
  review: { label: "REVIEW", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldAlert },
  suspended: { label: "SUSPENDED", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: ShieldAlert },
  revoked: { label: "REVOKED", color: "bg-red-500/10 text-red-400 border-red-500/20", icon: ShieldAlert },
  expired: { label: "EXPIRED", color: "bg-amber-500/10 text-amber-400 border-amber-500/20", icon: ShieldAlert },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DriverCheckReport({ check }: Props) {
  const statusCfg = STATUS_CONFIG[check.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = statusCfg.icon;
  const resultCfg = check.result ? RESULT_CONFIG[check.result] : null;
  const ResultIcon = resultCfg?.icon ?? Shield;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-slate-400" />
            PCR Booking Driver Report
          </span>
          <Badge className={`text-xs border ${statusCfg.color}`}>
            <StatusIcon className={`h-3 w-3 mr-1 ${check.status === "running" ? "animate-spin" : ""}`} />
            {statusCfg.label}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {check.status === "consent_sent" && (
          <p className="text-xs text-slate-400">
            Consent email sent to driver. Check will run once they authorize it.
          </p>
        )}

        {check.status === "complete" && resultCfg && (
          <>
            <div className="flex items-center gap-3">
              <Badge className={`text-sm px-3 py-1 border ${resultCfg.color} font-semibold`}>
                <ResultIcon className="h-4 w-4 mr-1.5" />
                {resultCfg.label}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {check.license_status && (
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-500 mb-0.5">License Status</p>
                  <p className="text-slate-200 font-medium capitalize">{check.license_status}</p>
                </div>
              )}
              {check.license_class && (
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-500 mb-0.5">License Class</p>
                  <p className="text-slate-200 font-medium">{check.license_class}</p>
                </div>
              )}
              <div className="bg-slate-900/50 rounded p-2">
                <p className="text-slate-500 mb-0.5">Violations</p>
                <p className={`font-medium ${(check.violations_count ?? 0) > 0 ? "text-amber-400" : "text-slate-200"}`}>
                  {check.violations_count ?? 0}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded p-2">
                <p className="text-slate-500 mb-0.5">Accidents</p>
                <p className={`font-medium ${(check.accidents_count ?? 0) > 0 ? "text-red-400" : "text-slate-200"}`}>
                  {check.accidents_count ?? 0}
                </p>
              </div>
            </div>

            {check.completed_at && (
              <p className="text-xs text-slate-500">
                Checked {formatDate(check.completed_at)}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
