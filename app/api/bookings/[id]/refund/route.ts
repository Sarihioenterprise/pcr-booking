import Stripe from "stripe";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Fetch booking — verify it belongs to this operator
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, operator_id, total_price")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.operator_id !== operator.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (booking.status !== "cancelled") {
      return NextResponse.json(
        { error: "Refunds can only be issued for cancelled bookings" },
        { status: 400 }
      );
    }

    // Get paid payment_schedule entries that haven't been refunded
    const { data: scheduleRows, error: scheduleError } = await supabase
      .from("payment_schedule")
      .select("id, amount, stripe_payment_intent_id, status")
      .eq("booking_id", bookingId)
      .eq("status", "paid");

    if (scheduleError) {
      return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }

    const refundable = (scheduleRows || []).filter(
      (r) => r.stripe_payment_intent_id
    );

    if (refundable.length === 0) {
      return NextResponse.json(
        { error: "No refundable payments found" },
        { status: 400 }
      );
    }

    // Issue Stripe refund for each paid entry
    let totalRefunded = 0;
    const refundedIds: string[] = [];

    for (const row of refundable) {
      const refund = await stripe.refunds.create({
        payment_intent: row.stripe_payment_intent_id!,
      });

      if (refund.status === "succeeded" || refund.status === "pending") {
        totalRefunded += Number(row.amount);
        refundedIds.push(row.id);
      }
    }

    if (refundedIds.length > 0) {
      await supabase
        .from("payment_schedule")
        .update({ status: "refunded" })
        .in("id", refundedIds);
    }

    return NextResponse.json({
      refunded: totalRefunded,
      count: refundedIds.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Refund failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
