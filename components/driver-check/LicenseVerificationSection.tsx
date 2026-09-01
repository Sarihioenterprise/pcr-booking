"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX, Clock, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle, Loader2, RefreshCw,
} from "lucide-react";
import { DriverCheckButton } from "./DriverCheckButton";
import { createClient } from "@/lib/supabase/client";

interface DriverCheck {
  id: string;
  status: string;
  result: string | null;
  license_status: string | null;
  license_class: string | null;
  violations_count: number | null;
  accidents_count: number | null;
  approval_status: string;
  approval_reason: string | null;
  auto_approved_at: string | null;
  manually_approved_at: string | null;
  completed_at: string | null;
  created_at: string;
  renter_name: string | null;
  renter_email: string | null;
}

interface Props {
  renterId: string;
  renterEmail?: string;
  renterName?: string;
}

const APPROVAL_CONFIG = {
  approved: {
    label: "APPROVED",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: ShieldCheck,
    iconColor: "text-emerald-400",
  },
  disapproved: {
    label: "DISAPPROVED",
    color: "bg-red-500/10 text-red-400 border-red-500/30",
    icon: ShieldX,
    iconColor: "text-red-400",
  },
  flagged: {
    label: "FLAGGED — REVIEW REQUIRED",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    icon: ShieldAlert,
    iconColor: "text-amber-400",
  },
  pending: {
    label: "PENDING VERIFICATION",
    color: "bg-slate-500/10 text-slate-400 border-slate-500/30",
    icon: Clock,
    iconColor: "text-slate-400",
  },
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function LicenseVerificationSection({ renterId, renterEmail, renterName }: Props) {
  const [checks, setChecks] = useState<DriverCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [overrideAction, setOverrideAction] = useState<"approved" | "disapproved" | null>(null);
  const [overrideReason, setOverrideReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("driver_checks")
      .select("*")
      .eq("renter_id", renterId)
      .order("created_at", { ascending: false });
    setChecks(data ?? []);
    setLoading(false);
  }, [renterId]);

  useEffect(() => { load(); }, [load]);

  async function submitOverride() {
    if (!overrideAction || !checks[0]) return;
    setSaving(true);
    const res = await fetch(`/api/driver-checks/${checks[0].id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: overrideAction, reason: overrideReason || undefined }),
    });
    if (res.ok) {
      setOverrideAction(null);
      setOverrideReason("");
      await load();
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  const latest = checks[0] ?? null;
  const history = checks.slice(1);
  const approval = latest ? APPROVAL_CONFIG[latest.approval_status as keyof typeof APPROVAL_CONFIG] ?? APPROVAL_CONFIG.pending : null;
  const ApprovalIcon = approval?.icon ?? Shield;

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          <Shield className="h-4 w-4 text-slate-400" />
          License Verification
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {!latest ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">No verification on file for this driver.</p>
            <DriverCheckButton
              renterId={renterId}
              renterEmail={renterEmail}
              renterName={renterName}
              onCheckInitiated={load}
            />
          </div>
        ) : (
          <>
            {/* Approval Status Banner */}
            <div className={`rounded-lg border p-3 flex items-center gap-3 ${approval?.color}`}>
              <ApprovalIcon className={`h-6 w-6 shrink-0 ${approval?.iconColor}`} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{approval?.label}</p>
                {latest.approval_reason && (
                  <p className="text-xs opacity-80 mt-0.5">{latest.approval_reason}</p>
                )}
                <p className="text-xs opacity-60 mt-0.5">
                  {latest.auto_approved_at
                    ? `Auto-verified ${fmt(latest.auto_approved_at)}`
                    : latest.manually_approved_at
                    ? `Manually set ${fmt(latest.manually_approved_at)}`
                    : `Check started ${fmt(latest.created_at)}`}
                </p>
              </div>
            </div>

            {/* MVR Results */}
            {latest.status === "complete" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                {latest.license_status && (
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-slate-500 mb-0.5">License Status</p>
                    <p className="text-slate-200 font-medium capitalize">{latest.license_status}</p>
                  </div>
                )}
                {latest.license_class && (
                  <div className="bg-slate-900/50 rounded p-2">
                    <p className="text-slate-500 mb-0.5">License Class</p>
                    <p className="text-slate-200 font-medium">{latest.license_class}</p>
                  </div>
                )}
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-500 mb-0.5">Violations</p>
                  <p className={`font-medium ${(latest.violations_count ?? 0) > 0 ? "text-amber-400" : "text-slate-200"}`}>
                    {latest.violations_count ?? 0}
                  </p>
                </div>
                <div className="bg-slate-900/50 rounded p-2">
                  <p className="text-slate-500 mb-0.5">Accidents</p>
                  <p className={`font-medium ${(latest.accidents_count ?? 0) > 0 ? "text-red-400" : "text-slate-200"}`}>
                    {latest.accidents_count ?? 0}
                  </p>
                </div>
              </div>
            )}

            {/* Manual Override */}
            {latest.status === "complete" && (
              <div className="border border-slate-700 rounded-lg p-3 space-y-2">
                <p className="text-xs text-slate-400 font-medium">Manual Override</p>
                {!overrideAction ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-emerald-700 text-emerald-400 hover:bg-emerald-900/20 text-xs h-7"
                      onClick={() => setOverrideAction("approved")}
                    >
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-700 text-red-400 hover:bg-red-900/20 text-xs h-7"
                      onClick={() => setOverrideAction("disapproved")}
                    >
                      <XCircle className="h-3 w-3 mr-1" /> Disapprove
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400">
                      Reason (optional):
                    </p>
                    <Textarea
                      value={overrideReason}
                      onChange={(e) => setOverrideReason(e.target.value)}
                      placeholder={overrideAction === "approved" ? "e.g. Operator reviewed and approved" : "e.g. Too many violations for our policy"}
                      className="bg-slate-900 border-slate-600 text-slate-100 text-xs min-h-[60px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={submitOverride}
                        disabled={saving}
                        className={`text-xs h-7 ${overrideAction === "approved" ? "bg-emerald-700 hover:bg-emerald-800" : "bg-red-700 hover:bg-red-800"} text-white`}
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : `Confirm ${overrideAction === "approved" ? "Approval" : "Disapproval"}`}
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-slate-400" onClick={() => { setOverrideAction(null); setOverrideReason(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Run New Check */}
            <div className="flex items-center justify-between pt-1">
              <DriverCheckButton
                renterId={renterId}
                renterEmail={renterEmail ?? latest.renter_email ?? undefined}
                renterName={renterName ?? latest.renter_name ?? undefined}
                onCheckInitiated={load}
              />
              <Button variant="ghost" size="sm" className="text-xs text-slate-500 h-7 gap-1" onClick={load}>
                <RefreshCw className="h-3 w-3" /> Refresh
              </Button>
            </div>

            {/* Check History */}
            {history.length > 0 && (
              <div className="border-t border-slate-700 pt-3">
                <button
                  className="text-xs text-slate-500 flex items-center gap-1 hover:text-slate-300"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  {history.length} previous {history.length === 1 ? "check" : "checks"}
                </button>
                {showHistory && (
                  <div className="mt-2 space-y-2">
                    {history.map((c) => {
                      const cfg = APPROVAL_CONFIG[c.approval_status as keyof typeof APPROVAL_CONFIG] ?? APPROVAL_CONFIG.pending;
                      return (
                        <div key={c.id} className="flex items-center justify-between text-xs bg-slate-900/40 rounded p-2">
                          <span className="text-slate-400">{fmt(c.created_at)}</span>
                          <Badge className={`text-[10px] border ${cfg.color}`}>{cfg.label}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
