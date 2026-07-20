import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { fireGHLEvent } from "@/lib/ghl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get operator
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, stripe_account_id, stripe_connect_status")
      .eq("user_id", user.id)
      .single();

    if (operatorError || !operator || !operator.stripe_account_id) {
      return NextResponse.json({
        connected: false,
        charges_enabled: false,
        details_submitted: false,
      });
    }

    // Fetch account details from Stripe
    const account = await stripe.accounts.retrieve(operator.stripe_account_id);

    const chargesEnabled = account.charges_enabled || false;
    const detailsSubmitted = account.details_submitted || false;

    // Update stripe_connect_status if charges are now enabled
    if (chargesEnabled && operator.stripe_connect_status !== "active") {
      const adminClient = createAdminClient();
      const { data: updated } = await adminClient
        .from("operators")
        .update({
          stripe_connect_status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", operator.id)
        .select()
        .single();

      // Fire GHL event for Stripe Connect (fire and forget)
      if (updated) {
        const note = `Connected Stripe account on ${new Date().toLocaleDateString()}`;
        fireGHLEvent(updated, "stripe-connected", note).catch((err) =>
          console.error("[GHL] stripe-connected event failed:", err)
        );
      }
    }

    return NextResponse.json({
      connected: true,
      charges_enabled: chargesEnabled,
      details_submitted: detailsSubmitted,
      stripe_account_id: operator.stripe_account_id,
    });
  } catch (error) {
    console.error("Failed to fetch Stripe account status:", error);
    return NextResponse.json(
      { error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}
