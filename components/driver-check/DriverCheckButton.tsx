"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Shield, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

interface Props {
  renterId?: string;
  renterEmail?: string;
  renterName?: string;
  onCheckInitiated?: (checkId: string) => void;
}

type Status = "idle" | "open" | "charging" | "submitting" | "consent_sent" | "error";

export function DriverCheckButton({ renterId, renterEmail, renterName, onCheckInitiated }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: renterName ?? "",
    email: renterEmail ?? "",
    dob: "",
    licenseNumber: "",
    licenseState: "",
  });

  function updateForm(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function runCheck() {
    if (!form.name || !form.email || !form.dob || !form.licenseNumber || !form.licenseState) {
      setError("All fields are required.");
      return;
    }
    setError(null);
    setStatus("charging");

    try {
      const initRes = await fetch("/api/driver-checks/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renterId,
          renterEmail: form.email,
          renterName: form.name,
          renterDob: form.dob,
          renterLicenseNumber: form.licenseNumber,
          renterLicenseState: form.licenseState,
        }),
      });

      if (!initRes.ok) {
        const err = await initRes.json();
        throw new Error(err.error ?? "Failed to initiate check");
      }

      const { checkId, clientSecret } = await initRes.json();

      const stripe = await stripePromise;
      if (!stripe) throw new Error("Stripe failed to load");

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
      if (stripeError) throw new Error(stripeError.message);
      if (paymentIntent?.status !== "succeeded") throw new Error("Payment did not complete");

      setStatus("submitting");

      const submitRes = await fetch(`/api/driver-checks/${checkId}/submit`, {
        method: "POST",
      });
      if (!submitRes.ok) throw new Error("Failed to submit check to Checkr");

      setStatus("consent_sent");
      onCheckInitiated?.(checkId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("open");
    }
  }

  if (status === "consent_sent") {
    return (
      <div className="flex items-center gap-2 text-emerald-400 text-sm">
        <CheckCircle className="h-4 w-4" />
        Consent email sent to driver. Check in progress.
      </div>
    );
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setStatus("open")}
        className="gap-2 border-slate-600 hover:border-emerald-500 hover:text-emerald-400"
      >
        <Shield className="h-4 w-4" />
        Run Driver Check
        <Badge variant="secondary" className="text-xs font-normal">$50</Badge>
      </Button>

      <Dialog open={status !== "idle"} onOpenChange={(open) => { if (!open) setStatus("idle"); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-400" />
              PCR Booking Driver Verification
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <p className="text-sm text-slate-400">
              Run a Motor Vehicle Record check. Results delivered within minutes. $50 per check.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label className="text-slate-300 text-xs">Driver Full Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  placeholder="John Smith"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-slate-300 text-xs">Driver Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateForm("email", e.target.value)}
                  placeholder="driver@email.com"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">Date of Birth</Label>
                <Input
                  type="date"
                  value={form.dob}
                  onChange={(e) => updateForm("dob", e.target.value)}
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300 text-xs">License State</Label>
                <Select value={form.licenseState} onValueChange={(v) => updateForm("licenseState", v)}>
                  <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100">
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s} className="text-slate-100">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-slate-300 text-xs">License Number</Label>
                <Input
                  value={form.licenseNumber}
                  onChange={(e) => updateForm("licenseNumber", e.target.value)}
                  placeholder="D1234567"
                  className="bg-slate-800 border-slate-600 text-slate-100"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded p-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setStatus("idle")} disabled={status === "charging" || status === "submitting"}>
              Cancel
            </Button>
            <Button
              onClick={runCheck}
              disabled={status === "charging" || status === "submitting"}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {(status === "charging" || status === "submitting") ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
              ) : (
                "Charge $50 + Run Check"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
