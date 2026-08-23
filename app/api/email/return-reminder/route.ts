/**
 * POST /api/email/return-reminder
 *
 * Sends a return reminder email to the renter (24h before return).
 * Body: { bookingId: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  returnReminderHtml,
  returnReminderSubject,
} from "@/lib/email-templates/return-reminder";

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
        start_date, end_date, return_time,
        vehicles(make, model, year),
        operators(business_name, phone),
        location:locations!location_id(name, address)
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
    const returnLocation = loc?.name ?? loc?.address ?? null;

    const html = returnReminderHtml({
      renterName: booking.renter_name,
      vehicleLabel,
      returnDate: formatDate(booking.end_date),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      returnTime: (booking as any).return_time ?? null,
      returnLocation,
      operatorName,
      operatorPhone: op?.phone ?? null,
      bookingId: booking.id,
    });

    const subject = returnReminderSubject(vehicleLabel);

    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: booking.renter_email,
        subject,
        body: html,
        templateType: "return_reminder",
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
        content: `Return reminder sent for ${vehicleLabel} due ${formatDate(booking.end_date)}.`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("return-reminder email error:", err);
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
