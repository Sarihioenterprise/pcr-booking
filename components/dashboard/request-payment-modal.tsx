"use client";

/**
 * RequestPaymentModal
 *
 * Operator-facing modal to generate a payment link for a booking.
 * Click "Request Payment" → dialog opens → enter amount + label →
 * generate link → copy or email to customer.
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Link2,
  Copy,
  Check,
  Loader2,
  Mail,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface RequestPaymentModalProps {
  bookingId: string;
  operatorId: string;
  defaultAmountDollars?: number;   // pre-fill from booking.total_price
  renterEmail?: string | null;     // for "Email to Customer"
  renterName?: string | null;
}

export function RequestPaymentModal({
  bookingId,
  operatorId,
  defaultAmountDollars,
  renterEmail,
  renterName,
}: RequestPaymentModalProps) {
  const [open, setOpen] = useState(false);

  // Form state
  const [amount, setAmount] = useState(
    defaultAmountDollars ? defaultAmountDollars.toFixed(2) : ""
  );
  const [label, setLabel] = useState("Rental Payment");
  const [notes, setNotes] = useState("");

  // Generated link state
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [paymentRequestId, setPaymentRequestId] = useState<string | null>(null);

  // Loading / error states
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  function handleOpen() {
    // Reset state on open
    setGeneratedUrl(null);
    setPaymentRequestId(null);
    setGenerateError(null);
    setEmailSent(false);
    setEmailError(null);
    setAmount(defaultAmountDollars ? defaultAmountDollars.toFixed(2) : "");
    setOpen(true);
  }

  async function handleGenerate() {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setGenerateError("Please enter a valid amount greater than $0.00");
      return;
    }
    const amountCents = Math.round(parsedAmount * 100);
    if (amountCents < 50) {
      setGenerateError("Minimum amount is $0.50");
      return;
    }

    setGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/payments/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          amount_cents: amountCents,
          label: label.trim() || "Rental Payment",
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.error ?? "Failed to generate payment link");
        return;
      }

      setGeneratedUrl(data.url);
      setPaymentRequestId(data.payment_request_id);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate link");
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = generatedUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleSendEmail() {
    if (!paymentRequestId || !renterEmail) return;
    setEmailSending(true);
    setEmailError(null);

    try {
      const res = await fetch(
        `/api/payments/request-link/${paymentRequestId}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ to_email: renterEmail }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to send email");
        return;
      }

      setEmailSent(true);
    } catch (err) {
      setEmailError(err instanceof Error ? err.message : "Failed to send email");
    } finally {
      setEmailSending(false);
    }
  }

  // Format amount for display
  const amountCents = parseFloat(amount) ? Math.round(parseFloat(amount) * 100) : 0;
  const amountFormatted = amountCents > 0 ? `$${(amountCents / 100).toFixed(2)}` : "";

  return (
    <>
      <Button
        onClick={handleOpen}
        variant="outline"
        className="gap-2 border-[#2EBD6B] text-[#2EBD6B] hover:bg-[#2EBD6B]/5"
      >
        <Link2 className="h-4 w-4" />
        Request Payment
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-[#2EBD6B]" />
              Request Payment
            </DialogTitle>
            <DialogDescription>
              Generate a secure payment link to send to your customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {!generatedUrl ? (
              <>
                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="pay-amount">Amount *</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-medium">$</span>
                    <Input
                      id="pay-amount"
                      type="number"
                      step="0.01"
                      min="0.50"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-7"
                    />
                  </div>
                </div>

                {/* Label */}
                <div className="space-y-2">
                  <Label htmlFor="pay-label">Payment Label</Label>
                  <Input
                    id="pay-label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Rental Payment, Week 2 Payment"
                  />
                  <p className="text-xs text-slate-400">
                    Shown to customer on the payment page
                  </p>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="pay-notes">Notes (operator-visible only)</Label>
                  <Textarea
                    id="pay-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Security deposit for June rental"
                    rows={2}
                    className="resize-none"
                  />
                </div>

                {/* Error */}
                {generateError && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-sm text-red-700">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    {generateError}
                  </div>
                )}

                {/* Expiry note */}
                <p className="text-xs text-slate-400">
                  Payment links expire after 72 hours.
                </p>
              </>
            ) : (
              <>
                {/* Generated URL */}
                <div className="space-y-3">
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span className="text-sm text-emerald-700 font-medium">
                      Payment link generated! {amountFormatted && `(${amountFormatted})`}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <Label>Payment Link</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedUrl}
                        readOnly
                        className="text-xs font-mono bg-slate-50 text-slate-600"
                        onClick={(e) => (e.target as HTMLInputElement).select()}
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={handleCopy}
                        className="shrink-0"
                        title="Copy link"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-xs text-emerald-600 font-medium">✓ Copied to clipboard!</p>
                    )}
                  </div>

                  {/* Preview link */}
                  <a
                    href={generatedUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[#2EBD6B] hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    Preview customer payment page
                  </a>
                </div>

                {/* Email to customer */}
                {renterEmail && (
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-700">Email to Customer</p>
                        <p className="text-xs text-slate-400">{renterEmail}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleSendEmail}
                        disabled={emailSending || emailSent}
                        className="gap-1.5"
                      >
                        {emailSending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : emailSent ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Mail className="h-3.5 w-3.5" />
                        )}
                        {emailSent ? "Sent!" : "Send Email"}
                      </Button>
                    </div>
                    {emailError && (
                      <p className="text-xs text-red-500">{emailError}</p>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            {!generatedUrl ? (
              <>
                <Button
                  variant="ghost"
                  onClick={() => setOpen(false)}
                  disabled={generating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={generating || !amount || parseFloat(amount) <= 0}
                  className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Link2 className="h-4 w-4" />
                      Generate Link
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  setGeneratedUrl(null);
                  setPaymentRequestId(null);
                }}
                className="w-full sm:w-auto"
              >
                Done
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
