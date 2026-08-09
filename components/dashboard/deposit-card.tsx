"use client";

/**
 * DepositCard — shown on booking detail page (Details tab)
 *
 * Handles:
 * - Deposit status display (badge + timestamps)
 * - Request deposit hold (→ emails renter with link)
 * - Capture full / partial (with reason input)
 * - Release hold
 * - Late fee quick-fill (pre-fills capture amount)
 *
 * Graceful degradation:
 * - If operator has no Stripe → shows setup prompt
 * - If migration 020 not applied → shows migration notice
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  Clock,
  DollarSign,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import type { Booking, Operator } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────────────

interface DepositCardProps {
  booking: Booking & {
    deposit_captured_amount?: number | null;
    deposit_authorized_at?: string | null;
    deposit_captured_at?: string | null;
    deposit_released_at?: string | null;
    deposit_capture_reason?: string | null;
    deposit_token?: string | null;
    late_fee_amount?: number | null;
  };
  operator: Operator & {
    late_fee_per_day?: number | null;
    late_fee_enabled?: boolean;
  };
  onUpdate?: () => void;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatDateTime(d: string) {
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function formatCurrency(n: number) {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function computeLateFee(booking: DepositCardProps["booking"], lateFeePerDay: number): {
  daysLate: number;
  lateFee: number;
  cappedLateFee: number;
} {
  const today = new Date().toISOString().split("T")[0];
  const endDate = booking.end_date;
  if (!endDate || today <= endDate) return { daysLate: 0, lateFee: 0, cappedLateFee: 0 };

  const daysDiff = Math.floor(
    (new Date(today).getTime() - new Date(endDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  const rawFee = daysDiff * lateFeePerDay;
  const depositAmount = booking.deposit_amount || 0;
  return {
    daysLate: daysDiff,
    lateFee: rawFee,
    cappedLateFee: Math.min(rawFee, depositAmount),
  };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  none:               { label: "No Deposit",      color: "bg-slate-50 text-slate-500 border-slate-200",   icon: CreditCard },
  pending_auth:       { label: "Pending Auth",    color: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  held:               { label: "Hold Active",     color: "bg-blue-50 text-blue-700 border-blue-200",      icon: ShieldCheck },
  captured:           { label: "Captured",        color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  partially_captured: { label: "Partial Capture", color: "bg-purple-50 text-purple-700 border-purple-200", icon: ShieldAlert },
  released:           { label: "Released",        color: "bg-slate-50 text-slate-500 border-slate-200",   icon: ShieldX },
  expired:            { label: "Expired",         color: "bg-red-50 text-red-700 border-red-200",         icon: AlertTriangle },
  claimed:            { label: "Claimed",         color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function DepositCard({ booking, operator, onUpdate }: DepositCardProps) {
  const [requesting, setRequesting] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [captureDialog, setCaptureDialog] = useState(false);
  const [captureAmount, setCaptureAmount] = useState("");
  const [captureReason, setCaptureReason] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [depositLink, setDepositLink] = useState<string | null>(null);

  const status = booking.deposit_status ?? "none";
  const statusConfig = STATUS_CONFIG[status] ?? STATUS_CONFIG.none;
  const StatusIcon = statusConfig.icon;
  const depositAmount = booking.deposit_amount ?? 0;
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://pcrbooking.com";

  const lateFeePerDay = Number(operator.late_fee_per_day ?? 0);
  const lateFeeEnabled = operator.late_fee_enabled ?? false;
  const { daysLate, lateFee, cappedLateFee } = computeLateFee(booking, lateFeePerDay);
  const isOverdue = daysLate > 0 && ["confirmed", "active"].includes(booking.status);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  }

  // Guard: no Stripe connected
  if (!operator.stripe_account_id) {
    return (
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2EBD6B]" />
            Security Deposit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center text-center py-6 gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              Connect your Stripe account in{" "}
              <a href="/dashboard/settings?tab=payment" className="text-[#2EBD6B] underline">
                Settings › Payment
              </a>{" "}
              to enable deposit holds.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Guard: no deposit amount configured
  if (depositAmount <= 0 && status === "none") {
    return (
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#2EBD6B]" />
            Security Deposit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            Set a deposit amount in{" "}
            <a href="/dashboard/settings?tab=payment" className="text-[#2EBD6B] underline">
              Settings › Payment
            </a>{" "}
            to enable deposit collection.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── Request deposit hold ──────────────────────────────────────────────────

  async function handleRequestHold() {
    setRequesting(true);
    try {
      const res = await fetch("/api/payments/deposit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Failed to request deposit hold");
        return;
      }
      setDepositLink(data.deposit_link);
      showToast(data.renter_emailed
        ? "Deposit request sent! Renter will receive an email with the authorization link."
        : "Deposit link generated. No renter email on file — copy the link to share manually."
      );
      onUpdate?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Request failed");
    } finally {
      setRequesting(false);
    }
  }

  // ── Capture ───────────────────────────────────────────────────────────────

  async function handleCapture() {
    setCapturing(true);
    try {
      const amountNum = parseFloat(captureAmount);
      const res = await fetch("/api/payments/deposit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          capture_amount: isNaN(amountNum) ? null : amountNum,
          reason: captureReason.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Capture failed");
        return;
      }
      setCaptureDialog(false);
      setCaptureAmount("");
      setCaptureReason("");
      showToast(
        data.status === "partially_captured"
          ? `Captured ${formatCurrency(data.captured_amount)} — remainder released`
          : `Full deposit of ${formatCurrency(data.captured_amount)} captured`
      );
      onUpdate?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Capture failed");
    } finally {
      setCapturing(false);
    }
  }

  // ── Release ───────────────────────────────────────────────────────────────

  async function handleRelease() {
    if (!confirm("Release the deposit hold? This will cancel the authorization and no funds will be captured.")) return;
    setReleasing(true);
    try {
      const res = await fetch("/api/payments/deposit", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error ?? "Release failed");
        return;
      }
      showToast("Deposit hold released. Renter notified by email.");
      onUpdate?.();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Release failed");
    } finally {
      setReleasing(false);
    }
  }

  // ── Open capture dialog prefilled with late fee ───────────────────────────

  function handleAddLateFee() {
    setCaptureAmount(cappedLateFee.toFixed(2));
    setCaptureReason(`Late return fee — ${daysLate} day${daysLate !== 1 ? "s" : ""} × ${formatCurrency(lateFeePerDay)}/day`);
    setCaptureDialog(true);
  }

  // ── Copy deposit link ─────────────────────────────────────────────────────

  function copyLink() {
    const link = depositLink || (booking.deposit_token ? `${baseUrl}/deposit/${booking.deposit_token}` : null);
    if (!link) return;
    navigator.clipboard.writeText(link);
    showToast("Deposit link copied to clipboard");
  }

  const currentDepositLink = depositLink || (booking.deposit_token ? `${baseUrl}/deposit/${booking.deposit_token}` : null);

  return (
    <>
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm bg-slate-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-[#2EBD6B]" />
          {toast}
        </div>
      )}

      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#2EBD6B]" />
              Security Deposit
            </span>
            <Badge
              variant="outline"
              className={`${statusConfig.color} font-medium text-xs`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusConfig.label}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deposit amount row */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
              <span>Hold Amount</span>
            </div>
            <span className="font-semibold text-slate-900">{formatCurrency(depositAmount)}</span>
          </div>

          {/* Timestamps */}
          {booking.deposit_authorized_at && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Authorized</span>
              <span>{formatDateTime(booking.deposit_authorized_at)}</span>
            </div>
          )}
          {booking.deposit_captured_at && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Captured</span>
              <span>{formatDateTime(booking.deposit_captured_at)}</span>
            </div>
          )}
          {booking.deposit_released_at && (
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Released</span>
              <span>{formatDateTime(booking.deposit_released_at)}</span>
            </div>
          )}

          {/* Captured amount */}
          {booking.deposit_captured_amount != null && booking.deposit_captured_amount > 0 && (
            <div className="flex items-center justify-between text-sm text-slate-700">
              <span>Captured Amount</span>
              <span className="font-semibold text-slate-900">
                {formatCurrency(booking.deposit_captured_amount)}
                {status === "partially_captured" && (
                  <span className="text-xs text-slate-400 ml-1">
                    (of {formatCurrency(depositAmount)})
                  </span>
                )}
              </span>
            </div>
          )}
          {booking.deposit_capture_reason && (
            <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              <span className="font-medium">Reason: </span>{booking.deposit_capture_reason}
            </div>
          )}

          {/* 7-day warning for held deposits */}
          {status === "held" && booking.deposit_authorized_at && (() => {
            const authDate = new Date(booking.deposit_authorized_at);
            const expiryDate = new Date(authDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
              return (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                  Hold expires in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""} ({formatDate(expiryDate.toISOString())}).
                  Capture or release before expiry.
                </div>
              );
            }
            if (daysUntilExpiry <= 0) {
              return (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">
                  <AlertTriangle className="inline h-3.5 w-3.5 mr-1" />
                  Authorization hold may have expired. Request a new hold if needed.
                </div>
              );
            }
            return null;
          })()}

          {/* Pending auth + deposit link */}
          {status === "pending_auth" && currentDepositLink && (
            <div className="space-y-2">
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-700">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Waiting for renter to authorize. Link expires after 7 days of authorization.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-slate-100 rounded px-2 py-1.5 truncate font-mono text-slate-600">
                  {currentDepositLink.replace("https://", "")}
                </code>
                <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
                  Copy
                </Button>
                <a href={currentDepositLink} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="shrink-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Late fee banner */}
          {lateFeeEnabled && isOverdue && lateFeePerDay > 0 && status === "held" && (
            <>
              <Separator />
              <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 space-y-2">
                <div className="flex items-center gap-2 text-orange-700 text-sm font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Vehicle Overdue — {daysLate} day{daysLate !== 1 ? "s" : ""} late
                </div>
                <div className="text-xs text-orange-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Expected return</span>
                    <span className="font-medium">{formatDate(booking.end_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late fee ({formatCurrency(lateFeePerDay)}/day × {daysLate} days)</span>
                    <span className="font-medium">{formatCurrency(lateFee)}</span>
                  </div>
                  {lateFee > depositAmount && (
                    <div className="flex justify-between text-red-600">
                      <span>Overage beyond deposit (not capturable)</span>
                      <span className="font-medium">{formatCurrency(lateFee - depositAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-orange-700 border-t border-orange-200 pt-1 mt-1">
                    <span>Capturable from deposit</span>
                    <span>{formatCurrency(cappedLateFee)}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={handleAddLateFee}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                >
                  Add Late Fee to Capture
                </Button>
              </div>
            </>
          )}

          <Separator />

          {/* Action buttons */}
          <div className="space-y-2">
            {/* Request hold (initial or re-request) */}
            {(status === "none" || status === "expired") && (
              <Button
                className="w-full bg-[#2EBD6B] hover:bg-[#26a85d] text-white"
                onClick={handleRequestHold}
                disabled={requesting}
              >
                {requesting ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Sending…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Request Deposit Hold</>
                )}
              </Button>
            )}

            {/* Re-send for pending_auth */}
            {status === "pending_auth" && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleRequestHold}
                disabled={requesting}
              >
                {requesting ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" />Resending…</>
                ) : (
                  <><Send className="h-4 w-4 mr-2" />Resend Deposit Link</>
                )}
              </Button>
            )}

            {/* Capture + Release for held */}
            {status === "held" && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white"
                  onClick={() => {
                    setCaptureAmount(depositAmount.toFixed(2));
                    setCaptureReason("");
                    setCaptureDialog(true);
                  }}
                >
                  Capture Full
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaptureAmount("");
                    setCaptureReason("");
                    setCaptureDialog(true);
                  }}
                >
                  Partial Capture
                </Button>
                <Button
                  variant="outline"
                  className="col-span-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                  onClick={handleRelease}
                  disabled={releasing}
                >
                  {releasing ? "Releasing…" : "Release Hold"}
                </Button>
              </div>
            )}

            {/* Re-request if expired */}
            {status === "expired" && (
              <p className="text-xs text-center text-slate-400">
                The previous hold expired. Request a new one above.
              </p>
            )}
          </div>

          {/* Guidance note */}
          {status === "none" && depositAmount > 0 && (
            <p className="text-xs text-slate-400 text-center">
              Place the hold within 7 days of pickup. Renter will receive an email with the authorization link.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Capture Dialog */}
      <Dialog open={captureDialog} onOpenChange={setCaptureDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Capture Deposit</DialogTitle>
            <DialogDescription>
              Specify how much to capture from the{" "}
              {formatCurrency(depositAmount)} hold. Any remainder will be
              automatically released to the renter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="capture-amount">Capture Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="capture-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={depositAmount}
                  value={captureAmount}
                  onChange={(e) => setCaptureAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-slate-400">
                Max: {formatCurrency(depositAmount)} (full hold amount)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="capture-reason">Reason (shown to renter)</Label>
              <Input
                id="capture-reason"
                value={captureReason}
                onChange={(e) => setCaptureReason(e.target.value)}
                placeholder="e.g., Minor interior damage, Late return fee"
              />
            </div>
            {captureAmount && !isNaN(parseFloat(captureAmount)) && parseFloat(captureAmount) < depositAmount && (
              <div className="rounded-lg bg-blue-50 p-3 text-xs text-blue-700">
                <strong>Partial capture:</strong> ${parseFloat(captureAmount).toFixed(2)} will be charged.
                The remaining{" "}
                {formatCurrency(depositAmount - parseFloat(captureAmount))}{" "}
                will be released back to the renter&apos;s card.
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCaptureDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCapture}
              disabled={
                capturing ||
                !captureAmount ||
                isNaN(parseFloat(captureAmount)) ||
                parseFloat(captureAmount) <= 0
              }
              className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white"
            >
              {capturing ? (
                <><RefreshCw className="h-4 w-4 mr-1 animate-spin" />Capturing…</>
              ) : (
                <>Capture {captureAmount ? formatCurrency(parseFloat(captureAmount) || 0) : ""}</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
