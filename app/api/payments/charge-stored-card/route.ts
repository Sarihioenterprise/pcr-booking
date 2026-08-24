/**
 * POST /api/payments/charge-stored-card
 *
 * Charges a renter's saved card on file.
 * Used for deposits, late fees, damage charges, etc.
 *
 * Body: {
 *   renterId: string,
 *   paymentMethodId: string,
 *   amount: number (USD, e.g. 125.00),
 *   description: string,
 *   bookingId?: string (optional — links charge to a booking)
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { getStripe } from "@/lib/stripe";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

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
    const { renterId, paymentMethodId, amount, description, bookingId } = body;

    if (!renterId || !paymentMethodId || !amount || !description) {
      return NextResponse.json(
        { error: "renterId, paymentMethodId, amount, and description are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    if (!operator.stripe_account_id) {
      return NextResponse.json(
        { error: "Connect your Stripe account in Settings > Payment before charging cards." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Verify renter belongs to this operator
    const { data: renter, error: renterError } = await supabase
      .from("renters")
      .select("id, name, email, stripe_customer_id")
      .eq("id", renterId)
      .eq("operator_id", operator.id)
      .single();

    if (renterError || !renter) {
      return NextResponse.json({ error: "Renter not found" }, { status: 404 });
    }

    if (!renter.stripe_customer_id) {
      return NextResponse.json(
        { error: "This renter has no saved payment methods. Add a card first." },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    // Verify the payment method belongs to this customer
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== renter.stripe_customer_id) {
      return NextResponse.json(
        { error: "Payment method does not belong to this renter" },
        { status: 403 }
      );
    }

    // Create and immediately confirm a PaymentIntent
    // Funds route to the operator's connected Stripe account
    const amountCents = Math.round(amount * 100);
    const platformFee = Math.round(amountCents * PLATFORM_FEE_RATE);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      customer: renter.stripe_customer_id,
      payment_method: paymentMethodId,
      description,
      confirm: true,
      off_session: true,
      application_fee_amount: platformFee,
      transfer_data: {
        destination: operator.stripe_account_id,
      },
      metadata: {
        renter_id: renterId,
        operator_id: operator.id,
        booking_id: bookingId ?? "",
        charge_type: "stored_card",
      },
    });

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json(
        {
          error: `Payment did not succeed (status: ${paymentIntent.status}). The card may require authentication.`,
          status: paymentIntent.status,
        },
        { status: 402 }
      );
    }

    return NextResponse.json({
      ok: true,
      payment_intent_id: paymentIntent.id,
      amount,
      status: paymentIntent.status,
    });
  } catch (err: unknown) {
    // Stripe card errors
    if (
      err &&
      typeof err === "object" &&
      "type" in err &&
      (err as { type: string }).type === "StripeCardError"
    ) {
      return NextResponse.json(
        { error: (err as unknown as { message: string }).message },
        { status: 402 }
      );
    }

    console.error("POST /api/payments/charge-stored-card error:", err);
    return NextResponse.json({ error: "Failed to charge card" }, { status: 500 });
  }
}
