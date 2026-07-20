import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { fireGHLEvent } from "@/lib/ghl";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`);
  }

  try {
    // Get operator
    const { data: operator, error: operatorError } = await supabase
      .from("operators")
      .select("id, stripe_account_id")
      .eq("user_id", user.id)
      .single();

    if (operatorError || !operator) {
      return NextResponse.json({ error: "Operator not found" }, { status: 404 });
    }

    let accountId = operator.stripe_account_id;

    // Create Express account if not exists
    if (!accountId) {
      const account = await stripe.accounts.create({ type: "express" });
      accountId = account.id;

      // Save to database
      const adminClient = createAdminClient();
      await adminClient
        .from("operators")
        .update({
          stripe_account_id: accountId,
          stripe_connect_status: "pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", operator.id);
    }

    // Generate onboarding link
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/api/stripe/connect`,
      return_url: `${APP_URL}/dashboard/settings?stripe=connected`,
      type: "account_onboarding",
    });

    return NextResponse.redirect(accountLink.url);
  } catch (error) {
    console.error("Stripe Connect error:", error);
    return NextResponse.json(
      { error: "Failed to create Stripe account" },
      { status: 500 }
    );
  }
}
