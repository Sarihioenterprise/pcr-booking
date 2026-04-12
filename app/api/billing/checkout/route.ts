import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const PRICE_IDS: Record<string, string> = {
  growth: process.env.STRIPE_PRICE_GROWTH!,
  pro: process.env.STRIPE_PRICE_PRO!,
  scale: process.env.STRIPE_PRICE_SCALE!,
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || "price_annual_growth_placeholder",
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_annual_pro_placeholder",
  scale_annual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || "price_annual_scale_placeholder",
};

const PLAN_VALUES: Record<string, number> = {
  growth: 79,
  pro: 149,
  scale: 249,
  growth_annual: 790,
  pro_annual: 1490,
  scale_annual: 2490,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, billing, referral } = await req.json();

    // Support annual billing: plan key becomes e.g. "growth_annual"
    const billingPeriod = billing === "annual" ? "annual" : "monthly";
    const planKey = billingPeriod === "annual" ? `${plan}_annual` : plan;

    if (!plan || !PRICE_IDS[planKey]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";
    const stripeKey = process.env.STRIPE_SECRET_KEY!;

    const planValue = PLAN_VALUES[planKey] ?? 79;
    const thankYouUrl = `${appUrl}/thank-you?plan=${plan}&billing=${billingPeriod}&value=${planValue}`;

    // Use native fetch instead of Stripe SDK to avoid connection issues in Vercel serverless
    const bodyParams: Record<string, string> = {
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": PRICE_IDS[planKey],
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "14",
      success_url: thankYouUrl,
      cancel_url: `${appUrl}/onboarding/plan`,
      "metadata[user_id]": user.id,
      "metadata[plan]": plan,
      "metadata[billing]": billingPeriod,
    };

    // Attach Rewardful referral for affiliate tracking
    if (referral) {
      bodyParams.client_reference_id = referral;
    }

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2025-02-24.acacia",
      },
      body: new URLSearchParams(bodyParams).toString(),
    });

    const session = await response.json() as { url?: string; error?: { message: string } };

    if (!response.ok || session.error) {
      console.error("[billing/checkout] Stripe error:", session.error);
      return NextResponse.json(
        { error: session.error?.message || "Stripe error" },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[billing/checkout] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
