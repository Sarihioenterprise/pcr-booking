"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CreditCard, CheckCircle2, Lock, AlertCircle } from "lucide-react";
import Link from "next/link";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface BookingData {
  id: string;
  total_price: number;
  renter_name: string;
  status: string;
  vehicles?: {
    make: string;
    model: string;
    year: number;
  };
}

// ── Checkout form (inside Elements provider) ──────────────────────────────────
function CheckoutForm({
  booking,
  onSuccess,
}: {
  booking: BookingData;
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

    // Validate elements before confirming
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message ?? "An error occurred");
      setProcessing(false);
      return;
    }

    const { error: payError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/portal/${booking.id}`,
      },
      redirect: "if_required",
    });

    if (payError) {
      setError(payError.message ?? "Payment failed. Please try again.");
      setProcessing(false);
    } else {
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          disabled={processing || !stripe || !elements}
          style={{ backgroundColor: "#2EBD6B" }}
        >
          {processing ? (
            "Processing…"
          ) : (
            <>
              <Lock className="h-4 w-4 mr-2" />
              Pay ${Number(booking.total_price).toLocaleString()}
            </>
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center flex items-center justify-center gap-1">
        <Lock className="h-3 w-3" />
        Payments are securely processed via Stripe
      </p>
    </form>
  );
}

// ── Inner page (needs useSearchParams → must be inside Suspense) ──────────────
function PayPageContent() {
  const params = useParams();
  const bookingId = params.bookingId as string;
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch booking data (portal API verifies token if set on booking)
      const portalUrl = token
        ? `/api/portal/${bookingId}?token=${encodeURIComponent(token)}`
        : `/api/portal/${bookingId}`;

      const res = await fetch(portalUrl);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data: BookingData = await res.json();
      setBooking(data);

      // Create a real Stripe PaymentIntent
      const intentRes = await fetch("/api/payments/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: bookingId,
          amount: data.total_price,
          ...(token ? { access_token: token } : {}),
        }),
      });

      if (intentRes.ok) {
        const { client_secret } = await intentRes.json();
        setClientSecret(client_secret);
      } else {
        const err = await intentRes.json().catch(() => ({}));
        setIntentError((err as { error?: string }).error ?? "Unable to initialize payment.");
      }

      setLoading(false);
    }
    load();
  }, [bookingId, token]);

  if (loading) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Loading payment details…
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-muted-foreground text-center py-12">
        Booking not found
      </div>
    );
  }

  if (paid) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Payment Successful</h2>
            <p className="text-muted-foreground text-center mb-6">
              Your payment of ${Number(booking.total_price).toLocaleString()} has been processed.
            </p>
            <Link href={`/portal/${bookingId}`}>
              <Button variant="outline">Back to Booking</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/portal/${bookingId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Make Payment</h1>
          <p className="text-muted-foreground">Secure payment for your rental</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Payment form */}
        <div className="md:col-span-2">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {intentError ? (
                <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-3 text-sm text-red-700">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {intentError}
                </div>
              ) : clientSecret ? (
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
                  <CheckoutForm booking={booking} onSuccess={() => setPaid(true)} />
                </Elements>
              ) : (
                <div className="text-muted-foreground text-sm text-center py-6">
                  Initializing secure payment form…
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Order summary */}
        <div>
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking.vehicles && (
                <div>
                  <p className="text-muted-foreground">Vehicle</p>
                  <p className="font-medium">
                    {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                  </p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Renter</p>
                <p className="font-medium">{booking.renter_name}</p>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold text-[#2EBD6B]">
                    ${Number(booking.total_price).toLocaleString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ── Default export: wraps content in Suspense (required for useSearchParams) ──
export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <div className="text-muted-foreground text-center py-12">
          Loading payment details…
        </div>
      }
    >
      <PayPageContent />
    </Suspense>
  );
}
