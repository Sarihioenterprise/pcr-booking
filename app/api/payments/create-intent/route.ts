import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, amount, access_token } = body;

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
      .select("*, operators(stripe_account_id, business_name)")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    // Auth check: allow if either:
    // 1. A valid access_token is provided matching the booking's token (renter-facing flow)
    // 2. An authenticated operator session owns this booking
    const hasAccessToken = access_token && booking.access_token && access_token === booking.access_token;

    if (!hasAccessToken) {
      // Fall back to session-based auth (operator dashboard)
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: "Unauthorized: provide a valid access_token or an authenticated session" },
          { status: 401 }
        );
      }

      // Verify the authenticated user owns the operator associated with this booking
      const { data: operator } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .eq("id", booking.operator_id)
        .single();

      if (!operator) {
        return NextResponse.json(
          { error: "Unauthorized: booking does not belong to your account" },
          { status: 403 }
        );
      }
    }

    const stripe = getStripe();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: "usd",
      metadata: {
        booking_id: booking.id,
        operator_id: booking.operator_id,
        renter_name: booking.renter_name,
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
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", booking_id);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err) {
    console.error("Create payment intent error:", err);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
