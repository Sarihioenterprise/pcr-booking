/**
 * Portal authentication helpers for renter-facing routes.
 *
 * TODO (DB migration required): Add `access_token` column to bookings table:
 *   ALTER TABLE bookings ADD COLUMN access_token TEXT;
 *   CREATE INDEX idx_bookings_access_token ON bookings(access_token);
 *
 * When a booking is created, generate and store an access token:
 *   const access_token = crypto.randomUUID();
 *   INSERT INTO bookings (..., access_token) VALUES (..., access_token);
 *
 * Share the portal URL as:
 *   https://pcrbooking.com/portal/<bookingId>?token=<access_token>
 */

import { NextRequest, NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Verifies that the request has a valid portal access token for the given booking.
 * Returns null if authorized, or a 401 NextResponse if not.
 */
export async function verifyPortalToken(
  request: NextRequest,
  bookingId: string,
  supabase: SupabaseClient
): Promise<NextResponse | null> {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // Fetch just the access_token field from the booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, access_token")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  // If the booking has an access_token set, require a matching token in the request
  // If access_token column doesn't exist yet (returns null/undefined), allow through
  // with a console warning (backward-compatible during migration)
  if (booking.access_token !== undefined && booking.access_token !== null) {
    if (!token || token !== booking.access_token) {
      return NextResponse.json(
        { error: "Unauthorized: invalid or missing portal access token" },
        { status: 401 }
      );
    }
  } else {
    // TODO: Remove this fallback once access_token column is added to all bookings
    console.warn(
      `[portal-auth] Booking ${bookingId} has no access_token set. ` +
        "Add access_token column and regenerate tokens to enforce portal security."
    );
  }

  return null; // Authorized
}
