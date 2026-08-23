"use client";

import { useRef, useState, useEffect } from "react";
import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FileText, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";

// react-signature-canvas is client-only
const SignatureCanvas = dynamic(() => import("react-signature-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border border-gray-200">
      <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
    </div>
  ),
});

interface Step5Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step5Signature({ onNext, onBack }: Step5Props) {
  const { state, dispatch } = useWizard();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigRef = useRef<any>(null);

  const renterName = `${state.first_name} ${state.last_name}`.trim();
  const vehicleName = state.vehicle
    ? `${state.vehicle.year} ${state.vehicle.make} ${state.vehicle.model}`
    : "—";

  function clearSig() {
    sigRef.current?.clear();
  }

  async function handleNext() {
    setError("");

    if (!state.booking_id) {
      setError("Booking not created yet — please go back.");
      return;
    }

    const canvas = sigRef.current;
    if (!canvas || canvas.isEmpty()) {
      setError("Please draw your signature to continue.");
      return;
    }

    const signaturePng = canvas.toDataURL("image/png");
    setSaving(true);

    try {
      // 1. Generate agreement via send endpoint (auto-generates from default template)
      const sendRes = await fetch("/api/agreements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: state.booking_id }),
      });
      const sendData = await sendRes.json();
      if (!sendRes.ok) throw new Error(sendData.error || "Failed to generate agreement");

      const { agreement_id, sign_token } = sendData;

      // 2. Sign the agreement with the drawn signature
      const signRes = await fetch("/api/agreements/sign-by-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: sign_token,
          typed_name: renterName,
          signature_png_b64: signaturePng.split(",")[1], // strip data: prefix
        }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "Failed to sign agreement");

      dispatch({
        type: "SET_AGREEMENT",
        payload: {
          agreement_id,
          sign_token,
          signature_data_url: signaturePng,
        },
      });

      // Update booking with agreement_id
      await fetch(`/api/bookings/${state.booking_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agreement_id }),
      }).catch(() => {}); // non-fatal

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <FileText className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Rental Agreement &amp; Signature
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Rental summary */}
        <div className="rounded-xl border border-gray-100 bg-[#F8F9FC] p-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Booking Summary
          </p>
          <div className="grid grid-cols-2 gap-y-2 text-sm">
            <span className="text-gray-500">Renter</span>
            <span className="font-medium text-gray-900">{renterName || "—"}</span>
            <span className="text-gray-500">Vehicle</span>
            <span className="font-medium text-gray-900">{vehicleName}</span>
            <span className="text-gray-500">Pickup</span>
            <span className="font-medium text-gray-900">
              {state.start_date} {state.start_time}
            </span>
            <span className="text-gray-500">Return</span>
            <span className="font-medium text-gray-900">
              {state.end_date} {state.return_time}
            </span>
            <span className="text-gray-500">Duration</span>
            <span className="font-medium text-gray-900">
              {state.duration_days} day{state.duration_days !== 1 ? "s" : ""}
            </span>
          </div>
          <Separator />
          {state.addons.length > 0 && (
            <div className="space-y-1">
              {state.addons.map((a) => (
                <div key={a.id} className="flex justify-between text-sm">
                  <span className="text-gray-500">{a.name}</span>
                  <span className="text-gray-700">
                    +${(a.pricing_type === "per_day" ? Number(a.price) * state.duration_days : Number(a.price)).toFixed(2)}
                  </span>
                </div>
              ))}
              <Separator />
            </div>
          )}
          <div className="flex justify-between text-sm font-semibold text-gray-900">
            <span>Total</span>
            <span className="text-[#2EBD6B] text-base">${state.grand_total.toFixed(2)}</span>
          </div>
        </div>

        {/* Agreement notice */}
        <div className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 leading-relaxed">
          By signing below, you confirm that you have read and agree to the rental agreement terms,
          including vehicle return condition, damage responsibility, and fuel policy. Your electronic
          signature is legally binding.
        </div>

        {/* Signature pad */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700">
              Draw your signature below
            </Label>
            <button
              type="button"
              onClick={clearSig}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
            >
              <RotateCcw className="h-3 w-3" />
              Clear
            </button>
          </div>
          <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white overflow-hidden">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <SignatureCanvas
              {...{ ref: sigRef } as any}
              penColor="#1a1a1a"
              canvasProps={{
                className: "w-full",
                style: { height: 180, width: "100%" },
              }}
            />
          </div>
          <p className="text-[10px] text-gray-400 text-center">
            Sign with mouse, touchpad, or finger
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Signing…
              </span>
            ) : (
              <>
                Sign &amp; Continue <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Local label helper ─────────────────────────────────────────────────────
function Label({ className = "", ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={`block text-sm font-medium text-gray-700 ${className}`} {...props} />;
}
