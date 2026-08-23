/**
 * POST /api/quotes/[id]/accept
 *
 * PUBLIC endpoint — customer hits this after clicking "Accept Quote" in their email.
 * Authenticated via `accept_token` in the request body (not operator session).
 *
 * Converts an accepted quote into a pending booking and returns the booking ID
 * so the customer can be redirected to complete payment / fill details.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { accept_token } = body;

    if (!accept_token) {
      return NextResponse.json({ error: "accept_token is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch quote by ID + accept_token (both must match — prevents brute-force)
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select(`
        *,
        vehicles(id, make, model, year, daily_rate, weekly_rate, monthly_rate),
        operators(id, business_name, stripe_account_id)
      `)
      .eq("id", id)
      .eq("accept_token", accept_token)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Invalid or expired quote link" }, { status: 404 });
    }

    // Check if already accepted
    if (quote.status === "accepted") {
      return NextResponse.json({
        ok: true,
        already_accepted: true,
        booking_id: quote.created_booking_id,
        message: "This quote has already been accepted.",
      });
    }

    // Check expiry
    if (quote.expires_at && new Date(quote.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("id", quote.id);

      return NextResponse.json({ error: "This quote has expired." }, { status: 410 });
    }

    // Only sent/pending quotes can be accepted
    if (!["pending", "sent"].includes(quote.status)) {
      return NextResponse.json(
        { error: `Quote cannot be accepted (current status: ${quote.status})` },
        { status: 400 }
      );
    }

    // Create a booking from the quote
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        operator_id: quote.operator_id,
        vehicle_id: quote.vehicle_id,
        renter_id: quote.renter_id ?? null,
        renter_name: quote.customer_name ?? "Quote Customer",
        renter_email: quote.customer_email ?? null,
        renter_phone: quote.customer_phone ?? null,
        start_date: quote.pickup_date,
        end_date: quote.return_date,
        duration_days: quote.duration_days,
        total_price: quote.total,
        status: "pending",
        notes: quote.notes
          ? `[Quote Accepted] ${quote.notes}`
          : "[Booking created from accepted quote]",
        // Carry over add-ons snapshot if addons column exists
        addons: quote.addons_snapshot ?? [],
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      console.error("Quote → Booking conversion error:", bookingError);
      return NextResponse.json(
        { error: "Failed to create booking from quote" },
        { status: 500 }
      );
    }

    // Mark quote as accepted
    const now = new Date().toISOString();
    await supabase
      .from("quotes")
      .update({
        status: "accepted",
        accepted_at: now,
        created_booking_id: booking.id,
      })
      .eq("id", quote.id);

    return NextResponse.json({
      ok: true,
      booking_id: booking.id,
      message: "Quote accepted! Your booking has been created.",
    });
  } catch (err) {
    console.error("POST /api/quotes/[id]/accept error:", err);
    return NextResponse.json({ error: "Failed to accept quote" }, { status: 500 });
  }
}
