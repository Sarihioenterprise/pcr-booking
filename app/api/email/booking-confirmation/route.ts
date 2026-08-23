/**
 * POST /api/email/booking-confirmation
 *
 * Sends a booking confirmation email to the renter.
 * Body: { bookingId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveOperatorEmail } from "@/lib/notify-email";
import {
  bookingConfirmationHtml,
  bookingConfirmationSubject,
} from "@/lib/email-templates/booking-confirmation";

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

    // Fetch booking with vehicle, operator, location
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        `
        id, operator_id, renter_id, renter_name, renter_email,
        start_date, end_date, duration_days, total_price,
        pickup_time, return_time, pickup_location,
        vehicles(make, model, year),
        operators(business_name, business_email, phone, user_id),
        location:locations!location_id(name, address)
      `
      )
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const vehicle = Array.isArray(booking.vehicles)
      ? booking.vehicles[0]
      : booking.vehicles;
    const op = Array.isArray(booking.operators)
      ? booking.operators[0]
      : booking.operators;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loc = Array.isArray((booking as any).location)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? (booking as any).location[0]
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      : (booking as any).location;

    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "your rental vehicle";

    const operatorName = op?.business_name ?? "PCR Booking";
    const operatorEmail = await resolveOperatorEmail(op ?? {});

    if (!booking.renter_email) {
      return NextResponse.json(
        { error: "No renter email on booking" },
        { status: 422 }
      );
    }

    const html = bookingConfirmationHtml({
      renterName: booking.renter_name,
      vehicleLabel,
      startDate: formatDate(booking.start_date),
      endDate: formatDate(booking.end_date),
      durationDays: booking.duration_days,
      totalPaid: Number(booking.total_price),
      pickupLocation:
        loc?.name ?? loc?.address ?? (booking as any).pickup_location ?? null,
      pickupTime: (booking as any).pickup_time ?? null,
      returnTime: (booking as any).return_time ?? null,
      operatorName,
      operatorPhone: op?.phone ?? null,
      operatorEmail: operatorEmail ?? null,
      bookingId: booking.id,
      baseUrl: BASE_URL,
    });

    const subject = bookingConfirmationSubject(vehicleLabel);

    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: booking.renter_email,
        subject,
        body: html,
        templateType: "booking_confirmation",
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

    // Log communication to renter_communications if renter_id is set
    if (booking.renter_id) {
      await supabase.from("renter_communications").insert({
        renter_id: booking.renter_id,
        operator_id: booking.operator_id,
        type: "email",
        subject,
        content: `Booking confirmation email sent for ${vehicleLabel} (${formatDate(booking.start_date)} – ${formatDate(booking.end_date)}).`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("booking-confirmation email error:", err);
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
