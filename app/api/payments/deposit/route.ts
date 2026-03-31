import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, amount } = body;

    if (!booking_id || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: booking_id, amount" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than zero" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*, operators(stripe_account_id)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      capture_method: "manual",
      metadata: {
        booking_id: booking.id,
        operator_id: booking.operator_id,
        type: "security_deposit",
      },
      ...(booking.operators?.stripe_account_id
        ? {
            transfer_data: {
              destination: booking.operators.stripe_account_id,
            },
          }
        : {}),
    });

    await supabase
      .from("bookings")
      .update({
        deposit_payment_intent_id: paymentIntent.id,
        deposit_status: "held",
        deposit_amount: amount,
      })
      .eq("id", booking_id);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err) {
    console.error("Create deposit error:", err);
    return NextResponse.json(
      { error: "Failed to create deposit hold" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: "Missing required field: booking_id" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("deposit_payment_intent_id, deposit_status")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    if (!booking.deposit_payment_intent_id) {
      return NextResponse.json(
        { error: "No deposit hold found for this booking" },
        { status: 400 }
      );
    }

    if (booking.deposit_status !== "held") {
      return NextResponse.json(
        { error: "Deposit is not currently held" },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    await stripe.paymentIntents.cancel(booking.deposit_payment_intent_id);

    await supabase
      .from("bookings")
      .update({ deposit_status: "released" })
      .eq("id", booking_id);

    return NextResponse.json({ success: true, status: "released" });
  } catch (err) {
    console.error("Release deposit error:", err);
    return NextResponse.json(
      { error: "Failed to release deposit" },
      { status: 500 }
    );
  }
}
