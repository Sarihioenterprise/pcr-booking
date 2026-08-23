import { NextRequest, NextResponse } from "next/server";
import { generateEventId } from "@/lib/meta-capi";

const PRICE_IDS: Record<string, string> = {
  growth: process.env.STRIPE_PRICE_GROWTH!,
  pro: process.env.STRIPE_PRICE_PRO!,
  scale: process.env.STRIPE_PRICE_SCALE!,
  fleet: process.env.STRIPE_PRICE_FLEET!,
  // Annual price IDs: env vars are confirmed set in Vercel production.
  // Fallback strings are intentionally invalid ("price_annual_*_placeholder") so
  // if an env var is ever missing, Stripe will reject the price ID with a clear error
  // rather than silently charging the wrong plan.
  // DO NOT use empty string as fallback — that would cause PRICE_IDS[planKey] to be "",
  // which bypasses the !PRICE_IDS[planKey] guard below.
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID || "price_annual_growth_placeholder",
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID || "price_annual_pro_placeholder",
  scale_annual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID || "price_annual_scale_placeholder",
  fleet_annual: process.env.STRIPE_FLEET_ANNUAL_PRICE_ID || "price_annual_fleet_placeholder",
};

const PLAN_VALUES: Record<string, number> = {
  growth: 79,
  pro: 149,
  scale: 249,
  fleet: 499,
  growth_annual: 790,
  pro_annual: 1490,
  scale_annual: 2490,
  fleet_annual: 4990,
};

export async function POST(req: NextRequest) {
  try {
    const { plan, billing } = await req.json();

    const billingPeriod = billing === "annual" ? "annual" : "monthly";
    const planKey = billingPeriod === "annual" ? `${plan}_annual` : plan;

    if (!plan || !PRICE_IDS[planKey]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";
    const stripeKey = process.env.STRIPE_SECRET_KEY!;
    const planValue = PLAN_VALUES[planKey] ?? 79;

    // Generate a unique event_id for Meta CAPI deduplication.
    // This ID is shared between the browser pixel Purchase event (fired on /thank-you)
    // and the server-side CAPI Purchase event (fired from the Stripe webhook on
    // customer.subscription.created). Meta deduplicates both into one conversion.
    const capiEventId = generateEventId("trial");

    // Use native fetch instead of Stripe SDK to avoid connection issues in Vercel serverless
    const body = new URLSearchParams({
      mode: "subscription",
      "payment_method_types[0]": "card",
      "payment_method_collection": "always", // Card required even during trial
      "line_items[0][price]": PRICE_IDS[planKey],
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "14",
      // Pass capi_event_id in subscription metadata so the webhook can retrieve it
      // for server-side CAPI deduplication.
      "subscription_data[metadata][capi_event_id]": capiEventId,
      "subscription_data[metadata][plan]": plan,
      "subscription_data[metadata][billing]": billingPeriod,
      success_url: `${appUrl}/auth/signup?session_id={CHECKOUT_SESSION_ID}&plan=${plan}&billing=${billingPeriod}&value=${planValue}&eid=${capiEventId}`,
      cancel_url: `${appUrl}/pricing`,
      "metadata[plan]": plan,
      "metadata[billing]": billingPeriod,
      "metadata[capi_event_id]": capiEventId,
    });

    const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2025-02-24.acacia",
      },
      body: body.toString(),
    });

    const session = await response.json() as { url?: string; error?: { message: string } };

    if (!response.ok || session.error) {
      console.error("[billing/checkout-public] Stripe error:", session.error);
      return NextResponse.json(
        { error: session.error?.message || "Stripe error" },
        { status: 400 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[billing/checkout-public] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
