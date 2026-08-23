/**
 * POST /api/payments/request-link
 *
 * Operator-only. Creates a payment request for a booking.
 * Generates a unique token and Stripe PaymentIntent on the operator's connected account.
 *
 * Body: { booking_id: string, amount_cents: number, label?: string, notes?: string }
 * Returns: { token: string, url: string, payment_request_id: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const body = await request.json();
    const { booking_id, amount_cents, label, notes } = body;

    // Validate required fields
    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }
    if (!amount_cents || typeof amount_cents !== "number") {
      return NextResponse.json({ error: "amount_cents is required and must be a number" }, { status: 400 });
    }
    if (amount_cents < 50) {
      return NextResponse.json({ error: "Minimum payment amount is $0.50 (50 cents)" }, { status: 400 });
    }

    // Require Stripe connection
    if (!operator.stripe_account_id) {
      return NextResponse.json(
        { error: "Connect your Stripe account in Settings before requesting payments." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify booking belongs to this operator
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id, renter_name, total_price")
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Create Stripe PaymentIntent on operator's connected account
    const stripe = getStripe();
    let intent;
    try {
      intent = await stripe.paymentIntents.create(
        {
          amount: amount_cents,
          currency: "usd",
          capture_method: "automatic",
          metadata: {
            booking_id: booking_id,
            operator_id: operator.id,
            source: "request_payment_link",
          },
        },
        { stripeAccount: operator.stripe_account_id }
      );
    } catch (stripeErr: unknown) {
      const msg = stripeErr instanceof Error ? stripeErr.message : "Stripe error";
      console.error("Stripe PaymentIntent creation failed:", stripeErr);
      return NextResponse.json({ error: `Stripe error: ${msg}` }, { status: 502 });
    }

    // Insert payment_request record
    const { data: pr, error: insertError } = await supabase
      .from("payment_requests")
      .insert({
        booking_id,
        operator_id: operator.id,
        amount_cents,
        label: label || "Rental Payment",
        notes: notes || null,
        stripe_payment_intent_id: intent.id,
        stripe_client_secret: intent.client_secret,
      })
      .select("id, token")
      .single();

    if (insertError || !pr) {
      console.error("payment_requests insert error:", insertError);
      // Cancel the Stripe intent we just created
      try {
        await stripe.paymentIntents.cancel(intent.id, { stripeAccount: operator.stripe_account_id });
      } catch { /* non-fatal */ }
      return NextResponse.json({ error: "Failed to create payment request" }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    const url = `${baseUrl}/pay/${pr.token}`;

    return NextResponse.json({
      token: pr.token,
      url,
      payment_request_id: pr.id,
    });
  } catch (err) {
    console.error("request-link error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
