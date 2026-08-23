"use client";

/**
 * /pay/[token]
 *
 * Public customer-facing payment page.
 * Operator generates a link, customer clicks it, enters card, pays.
 *
 * Flow:
 * 1. GET /api/payments/request-link/[token] → fetch booking + payment request info
 * 2. GET /api/payments/request-link/[token]/client-secret → get Stripe client_secret
 * 3. Show Stripe Elements (PaymentElement)
 * 4. On payment confirm: POST /api/payments/request-link/[token]/pay → mark paid
 * 5. Show success confirmation
 */

import { useEffect, useState, Suspense, use } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Car,
  Calendar,
  DollarSign,
  Clock,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

interface PaymentRequestInfo {
  id: string;
  token: string;
  label: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "paid" | "cancelled" | "expired";
  expires_at: string;
  paid_at?: string;
}

interface BookingInfo {
  id: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  total_price: number;
  vehicle: { make: string; model: string; year: number; photo_url: string | null } | null;
}

interface OperatorInfo {
  business_name: string;
  logo_url: string | null;
  stripe_account_id: string | null;
}

// ── Stripe payment form ──────────────────────────────────────────────────────

function PaymentForm({
  token,
  amountCents,
  onSuccess,
}: {
  token: string;
  amountCents: number;
  onSuccess: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    // Submit elements form
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "An error occurred");
      setProcessing(false);
      return;
    }

    // Confirm payment
    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/pay/${token}?confirmed=1`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed. Please check your card details.");
      setProcessing(false);
      return;
    }

    // Notify server of completed payment
    try {
      const res = await fetch(`/api/payments/request-link/${token}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payment_intent_id: paymentIntent?.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Pay confirmation error:", data);
        // Show success anyway — Stripe confirmed, server will reconcile
      }
    } catch (err) {
      console.error("Pay API call failed:", err);
    }

    onSuccess();
  }

  const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
          fields: {
            billingDetails: "auto",
          },
        }}
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <Button
        type="submit"
        className="w-full h-12 text-base font-semibold"
        disabled={processing || !stripe || !elements}
        style={{ backgroundColor: "#2EBD6B" }}
      >
        {processing ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </span>
        ) : (
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Pay {amountFormatted}
          </span>
        )}
      </Button>

      <p className="text-xs text-center text-slate-400 flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Secured by Stripe — Your card information is never stored on our servers
      </p>
    </form>
  );
}

// ── Main page content ────────────────────────────────────────────────────────

function PayPageContent({ token }: { token: string }) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequestInfo | null>(null);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [operator, setOperator] = useState<OperatorInfo | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Handle 3DS redirect-back
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("confirmed") === "1") {
        // Server confirmation after 3DS redirect — just show success
        setSuccess(true);
      }
    }
  }, []);

  useEffect(() => {
    async function load() {
      try {
        // 1. Fetch payment request info
        const infoRes = await fetch(`/api/payments/request-link/${token}`);
        if (!infoRes.ok) {
          const err = await infoRes.json().catch(() => ({ error: "Not found" }));
          setError((err as { error?: string }).error ?? "Payment link not found.");
          setLoading(false);
          return;
        }

        const data = await infoRes.json();
        setPaymentRequest(data.payment_request);
        setBooking(data.booking ?? null);
        setOperator(data.operator ?? null);

        // Handle terminal states before loading Stripe
        if (data.payment_request.status !== "pending") {
          setLoading(false);
          return;
        }

        // 2. Get client secret + stripe account
        const secretRes = await fetch(`/api/payments/request-link/${token}/client-secret`);
        if (!secretRes.ok) {
          const err = await secretRes.json().catch(() => ({ error: "Setup error" }));
          setError((err as { error?: string }).error ?? "Failed to initialize payment.");
          setLoading(false);
          return;
        }

        const secretData = await secretRes.json();
        setClientSecret(secretData.client_secret);

        // 3. Initialize Stripe with operator's connected account
        const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!;
        const stripeOptions = secretData.stripe_account_id
          ? { stripeAccount: secretData.stripe_account_id }
          : undefined;
        setStripePromise(loadStripe(stripeKey, stripeOptions));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load payment page.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  function formatDate(d: string) {
    return new Date(d + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC] p-4">
        <Card className="border-0 bg-white shadow-sm max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Link Not Found</h2>
              <p className="text-slate-500 text-sm">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Non-pending states ───────────────────────────────────────────────────

  if (paymentRequest?.status === "paid" || success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC] p-4">
        <Card className="border-0 bg-white shadow-sm max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Payment Received!</h2>
              <p className="text-slate-500 text-sm">
                {success && paymentRequest?.status !== "paid"
                  ? `Your payment of $${((paymentRequest?.amount_cents ?? 0) / 100).toFixed(2)} has been processed. Thank you!`
                  : "This payment has already been received. Thank you!"}
              </p>
            </div>
            {operator?.business_name && (
              <p className="text-xs text-slate-400">
                From {operator.business_name}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentRequest?.status === "expired") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC] p-4">
        <Card className="border-0 bg-white shadow-sm max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-7 w-7 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Link Expired</h2>
              <p className="text-slate-500 text-sm">
                This payment link has expired. Please contact{" "}
                {operator?.business_name ?? "the rental company"} for a new link.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (paymentRequest?.status === "cancelled") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC] p-4">
        <Card className="border-0 bg-white shadow-sm max-w-md w-full">
          <CardContent className="flex flex-col items-center py-12 text-center gap-4">
            <div className="h-14 w-14 rounded-full bg-slate-100 flex items-center justify-center">
              <AlertCircle className="h-7 w-7 text-slate-500" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-1">Request Cancelled</h2>
              <p className="text-slate-500 text-sm">
                This payment request has been cancelled. Please contact{" "}
                {operator?.business_name ?? "the rental company"} if you have questions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!paymentRequest || !clientSecret || !stripePromise) {
    return null;
  }

  const vehicleLabel = booking?.vehicle
    ? `${booking.vehicle.year} ${booking.vehicle.make} ${booking.vehicle.model}`
    : "Rental Vehicle";

  const amountFormatted = `$${(paymentRequest.amount_cents / 100).toFixed(2)}`;

  // ── Main payment page ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-8 px-4">
      {/* Header */}
      <div className="max-w-xl mx-auto mb-8 text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 shadow-sm mb-4">
          {operator?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={operator.logo_url} alt={operator.business_name} className="h-6 w-6 rounded-full object-contain" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-[#2EBD6B] flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
            </div>
          )}
          <span className="text-sm font-semibold text-slate-700">
            {operator?.business_name ?? "PCR Booking"} · Secure Payment
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">{paymentRequest.label}</h1>
        {operator?.business_name && (
          <p className="text-slate-500 text-sm">
            Payment requested by {operator.business_name}
          </p>
        )}
      </div>

      <div className="max-w-xl mx-auto grid gap-6">
        {/* Booking summary */}
        {booking && (
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                {booking.vehicle?.photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={booking.vehicle.photo_url}
                    alt={vehicleLabel}
                    className="h-12 w-12 rounded-lg object-cover border border-gray-100"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Car className="h-5 w-5 text-slate-400" />
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900">{vehicleLabel}</p>
                  {operator?.business_name && (
                    <p className="text-slate-400 text-xs">{operator.business_name}</p>
                  )}
                </div>
              </div>

              {(booking.start_date || booking.end_date) && (
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {booking.start_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Pickup</p>
                        <p className="font-medium text-slate-700">{formatDate(booking.start_date)}</p>
                      </div>
                    </div>
                  )}
                  {booking.end_date && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs text-slate-400">Return</p>
                        <p className="font-medium text-slate-700">{formatDate(booking.end_date)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {booking.renter_name && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-slate-400">Renter:</span>
                  <span className="text-sm font-medium text-slate-700">{booking.renter_name}</span>
                </div>
              )}

              <div className="border-t pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-[#2EBD6B]" />
                  <span className="font-semibold text-slate-700">Amount Due</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-900">{amountFormatted}</span>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                    {paymentRequest.currency.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment form */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lock className="h-4 w-4 text-[#2EBD6B]" />
              Secure Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "stripe",
                  variables: {
                    colorPrimary: "#2EBD6B",
                    borderRadius: "6px",
                  },
                },
              }}
            >
              <PaymentForm
                token={token}
                amountCents={paymentRequest.amount_cents}
                onSuccess={() => setSuccess(true)}
              />
            </Elements>
          </CardContent>
        </Card>

        {/* Expiry notice */}
        <p className="text-xs text-center text-slate-400">
          This payment link expires{" "}
          {new Date(paymentRequest.expires_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>
    </div>
  );
}

// ── Default export ────────────────────────────────────────────────────────────

export default function PayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
        </div>
      }
    >
      <PayPageContent token={token} />
    </Suspense>
  );
}
