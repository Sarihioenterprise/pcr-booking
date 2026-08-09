import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

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
