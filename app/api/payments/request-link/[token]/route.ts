/**
 * GET /api/payments/request-link/[token]
 *
 * Public (no auth). Used by the customer payment page to fetch
 * booking summary + payment request details.
 *
 * Does NOT expose stripe_client_secret — that's a separate endpoint.
 *
 * Returns: { booking, payment_request: { label, amount_cents, currency, status, expires_at, ... } }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch payment request by token
    const { data: pr, error: prError } = await supabase
      .from("payment_requests")
      .select(`
        id,
        booking_id,
        operator_id,
        token,
        label,
        amount_cents,
        currency,
        status,
        expires_at,
        paid_at,
        created_at,
        bookings (
          id,
          renter_name,
          start_date,
          end_date,
          duration_days,
          total_price,
          vehicles (
            make,
            model,
            year,
            photo_url
          )
        ),
        operators (
          business_name,
          logo_url,
          stripe_account_id
        )
      `)
      .eq("token", token)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    // Check expiry — auto-expire if past expires_at
    const now = new Date();
    const expiresAt = new Date(pr.expires_at);
    if (pr.status === "pending" && expiresAt < now) {
      // Mark as expired in DB (best effort, non-blocking)
      void supabase
        .from("payment_requests")
        .update({ status: "expired" })
        .eq("id", pr.id)
        .then(() => {});

      return NextResponse.json({
        payment_request: {
          id: pr.id,
          token: pr.token,
          label: pr.label,
          amount_cents: pr.amount_cents,
          currency: pr.currency,
          status: "expired",
          expires_at: pr.expires_at,
        },
      });
    }

    // For non-pending statuses, return minimal info + status message
    if (pr.status !== "pending") {
      return NextResponse.json({
        payment_request: {
          id: pr.id,
          token: pr.token,
          label: pr.label,
          amount_cents: pr.amount_cents,
          currency: pr.currency,
          status: pr.status,
          expires_at: pr.expires_at,
          paid_at: pr.paid_at,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        operator: { business_name: (pr.operators as any)?.business_name ?? null },
      });
    }

    // Return full details for pending requests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = pr.bookings as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operator = pr.operators as any;
    const vehicle = booking?.vehicles;

    return NextResponse.json({
      payment_request: {
        id: pr.id,
        token: pr.token,
        label: pr.label,
        amount_cents: pr.amount_cents,
        currency: pr.currency,
        status: pr.status,
        expires_at: pr.expires_at,
      },
      booking: {
        id: booking?.id ?? null,
        renter_name: booking?.renter_name ?? null,
        start_date: booking?.start_date ?? null,
        end_date: booking?.end_date ?? null,
        duration_days: booking?.duration_days ?? null,
        total_price: booking?.total_price ?? null,
        vehicle: vehicle
          ? {
              make: vehicle.make,
              model: vehicle.model,
              year: vehicle.year,
              photo_url: vehicle.photo_url ?? null,
            }
          : null,
      },
      operator: {
        business_name: operator?.business_name ?? null,
        logo_url: operator?.logo_url ?? null,
        stripe_account_id: operator?.stripe_account_id ?? null,
      },
    });
  } catch (err) {
    console.error("request-link [token] GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
