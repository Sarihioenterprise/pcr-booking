import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = createAdminClient();

    // Verify booking belongs to this operator
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const body = await request.json();
    const { amount, method, stripe_payment_intent_id, note } = body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const { data: payment, error } = await supabase
      .from("payment_schedule")
      .insert({
        booking_id: id,
        operator_id: operator.id,
        amount: Number(amount),
        due_date: now.split("T")[0],
        status: "paid",
        stripe_payment_intent_id: stripe_payment_intent_id ?? null,
        method: method ?? null,
        note: note ?? null,
        paid_at: now,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("[POST /api/bookings/:id/payments]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ payment });
  } catch (err) {
    console.error("[POST /api/bookings/:id/payments] unexpected:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
