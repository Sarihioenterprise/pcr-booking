"use client";

import { useState, useEffect } from "react";
import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CreditCard, ChevronLeft, ChevronRight, Shield, Mail, AlertCircle } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;

interface Step6Props {
  onNext: () => void;
  onBack: () => void;
}

export function Step6Payment({ onNext, onBack }: Step6Props) {
  const { state, dispatch } = useWizard();
  const [paymentType, setPaymentType] = useState<"pay_now" | "deposit" | "skip">(
    state.payment_type
  );
  const [clientSecret, setClientSecret] = useState<string | null>(state.payment_client_secret);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState("");
  const [depositSent, setDepositSent] = useState(false);
  const [stripeSetupDone, setStripeSetupDone] = useState(false);

  // When user picks "pay_now" and no clientSecret yet, create a payment intent
  useEffect(() => {
    if (paymentType !== "pay_now") return;
    if (clientSecret) return;
    if (!state.booking_id) return;
    if (!stripePromise) return; // Stripe not configured

    setLoadingIntent(true);
    setError("");
    fetch("/api/payments/create-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        booking_id: state.booking_id,
        amount: state.grand_total,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setClientSecret(data.client_secret);
        dispatch({
          type: "SET_PAYMENT",
          payload: {
            payment_type: "pay_now",
            payment_intent_id: data.payment_intent_id,
            payment_status: "pending",
            payment_client_secret: data.client_secret,
          },
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingIntent(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentType, state.booking_id]);

  async function handleDeposit() {
    if (!state.booking_id) return;
    setLoadingIntent(true);
    setError("");
    try {
      const res = await fetch("/api/payments/deposit/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: state.booking_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to initiate deposit");

      dispatch({
        type: "SET_PAYMENT",
        payload: {
          payment_type: "deposit",
          payment_intent_id: null,
          payment_status: "pending_auth",
          payment_client_secret: null,
        },
      });
      setDepositSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deposit request failed");
    } finally {
      setLoadingIntent(false);
    }
  }

  function handleSkip() {
    dispatch({
      type: "SET_PAYMENT",
      payload: {
        payment_type: "skip",
        payment_intent_id: null,
        payment_status: null,
        payment_client_secret: null,
      },
    });
    onNext();
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <CreditCard className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Payment
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Amount */}
        <div className="rounded-xl bg-[#F8F9FC] border border-gray-100 px-4 py-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Total Due</span>
          <span className="text-2xl font-bold text-gray-900">${state.grand_total.toFixed(2)}</span>
        </div>

        {/* Payment type selector */}
        <div className="grid gap-3 sm:grid-cols-3">
          <PayTypeButton
            active={paymentType === "pay_now"}
            onClick={() => setPaymentType("pay_now")}
            icon={<CreditCard className="h-5 w-5" />}
            label="Pay Now"
            sub="Charge full amount"
          />
          <PayTypeButton
            active={paymentType === "deposit"}
            onClick={() => setPaymentType("deposit")}
            icon={<Shield className="h-5 w-5" />}
            label="Deposit Hold"
            sub="Email renter to authorize"
          />
          <PayTypeButton
            active={paymentType === "skip"}
            onClick={() => setPaymentType("skip")}
            icon={<Mail className="h-5 w-5" />}
            label="Skip Payment"
            sub="Collect later"
          />
        </div>

        <Separator />

        {/* Pay Now — Stripe Elements */}
        {paymentType === "pay_now" && (
          <>
            {!stripePromise && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-700">Stripe not configured</p>
                  <p className="text-xs text-amber-600 mt-1">
                    Add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment to enable card
                    payments. You can skip payment now and collect later.
                  </p>
                </div>
              </div>
            )}

            {stripePromise && loadingIntent && (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
                <span className="ml-3 text-sm text-gray-500">Preparing payment…</span>
              </div>
            )}

            {stripePromise && !loadingIntent && clientSecret && (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <StripePayForm
                  onSuccess={() => {
                    dispatch({
                      type: "SET_PAYMENT",
                      payload: {
                        payment_type: "pay_now",
                        payment_intent_id: state.payment_intent_id,
                        payment_status: "succeeded",
                        payment_client_secret: clientSecret,
                      },
                    });
                    onNext();
                  }}
                  onError={(msg) => setError(msg)}
                />
              </Elements>
            )}
          </>
        )}

        {/* Deposit */}
        {paymentType === "deposit" && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-700">Security Deposit Hold</p>
              <p className="text-xs text-blue-600 mt-1 leading-relaxed">
                An authorization hold email will be sent to the customer. Their card won&apos;t be
                charged unless there is damage, a late return, or other issues.
              </p>
            </div>

            {depositSent ? (
              <div className="flex items-center gap-2 text-sm text-[#2EBD6B] bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <Mail className="h-4 w-4" />
                Deposit link sent to {state.email || "renter"}. Continue to next step.
              </div>
            ) : (
              <Button
                onClick={handleDeposit}
                disabled={loadingIntent}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
              >
                {loadingIntent ? "Sending…" : "Send Deposit Request Email"}
              </Button>
            )}

            {depositSent && (
              <Button onClick={onNext} className="w-full bg-[#2EBD6B] text-white hover:bg-[#27a85e]">
                Continue — Pickup Photos <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Skip */}
        {paymentType === "skip" && (
          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700">No payment collected now</p>
              <p className="text-xs text-gray-500 mt-1">
                You can collect payment later from the booking detail page.
              </p>
            </div>
            <Button onClick={handleSkip} className="w-full bg-[#2EBD6B] text-white hover:bg-[#27a85e]">
              Skip &amp; Continue <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          variant="outline"
          onClick={onBack}
          className="w-full border-gray-200 text-gray-500"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Payment type button ────────────────────────────────────────────────────

function PayTypeButton({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl border-2 p-4 text-left transition-all ${
        active
          ? "border-[#2EBD6B] bg-[#2EBD6B]/5"
          : "border-gray-100 bg-[#F8F9FC] hover:border-gray-200"
      }`}
    >
      <div className={`mb-2 ${active ? "text-[#2EBD6B]" : "text-gray-400"}`}>{icon}</div>
      <p className={`text-xs font-semibold ${active ? "text-[#2EBD6B]" : "text-gray-700"}`}>
        {label}
      </p>
      <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>
    </button>
  );
}

// ── Stripe PaymentElement inner form ──────────────────────────────────────

function StripePayForm({
  onSuccess,
  onError,
}: {
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setPaying(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (error) {
      onError(error.message || "Payment failed");
      setPaying(false);
    } else {
      onSuccess();
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      <Button
        onClick={handlePay}
        disabled={paying || !stripe}
        className="w-full bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
      >
        {paying ? (
          <span className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Processing…
          </span>
        ) : (
          `Pay $${""} Now`
        )}
      </Button>
    </div>
  );
}
