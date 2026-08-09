/**
 * POST /api/payments/deposit/initiate
 *
 * Operator-only. Generates a secure deposit_token, sets booking
 * deposit_status = 'pending_auth', and emails the renter a link to
 * /deposit/[token] where they can authorize the hold via Stripe Elements.
 *
 * Graceful fallback: if deposit columns don't exist (migration 020 not applied),
 * returns a descriptive error instead of crashing.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const { booking_id } = await request.json();

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }

    // Guard: Stripe must be connected + deposit_amount > 0
    if (!operator.stripe_account_id) {
      return NextResponse.json(
        { error: "Connect your Stripe account in Settings > Payment before requesting deposits." },
        { status: 400 }
      );
    }
    if (!operator.deposit_amount || operator.deposit_amount <= 0) {
      return NextResponse.json(
        { error: "Set a deposit amount in Settings > Payment before requesting deposits." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Fetch booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id, renter_name, renter_email, start_date, end_date, deposit_status, deposit_token, vehicles(make, model, year)")
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Don't re-initiate if already held/captured
    const lockedStatuses = ["held", "captured", "partially_captured"];
    if (lockedStatuses.includes(booking.deposit_status)) {
      return NextResponse.json(
        { error: `Deposit is already ${booking.deposit_status}. No re-initiation needed.` },
        { status: 400 }
      );
    }

    // Generate or reuse token
    const token = (booking.deposit_token as string | null) || crypto.randomUUID();

    // Update booking: set token + pending_auth status
    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        deposit_token: token,
        deposit_status: "pending_auth",
        deposit_amount: operator.deposit_amount,
      } as Record<string, unknown>)
      .eq("id", booking_id);

    if (updateError) {
      // Graceful degradation: migration 020 may not be applied
      if (updateError.message.includes("deposit_token") || updateError.message.includes("column")) {
        return NextResponse.json(
          {
            error: "Schema migration 020 required for deposit lifecycle. Please apply supabase/migrations/020_deposits.sql.",
            migration_required: true,
          },
          { status: 503 }
        );
      }
      throw updateError;
    }

    // Build deposit link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    const depositLink = `${baseUrl}/deposit/${token}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleArr = booking.vehicles as any;
    const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "your rental vehicle";

    // Email renter
    if (booking.renter_email) {
      await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: booking.renter_email,
          subject: `Action Required: Authorize Security Deposit for ${vehicleLabel}`,
          body: `<p>Hi ${booking.renter_name},</p>
<p>To complete your rental booking for <strong>${vehicleLabel}</strong>, your rental company requires a security deposit authorization of <strong>$${Number(operator.deposit_amount).toFixed(2)}</strong>.</p>
<p>This is an <strong>authorization hold</strong> — your card will not be charged unless there is damage, late return fees, or other issues. The hold will be released when you return the vehicle in good condition.</p>
<p><strong>Rental Period:</strong> ${booking.start_date} to ${booking.end_date}</p>
<p style="margin:24px 0;">
  <a href="${depositLink}" style="display:inline-block;background:#2EBD6B;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
    Authorize Security Deposit →
  </a>
</p>
<p style="color:#6b7280;font-size:13px;">This link is unique to your booking. Please do not share it.</p>
<p style="color:#6b7280;font-size:13px;">⚠️ Authorization holds expire after 7 days if not authorized. Please complete this step before your pickup date.</p>
<p>If you have questions, please contact ${operator.business_name} directly.</p>`,
          templateType: "deposit_hold_request",
        }),
      }).catch((err) => console.error("Deposit email send failed:", err));
    }

    return NextResponse.json({
      ok: true,
      deposit_token: token,
      deposit_link: depositLink,
      deposit_amount: operator.deposit_amount,
      renter_emailed: !!booking.renter_email,
    });
  } catch (err) {
    console.error("Deposit initiate error:", err);
    return NextResponse.json(
      { error: "Failed to initiate deposit request" },
      { status: 500 }
    );
  }
}
