/**
 * GET /api/quotes/public/[token]
 *
 * Public endpoint — no operator auth required.
 * Returns quote data for the customer-facing quote view page.
 * Fetches by accept_token so the URL is opaque.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Params = { params: Promise<{ token: string }> };

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  try {
    const supabase = createAdminClient();

    const { data: quote, error } = await supabase
      .from("quotes")
      .select(`
        id,
        accept_token,
        customer_name,
        pickup_date,
        return_date,
        duration_days,
        base_total,
        addon_total,
        total,
        addons_snapshot,
        status,
        notes,
        expires_at,
        accepted_at,
        created_booking_id,
        vehicles(make, model, year, photo_url, category),
        operators(business_name, logo_url, brand_color)
      `)
      .eq("accept_token", token)
      .single();

    if (error || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    // Check and auto-expire if past expiry
    if (
      quote.status === "sent" &&
      quote.expires_at &&
      new Date(quote.expires_at) < new Date()
    ) {
      await supabase
        .from("quotes")
        .update({ status: "expired" })
        .eq("accept_token", token);

      return NextResponse.json({ ...quote, status: "expired" });
    }

    return NextResponse.json(quote);
  } catch (err) {
    console.error("GET /api/quotes/public/[token] error:", err);
    return NextResponse.json({ error: "Failed to load quote" }, { status: 500 });
  }
}
