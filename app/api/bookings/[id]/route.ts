import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

const ALLOWED_STATUSES = ["pending", "confirmed", "active", "completed", "cancelled"] as const;
type BookingStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(s: unknown): s is BookingStatus {
  return typeof s === "string" && (ALLOWED_STATUSES as readonly string[]).includes(s);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    // Build an allowlist of mutable fields to prevent mass-assignment
    const updates: Record<string, unknown> = {};

    if (isAllowedStatus(body.status)) {
      updates.status = body.status;
    }
    if (typeof body.notes === "string") {
      updates.notes = body.notes;
    }
    if (typeof body.total_price === "number") {
      updates.total_price = body.total_price;
    }
    if (body.start_date) updates.start_date = body.start_date;
    if (body.end_date) updates.end_date = body.end_date;
    // cancel_reason stored in notes field if cancel_reason column doesn't exist
    if (typeof body.cancel_reason === "string" && body.cancel_reason.trim()) {
      // store in notes with prefix — graceful if cancel_reason column absent
      updates.notes = `[Cancelled] ${body.cancel_reason.trim()}`;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("bookings")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select("id, status, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Booking not found or update failed" },
        { status: error ? 500 : 404 }
      );
    }

    return NextResponse.json({ success: true, booking: data });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();

    const { data: booking, error } = await supabase
      .from("bookings")
      .select(
        `*,
        vehicles(id, make, model, year, color, plate, vin, daily_rate, weekly_rate, monthly_rate, mileage, fuel_level, category, purchase_price, monthly_cost, minimum_rental_days, status, photo_url, location_id),
        renters(id, name, email, phone, drivers_license_url, drivers_license_number, drivers_license_expiry, date_of_birth),
        rental_agreements(id, status, renter_signature, signed_at, sign_token, sent_at, viewed_at, signer_ip, signer_ua, signature_png_b64, content, template_id, created_at, updated_at),
        payment_schedule_items(id, amount, due_date, status, stripe_payment_intent_id, paid_at, created_at)`
      )
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (error || !booking) {
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(booking);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
