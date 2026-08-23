/**
 * GET /api/payments/request-link/[token]/client-secret
 *
 * Public. Returns the Stripe client_secret for a pending payment request
 * so the customer payment page can initialize Stripe Elements.
 *
 * Only returns secret for 'pending', non-expired requests.
 *
 * Returns: { client_secret: string, stripe_account_id: string, amount_cents: number }
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

    const { data: pr, error } = await supabase
      .from("payment_requests")
      .select(`
        id,
        status,
        expires_at,
        stripe_client_secret,
        amount_cents,
        operators (
          stripe_account_id
        )
      `)
      .eq("token", token)
      .single();

    if (error || !pr) {
      return NextResponse.json({ error: "Payment link not found" }, { status: 404 });
    }

    if (pr.status !== "pending") {
      return NextResponse.json(
        { error: `Payment request is ${pr.status}` },
        { status: 400 }
      );
    }

    if (new Date(pr.expires_at) < new Date()) {
      return NextResponse.json({ error: "Payment link has expired" }, { status: 400 });
    }

    if (!pr.stripe_client_secret) {
      return NextResponse.json({ error: "Payment not initialized" }, { status: 500 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const operator = pr.operators as any;

    return NextResponse.json({
      client_secret: pr.stripe_client_secret,
      stripe_account_id: operator?.stripe_account_id ?? null,
      amount_cents: pr.amount_cents,
    });
  } catch (err) {
    console.error("client-secret route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
