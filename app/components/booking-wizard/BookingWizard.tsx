"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

import { WizardProvider, useWizard } from "./WizardContext";
import { ProgressBar } from "./ProgressBar";
import { Step1Dates } from "./steps/Step1Dates";
import { Step2Vehicles } from "./steps/Step2Vehicles";
import { Step3Addons } from "./steps/Step3Addons";
import { Step4CustomerInfo } from "./steps/Step4CustomerInfo";
import { Step5Signature } from "./steps/Step5Signature";
import { Step6Payment } from "./steps/Step6Payment";
import { Step7PickupPhotos } from "./steps/Step7PickupPhotos";
import { Step8Summary } from "./steps/Step8Summary";
import { Step9Confirmation } from "./steps/Step9Confirmation";

interface BookingWizardProps {
  operatorId: string;
}

const TOTAL_STEPS = 9;

function WizardInner({ operatorId }: BookingWizardProps) {
  const [step, setStep] = useState(1);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmError, setConfirmError] = useState("");
  const { state, dispatch } = useWizard();

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /**
   * After step 4 completes, create the booking so steps 5-7 can use booking_id.
   * Called when moving FROM step 4 TO step 5.
   */
  async function nextFromStep4() {
    // Create booking now (before signature)
    try {
      const addonIds = state.addons.map((a) => a.id);
      const renterFullName = `${state.first_name} ${state.last_name}`.trim();

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicle_id: state.vehicle?.id ?? null,
          renter_name: renterFullName,
          renter_phone: state.phone || null,
          renter_email: state.email || null,
          drivers_license: state.license_number || null,
          start_date: state.start_date,
          end_date: state.end_date,
          status: "confirmed",
          selected_addon_ids: addonIds,
          pickup_location: state.location_name || null,
          pickup_time: state.start_time || null,
          return_time: state.return_time || null,
          renter_dob: state.dob || null,
          renter_license_state: state.license_state || null,
          renter_license_expiry: state.license_expiry || null,
          renter_license_photo_path: state.license_photo_path || null,
          renter_id: state.renter_id ?? undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create booking");

      dispatch({
        type: "SET_BOOKING",
        payload: {
          booking_id: data.booking.id,
          booking_number: data.booking.id.slice(0, 8).toUpperCase(),
        },
      });
    } catch (err) {
      // If booking creation fails, still allow wizard to continue
      // (edge case: duplicate or validation error)
      console.warn("Booking pre-create failed:", err);
    }
    next();
  }

  /**
   * Step 8 confirm: finalize the booking (update with collected IDs),
   * then advance to step 9.
   */
  async function handleConfirm() {
    setConfirmError("");

    if (!state.booking_id) {
      // Booking wasn't created in step 4 transition — create it now
      setConfirmLoading(true);
      try {
        const addonIds = state.addons.map((a) => a.id);
        const renterFullName = `${state.first_name} ${state.last_name}`.trim();
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicle_id: state.vehicle?.id ?? null,
            renter_name: renterFullName,
            renter_phone: state.phone || null,
            renter_email: state.email || null,
            drivers_license: state.license_number || null,
            start_date: state.start_date,
            end_date: state.end_date,
            status: "confirmed",
            selected_addon_ids: addonIds,
            pickup_location: state.location_name || null,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to create booking");
        dispatch({
          type: "SET_BOOKING",
          payload: {
            booking_id: data.booking.id,
            booking_number: data.booking.id.slice(0, 8).toUpperCase(),
          },
        });
        next();
      } catch (err) {
        setConfirmError(err instanceof Error ? err.message : "Failed to create booking");
      } finally {
        setConfirmLoading(false);
      }
      return;
    }

    // Booking exists — just finalize (update with wizard-collected IDs)
    setConfirmLoading(true);
    try {
      const patchBody: Record<string, unknown> = {};
      if (state.agreement_id) patchBody.agreement_id = state.agreement_id;
      if (state.pickup_inspection_id) patchBody.pickup_inspection_id = state.pickup_inspection_id;
      if (state.payment_intent_id) patchBody.stripe_payment_intent_id = state.payment_intent_id;

      if (Object.keys(patchBody).length > 0) {
        await fetch(`/api/bookings/${state.booking_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        }).catch(() => {}); // non-fatal
      }

      next(); // → Step 9 confirmation
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-xl border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">New Booking</h1>
            <p className="text-xs text-gray-500 mt-0.5">Guided 9-step wizard</p>
          </div>
        </div>

        {/* Progress */}
        {step < TOTAL_STEPS && (
          <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
        )}

        {/* Steps */}
        {step === 1 && <Step1Dates onNext={next} />}
        {step === 2 && <Step2Vehicles onNext={next} onBack={back} />}
        {step === 3 && (
          <Step3Addons onNext={next} onBack={back} operatorId={operatorId} />
        )}
        {step === 4 && (
          <Step4CustomerInfo
            onNext={nextFromStep4}
            onBack={back}
            operatorId={operatorId}
          />
        )}
        {step === 5 && <Step5Signature onNext={next} onBack={back} />}
        {step === 6 && <Step6Payment onNext={next} onBack={back} />}
        {step === 7 && (
          <Step7PickupPhotos onNext={next} onBack={back} operatorId={operatorId} />
        )}
        {step === 8 && (
          <Step8Summary
            onConfirm={handleConfirm}
            onBack={back}
            loading={confirmLoading}
            error={confirmError}
          />
        )}
        {step === 9 && <Step9Confirmation />}

        {/* Side price summary (shown steps 2–8) */}
        {step >= 2 && step <= 8 && (
          <div className="mt-4 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {state.vehicle
                ? `${state.vehicle.year} ${state.vehicle.make} ${state.vehicle.model} · ${state.duration_days}d`
                : "No vehicle selected"}
            </span>
            <span className="text-sm font-bold text-[#2EBD6B]">
              ${state.grand_total.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export function BookingWizard({ operatorId }: BookingWizardProps) {
  return (
    <WizardProvider>
      <WizardInner operatorId={operatorId} />
    </WizardProvider>
  );
}
