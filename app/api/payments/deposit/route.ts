/**
 * /api/payments/deposit
 *
 * GET  ?token=xxx     → Public (token-auth): return booking info for deposit page
 * POST {deposit_token}→ Public (token-auth): create/reuse PaymentIntent, return client_secret
 * POST {booking_id}   → Operator-auth: create PaymentIntent (legacy direct-operator flow)
 * PATCH               → Operator-auth: capture deposit (full or partial)
 * PUT                 → Operator-auth: release (cancel) deposit hold
 *
 * Stripe: uses capture_method=manual (destination charge to connected account).
 * Graceful degradation: if deposit_token column missing (migration 020 not applied),
 * operations degrade to available functionality.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { PLATFORM_FEE_RATE } from "@/lib/constants";

// ── GET: public booking info for deposit page ────────────────────────────────

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "token is required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, operator_id, renter_name, start_date, end_date, duration_days,
      deposit_amount, deposit_status, deposit_payment_intent_id,
      vehicles(make, model, year),
      operators(business_name, stripe_account_id)
    `)
    .eq("deposit_token" as string, token)
    .maybeSingle();

  if (error) {
    // migration 020 not applied — column doesn't exist
    if (error.message.includes("deposit_token") || error.message.includes("column")) {
      return NextResponse.json(
        { error: "Deposit link not found or expired." },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!booking) {
    return NextResponse.json({ error: "Deposit link not found or expired." }, { status: 404 });
  }

  if (booking.deposit_status === "held") {
    return NextResponse.json({
      ...sanitizeBookingForPublic(booking),
      already_held: true,
    });
  }

  if (booking.deposit_status === "released" || booking.deposit_status === "captured" || booking.deposit_status === "partially_captured") {
    return NextResponse.json({
      ...sanitizeBookingForPublic(booking),
      completed: true,
    });
  }

  return NextResponse.json(sanitizeBookingForPublic(booking));
}

// ── POST: create PaymentIntent (public token-auth or operator session) ────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, deposit_token, amount } = body;

    const supabase = createAdminClient();

    let booking: Record<string, unknown> | null = null;

    // ── Public token-based auth (renter flow) ──────────────────────────────
    if (deposit_token) {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, operators(stripe_account_id, business_name)")
        .eq("deposit_token" as string, deposit_token)
        .maybeSingle();

      if (error) {
        if (error.message.includes("deposit_token") || error.message.includes("column")) {
          return NextResponse.json(
            { error: "Migration 020 required. Please apply supabase/migrations/020_deposits.sql." },
            { status: 503 }
          );
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!data) {
        return NextResponse.json({ error: "Invalid or expired deposit link" }, { status: 404 });
      }

      // Reuse existing PI if still valid
      if (data.deposit_payment_intent_id) {
        try {
          const stripe = getStripe();
          const pi = await stripe.paymentIntents.retrieve(data.deposit_payment_intent_id as string);
          if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
            return NextResponse.json({
              client_secret: pi.client_secret,
              payment_intent_id: pi.id,
              reused: true,
            });
          }
        } catch {
          // PI retrieval failed — create new one
        }
      }

      booking = data;
    }

    // ── Operator session auth (direct flow) ─────────────────────────────────
    if (!booking && booking_id) {
      const serverClient = await createClient();
      const { data: { user } } = await serverClient.auth.getUser();

      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: op } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!op) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("*, operators(stripe_account_id, business_name)")
        .eq("id", booking_id)
        .eq("operator_id", op.id)
        .single();

      if (error || !data) {
        return NextResponse.json({ error: "Booking not found" }, { status: 404 });
      }
      booking = data;
    }

    if (!booking) {
      return NextResponse.json({ error: "booking_id or deposit_token required" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operatorData = booking.operators as any;
    const operator = Array.isArray(operatorData) ? operatorData[0] : operatorData;

    // 🔒 HARD GUARD: money can NEVER enter the system unless the operator has
    // Stripe connected. All funds route to the operator's own Stripe account
    // (transfer_data.destination). The platform account never holds client money.
    if (!operator?.stripe_account_id) {
      return NextResponse.json(
        { error: "This rental company hasn't finished setting up payments yet. Please contact them directly to complete your deposit." },
        { status: 403 }
      );
    }

    const depositAmount = amount ?? booking.deposit_amount;
    if (!depositAmount || Number(depositAmount) <= 0) {
      return NextResponse.json({ error: "Invalid deposit amount" }, { status: 400 });
    }

    const stripe = getStripe();

    const depositAmountCents = Math.round(Number(depositAmount) * 100);
    const platformFee = Math.round(depositAmountCents * PLATFORM_FEE_RATE);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: depositAmountCents,
      currency: "usd",
      capture_method: "manual",
      metadata: {
        booking_id: booking.id as string,
        operator_id: booking.operator_id as string,
        type: "security_deposit",
      },
      ...(operator?.stripe_account_id
        ? {
            application_fee_amount: platformFee,
            transfer_data: {
              destination: operator.stripe_account_id,
            },
          }
        : {}),
    });

    // Store PI id on booking
    await supabase
      .from("bookings")
      .update({
        deposit_payment_intent_id: paymentIntent.id,
        deposit_amount: Number(depositAmount),
      })
      .eq("id", booking.id as string);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      payment_intent_id: paymentIntent.id,
    });
  } catch (err) {
    console.error("Create deposit PI error:", err);
    return NextResponse.json({ error: "Failed to create deposit authorization" }, { status: 500 });
  }
}

// ── PATCH: capture (full or partial) ────────────────────────────────────────

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id, capture_amount, reason } = body;

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }

    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data: op } = await supabase
      .from("operators")
      .select("id, business_email, business_name")
      .eq("user_id", user.id)
      .single();

    if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, operator_id, renter_name, renter_email, deposit_amount, deposit_status, deposit_payment_intent_id, vehicles(make, model, year), operators(stripe_account_id)")
      .eq("id", booking_id)
      .eq("operator_id", op.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.deposit_status !== "held") {
      return NextResponse.json(
        { error: `Cannot capture: deposit status is '${booking.deposit_status}'. Must be 'held'.` },
        { status: 400 }
      );
    }

    if (!booking.deposit_payment_intent_id) {
      return NextResponse.json({ error: "No deposit PaymentIntent found" }, { status: 400 });
    }

    const depositAmount = Number(booking.deposit_amount);
    const amountToCapture = capture_amount != null
      ? Math.min(Number(capture_amount), depositAmount)
      : depositAmount;

    if (amountToCapture <= 0) {
      return NextResponse.json({ error: "Capture amount must be greater than 0" }, { status: 400 });
    }

    const stripe = getStripe();
    const captured = await stripe.paymentIntents.capture(
      booking.deposit_payment_intent_id as string,
      { amount_to_capture: Math.round(amountToCapture * 100) }
    );

    const isPartial = amountToCapture < depositAmount;
    const newStatus = isPartial ? "partially_captured" : "captured";
    const now = new Date().toISOString();

    await supabase
      .from("bookings")
      .update({
        deposit_status: newStatus,
        deposit_captured_amount: amountToCapture,
        deposit_captured_at: now,
        deposit_capture_reason: reason || null,
      } as Record<string, unknown>)
      .eq("id", booking_id);

    // Email renter with capture notice
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleArr = booking.vehicles as any;
    const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "your rental vehicle";

    if (booking.renter_email) {
      const releasedNote = isPartial
        ? `<p>The remaining $${(depositAmount - amountToCapture).toFixed(2)} of your deposit has been released back to your card (may take 5–10 business days to appear).</p>`
        : "";

      await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: booking.renter_email,
          subject: `Security Deposit Capture Notice — ${vehicleLabel}`,
          body: `<p>Hi ${booking.renter_name},</p>
<p>Your security deposit has been partially or fully captured by ${op.business_name ?? "your rental company"}.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
  <tr style="background:#f3f4f6;">
    <th style="text-align:left;padding:8px 12px;border:1px solid #e5e7eb;">Item</th>
    <th style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;">Amount</th>
  </tr>
  <tr>
    <td style="padding:8px 12px;border:1px solid #e5e7eb;">Original deposit hold</td>
    <td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;">$${depositAmount.toFixed(2)}</td>
  </tr>
  <tr style="font-weight:bold;background:#fef3c7;">
    <td style="padding:8px 12px;border:1px solid #e5e7eb;">Amount captured${reason ? ` — ${reason}` : ""}</td>
    <td style="text-align:right;padding:8px 12px;border:1px solid #e5e7eb;">$${amountToCapture.toFixed(2)}</td>
  </tr>
</table>
${releasedNote}
<p>If you have questions about this charge, please contact ${op.business_name ?? "your rental company"} directly.</p>`,
          templateType: "deposit_captured",
        }),
      }).catch((err) => console.error("Deposit capture email error:", err));
    }

    return NextResponse.json({
      ok: true,
      status: newStatus,
      captured_amount: amountToCapture,
      stripe_payment_intent_id: captured.id,
    });
  } catch (err) {
    console.error("Deposit capture error:", err);
    return NextResponse.json({ error: "Failed to capture deposit" }, { status: 500 });
  }
}

// ── PUT: release (cancel) deposit hold ──────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { booking_id } = body;

    if (!booking_id) {
      return NextResponse.json({ error: "booking_id is required" }, { status: 400 });
    }

    const serverClient = await createClient();
    const { data: { user } } = await serverClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data: op } = await supabase
      .from("operators")
      .select("id, business_email, business_name")
      .eq("user_id", user.id)
      .single();

    if (!op) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, renter_name, renter_email, deposit_status, deposit_payment_intent_id, vehicles(make, model, year)")
      .eq("id", booking_id)
      .eq("operator_id", op.id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (booking.deposit_status !== "held" && booking.deposit_status !== "pending_auth") {
      return NextResponse.json(
        { error: `Cannot release: deposit status is '${booking.deposit_status}'.` },
        { status: 400 }
      );
    }

    const stripe = getStripe();

    if (booking.deposit_payment_intent_id) {
      try {
        await stripe.paymentIntents.cancel(booking.deposit_payment_intent_id as string);
      } catch (stripeErr) {
        // If already cancelled, continue
        const stripeErrMsg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
        if (!stripeErrMsg.includes("already canceled") && !stripeErrMsg.includes("requires_capture")) {
          throw stripeErr;
        }
      }
    }

    const now = new Date().toISOString();
    await supabase
      .from("bookings")
      .update({
        deposit_status: "released",
        deposit_released_at: now,
      } as Record<string, unknown>)
      .eq("id", booking_id);

    // Email renter
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleArr = booking.vehicles as any;
    const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
    const vehicleLabel = vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "your rental vehicle";

    if (booking.renter_email) {
      await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: booking.renter_email,
          subject: `Security Deposit Released — ${vehicleLabel}`,
          body: `<p>Hi ${booking.renter_name},</p>
<p>Great news! Your security deposit hold for <strong>${vehicleLabel}</strong> has been released by ${op.business_name ?? "your rental company"}.</p>
<p>No funds were captured. The authorization hold will be removed from your card within 5–10 business days depending on your bank.</p>
<p>Thank you for being a great renter! We hope to see you again soon.</p>`,
          templateType: "deposit_released",
        }),
      }).catch((err) => console.error("Deposit release email error:", err));
    }

    return NextResponse.json({ ok: true, status: "released" });
  } catch (err) {
    console.error("Release deposit error:", err);
    return NextResponse.json({ error: "Failed to release deposit" }, { status: 500 });
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeBookingForPublic(booking: any) {
  const vehicleArr = booking.vehicles;
  const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;

  const operatorArr = booking.operators;
  const operator = Array.isArray(operatorArr) ? operatorArr[0] : operatorArr;

  return {
    id: booking.id,
    renter_name: booking.renter_name,
    start_date: booking.start_date,
    end_date: booking.end_date,
    duration_days: booking.duration_days,
    deposit_amount: booking.deposit_amount,
    deposit_status: booking.deposit_status,
    vehicle: vehicle ? { make: vehicle.make, model: vehicle.model, year: vehicle.year } : null,
    operator_name: operator?.business_name ?? "Your Rental Company",
    stripe_connected: !!operator?.stripe_account_id,
  };
}
