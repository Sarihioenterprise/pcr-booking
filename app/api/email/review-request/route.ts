/**
 * POST /api/email/review-request
 *
 * Sends a post-rental review request email (24h after return).
 * Body: { bookingId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  reviewRequestHtml,
  reviewRequestSubject,
} from "@/lib/email-templates/review-request";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: "bookingId is required" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id, operator_id, renter_id, renter_name, renter_email,
        end_date,
        vehicles(make, model, year),
        operators(business_name, review_url)
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!booking.renter_email) {
      return NextResponse.json(
        { error: "No renter email on booking" },
        { status: 422 }
      );
    }

    const vehicle = Array.isArray(booking.vehicles)
      ? booking.vehicles[0]
      : booking.vehicles;
    const op = Array.isArray(booking.operators)
      ? booking.operators[0]
      : booking.operators;

    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "your rental vehicle";

    const operatorName = op?.business_name ?? "PCR Booking";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reviewUrl = (op as any)?.review_url ?? null;

    const html = reviewRequestHtml({
      renterName: booking.renter_name,
      vehicleLabel,
      operatorName,
      returnDate: formatDate(booking.end_date),
      bookingId: booking.id,
      reviewUrl,
    });

    const subject = reviewRequestSubject(operatorName);

    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: booking.renter_email,
        subject,
        body: html,
        templateType: "review_request",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Email send failed:", errText);
      return NextResponse.json(
        { error: "Failed to send email" },
        { status: 500 }
      );
    }

    // Log communication
    if (booking.renter_id) {
      await supabase.from("renter_communications").insert({
        renter_id: booking.renter_id,
        operator_id: booking.operator_id,
        type: "email",
        subject,
        content: `Review request sent after return of ${vehicleLabel}.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("review-request email error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00Z").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
