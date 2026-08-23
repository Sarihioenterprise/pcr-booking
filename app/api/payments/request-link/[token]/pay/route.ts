/**
 * POST /api/payments/request-link/[token]/pay
 *
 * Public. Called from customer payment page after Stripe confirms payment.
 * Verifies the PaymentIntent succeeded and marks the payment_request as paid.
 *
 * Body: { payment_intent_id: string }
 * Returns: { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { payment_intent_id } = body;

    if (!payment_intent_id) {
      return NextResponse.json({ error: "payment_intent_id is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch payment request
    const { data: pr, error: prError } = await supabase
      .from("payment_requests")
      .select(`
        id,
        status,
        expires_at,
        stripe_payment_intent_id,
        operators (
          stripe_account_id
        )
      `)
      .eq("token", token)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    if (pr.status !== "pending") {
      // Idempotent: if already paid, return success
      if (pr.status === "paid") {
        return NextResponse.json({ success: true, already_paid: true });
      }
      return NextResponse.json(
        { error: `Payment request is ${pr.status} and cannot be completed` },
        { status: 400 }
      );
    }

    if (new Date(pr.expires_at) < new Date()) {
      return NextResponse.json({ error: "Payment link has expired" }, { status: 400 });
    }

    // Verify the payment_intent_id matches
    if (pr.stripe_payment_intent_id !== payment_intent_id) {
      return NextResponse.json({ error: "Payment intent mismatch" }, { status: 400 });
    }

    // Retrieve PaymentIntent from Stripe to verify success
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operatorStripeAccountId = (pr.operators as any)?.stripe_account_id;

    let stripeIntent;
    try {
      const stripe = getStripe();
      stripeIntent = await stripe.paymentIntents.retrieve(
        payment_intent_id,
        operatorStripeAccountId ? { stripeAccount: operatorStripeAccountId } : undefined
      );
    } catch (stripeErr) {
      console.error("Stripe retrieve error:", stripeErr);
      return NextResponse.json({ error: "Failed to verify payment with Stripe" }, { status: 502 });
    }

    if (stripeIntent.status !== "succeeded") {
      return NextResponse.json(
        { error: `Payment not confirmed. Stripe status: ${stripeIntent.status}` },
        { status: 400 }
      );
    }

    // Get payer IP
    const payer_ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    // Mark payment_request as paid
    const { error: updateError } = await supabase
      .from("payment_requests")
      .update({
        status: "paid",
        paid_at: new Date().toISOString(),
        payer_ip,
        // Clear the client_secret after use for security
        stripe_client_secret: null,
      })
      .eq("id", pr.id);

    if (updateError) {
      console.error("payment_requests update error:", updateError);
      return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("pay route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
