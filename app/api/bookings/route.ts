import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/create-notification";

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    // Let Next.js redirect errors propagate (unauthenticated)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const body = await request.json();

    const {
      vehicle_id,
      renter_name,
      renter_phone,
      renter_email,
      drivers_license,
      start_date,
      end_date,
      status = "inquiry",
      notes,
      pickup_instructions,
    } = body;

    if (!renter_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: renter_name, start_date, end_date" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Calculate duration
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffMs = end.getTime() - start.getTime();
    const duration_days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Look up vehicle rate if vehicle_id provided
    let daily_rate = 0;
    let total_price = 0;

    if (vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate")
        .eq("id", vehicle_id)
        .eq("operator_id", operator.id)
        .single();

      if (vehicle) {
        let effectiveRate = vehicle.daily_rate;
        if (duration_days >= 30 && vehicle.monthly_rate) {
          effectiveRate = vehicle.monthly_rate / 30;
        } else if (duration_days >= 7 && vehicle.weekly_rate) {
          effectiveRate = vehicle.weekly_rate / 7;
        }
        daily_rate = effectiveRate;
        total_price = effectiveRate * duration_days;
      }
    }

    // Upsert renter record
    let renter_id: string | null = null;
    if (renter_name) {
      const orParts = [
        renter_email ? `email.eq.${renter_email}` : null,
        renter_phone ? `phone.eq.${renter_phone}` : null,
      ].filter(Boolean);

      if (orParts.length > 0) {
        const { data: existingRenter } = await supabase
          .from("renters")
          .select("id")
          .eq("operator_id", operator.id)
          .or(orParts.join(","))
          .maybeSingle();

        if (existingRenter) {
          renter_id = existingRenter.id;
        }
      }

      if (!renter_id) {
        const { data: newRenter } = await supabase
          .from("renters")
          .insert({
            operator_id: operator.id,
            name: renter_name,
            email: renter_email || null,
            phone: renter_phone || null,
            drivers_license_number: drivers_license || null,
          })
          .select("id")
          .single();
        if (newRenter) renter_id = newRenter.id;
      }
    }

    // Create the booking
    const { data: booking, error } = await supabase
      .from("bookings")
      .insert({
        operator_id: operator.id,
        vehicle_id: vehicle_id || null,
        renter_id,
        renter_name,
        renter_phone: renter_phone || null,
        renter_email: renter_email || null,
        start_date,
        end_date,
        duration_days,
        daily_rate,
        total_price,
        tax_amount: 0,
        discount_amount: 0,
        deposit_amount: operator.deposit_amount || 0,
        deposit_status: "none",
        status,
        notes: notes || null,
        pickup_instructions: pickup_instructions || operator.default_pickup_instructions || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create in-app notification
    try {
      await createNotification(
        operator.id,
        "new_booking",
        "New Booking Created",
        `Booking for ${renter_name} (${status})`,
        `/dashboard/bookings/${booking.id}`
      );
    } catch {
      // Non-fatal
    }

    // Fire confirmation email (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";
    if (renter_email) {
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: renter_email,
          subject: "Booking Request Received",
          body: `<p>Hi ${renter_name},</p><p>Your booking request has been received and is currently <strong>${status}</strong>.</p><p>Dates: ${start_date} to ${end_date} (${duration_days} day${duration_days !== 1 ? "s" : ""})</p>${total_price > 0 ? `<p>Estimated total: <strong>$${total_price.toFixed(2)}</strong></p>` : ""}<p>We will be in touch shortly to confirm your reservation.</p><p>Thank you!</p>`,
          templateType: "booking_confirmation",
        }),
      }).catch(() => {});
    }

    // Notify operator
    if (operator.business_email) {
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: operator.business_email,
          subject: `New Booking: ${renter_name}`,
          body: `<p>A new booking has been created for <strong>${renter_name}</strong>.</p><p>Dates: ${start_date} to ${end_date} (${duration_days} day${duration_days !== 1 ? "s" : ""})</p><p>Status: ${status}</p>${total_price > 0 ? `<p>Total: $${total_price.toFixed(2)}</p>` : ""}<p><a href="${baseUrl}/dashboard/bookings/${booking.id}">View booking →</a></p>`,
          templateType: "operator_notification",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Create booking error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
