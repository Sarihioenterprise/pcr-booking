/**
 * POST /api/payments/deposit/capture
 *
 * Alias capture endpoint (re-exports PATCH from parent route for clarity).
 * Also handles the renter-facing deposit-hold confirmation after Stripe Elements submit.
 *
 * POST { token, payment_intent_id } → confirm hold is placed (renter auth)
 * POST { booking_id, capture_amount?, reason } → operator capture (same as PATCH on parent)
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { resolveOperatorEmail } from "@/lib/notify-email";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, payment_intent_id, booking_id, capture_amount, reason } = body;

    const supabase = createAdminClient();

    // ── Renter confirm-hold flow (public token-auth) ───────────────────────
    if (token) {
      // Find booking by deposit_token
      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, operator_id, renter_name, renter_email, deposit_amount, deposit_status, deposit_payment_intent_id, vehicles(make, model, year), operators(business_name, business_email, user_id)")
        .eq("deposit_token" as string, token)
        .maybeSingle();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "Invalid deposit token" }, { status: 404 });
      }

      // Verify the payment intent is in requires_capture state
      let piStatus = "unknown";
      let piId = payment_intent_id || booking.deposit_payment_intent_id;

      if (piId) {
        try {
          const stripe = getStripe();
          const pi = await stripe.paymentIntents.retrieve(piId as string);
          piStatus = pi.status;
        } catch (err) {
          console.error("PI retrieve error:", err);
        }
      }

      if (piStatus !== "requires_capture") {
        // If already confirmed as held, return success
        if (booking.deposit_status === "held") {
          return NextResponse.json({ ok: true, status: "held", already_held: true });
        }
        return NextResponse.json(
          { error: `Payment not yet authorized (status: ${piStatus}). Please complete card entry.` },
          { status: 400 }
        );
      }

      const now = new Date().toISOString();
      await supabase
        .from("bookings")
        .update({
          deposit_status: "held",
          deposit_authorized_at: now,
          deposit_payment_intent_id: piId,
        } as Record<string, unknown>)
        .eq("id", booking.id as string);

      // Send confirmation emails
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const vehicleArr = booking.vehicles as any;
      const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
      const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "your rental vehicle";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const opArr = booking.operators as any;
      const op = Array.isArray(opArr) ? opArr[0] : opArr;

      // Renter confirmation
      if (booking.renter_email) {
        fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: booking.renter_email,
            subject: `Security Deposit Hold Confirmed — ${vehicleLabel}`,
            body: `<p>Hi ${booking.renter_name},</p>
<p>Your security deposit authorization of <strong>$${Number(booking.deposit_amount).toFixed(2)}</strong> for <strong>${vehicleLabel}</strong> has been successfully placed.</p>
<p>This is a <strong>hold only</strong> — your card will not be charged unless there is damage or late fees. The hold will be automatically released when you return the vehicle in good condition.</p>
<p><strong>Note:</strong> Authorization holds typically expire after 7 days if not captured. If your rental extends beyond this window, your rental company may request a new authorization.</p>
<p>Thank you for completing this step!</p>`,
            templateType: "deposit_hold_confirmed",
          }),
        }).catch((err) => console.error("Deposit confirm email (renter) error:", err));
      }

      // Operator notification
      const operatorNotifyEmail = op ? await resolveOperatorEmail(op) : null;
      if (operatorNotifyEmail) {
        fetch(`${baseUrl}/api/email/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: operatorNotifyEmail,
            subject: `Deposit Hold Authorized — ${booking.renter_name}`,
            body: `<p>Good news! ${booking.renter_name} has authorized the security deposit hold of <strong>$${Number(booking.deposit_amount).toFixed(2)}</strong> for <strong>${vehicleLabel}</strong>.</p>
<p>The hold is now active. You can capture or release it from the booking detail page.</p>
<p><a href="${baseUrl}/dashboard/bookings/${booking.id}" style="display:inline-block;background:#2EBD6B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">View Booking →</a></p>
<p style="color:#6b7280;font-size:13px;">Note: Authorization holds expire after 7 days if not captured. Capture or release before expiry.</p>`,
            templateType: "operator_deposit_confirmed",
          }),
        }).catch((err) => console.error("Deposit confirm email (operator) error:", err));
      }

      return NextResponse.json({ ok: true, status: "held" });
    }

    // ── Operator capture flow ─────────────────────────────────────────────
    if (booking_id) {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();
      if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

      const { data: op } = await supabase
        .from("operators")
        .select("id, business_name")
        .eq("user_id", user.id)
        .single();

      if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

      const { data: booking, error: bookingError } = await supabase
        .from("bookings")
        .select("id, renter_email, renter_name, deposit_amount, deposit_status, deposit_payment_intent_id, vehicles(make, model, year)")
        .eq("id", booking_id)
        .eq("operator_id", op.id)
        .single();

      if (bookingError || !booking) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }

      if (booking.deposit_status !== "held") {
        return NextResponse.json(
          { error: `Cannot capture: deposit is '${booking.deposit_status}'. Must be 'held'.` },
          { status: 400 }
        );
      }

      const depositAmount = Number(booking.deposit_amount);
      const amountToCapture = capture_amount != null
        ? Math.min(Number(capture_amount), depositAmount)
        : depositAmount;

      const stripe = getStripe();
      await stripe.paymentIntents.capture(
        booking.deposit_payment_intent_id as string,
        { amount_to_capture: Math.round(amountToCapture * 100) }
      );

      const isPartial = amountToCapture < depositAmount;
      const now = new Date().toISOString();

      await supabase
        .from("bookings")
        .update({
          deposit_status: isPartial ? "partially_captured" : "captured",
          deposit_captured_amount: amountToCapture,
          deposit_captured_at: now,
          deposit_capture_reason: reason || null,
        } as Record<string, unknown>)
        .eq("id", booking_id);

      return NextResponse.json({
        ok: true,
        status: isPartial ? "partially_captured" : "captured",
        captured_amount: amountToCapture,
      });
    }

    return NextResponse.json({ error: "token or booking_id required" }, { status: 400 });
  } catch (err) {
    console.error("Deposit capture error:", err);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}
