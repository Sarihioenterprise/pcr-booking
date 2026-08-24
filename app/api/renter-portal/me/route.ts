import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyRenterToken, RENTER_SESSION_COOKIE } from "@/lib/renter-portal-jwt";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/renter-portal/me
 *
 * Returns the authenticated renter's profile + all their bookings
 * (joined with vehicle info). Requires valid session cookie.
 */
export async function GET(_request: NextRequest) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(RENTER_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await verifyRenterToken(sessionToken);

  if (!payload || payload.type !== "session") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Fetch renter profile
  const { data: renter, error: renterError } = await supabase
    .from("renters")
    .select("id, name, email, phone, city, state, created_at")
    .eq("id", payload.sub)
    .single();

  if (renterError || !renter) {
    return NextResponse.json({ error: "Renter not found" }, { status: 404 });
  }

  // Fetch all their bookings with vehicle + operator info
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      start_date,
      end_date,
      daily_rate,
      total_price,
      tax_amount,
      discount_amount,
      addons_total,
      deposit_amount,
      deposit_status,
      duration_days,
      notes,
      created_at,
      pickup_location,
      pickup_time,
      return_time,
      vehicles (
        id,
        make,
        model,
        year,
        color,
        photo_url
      ),
      operators (
        id,
        business_name,
        booking_slug
      )
    `)
    .eq("renter_id", payload.sub)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    console.error("[renter-portal/me] bookings error:", bookingsError);
  }

  return NextResponse.json({
    renter,
    bookings: bookings ?? [],
  });
}
