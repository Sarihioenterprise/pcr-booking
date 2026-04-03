import { NextRequest, NextResponse } from "next/server";

const PRICE_IDS: Record<string, string> = {
  growth: process.env.STRIPE_PRICE_GROWTH!,
  pro: process.env.STRIPE_PRICE_PRO!,
  scale: process.env.STRIPE_PRICE_SCALE!,
};

export async function POST(req: NextRequest) {
  try {
    const { plan } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";
    const stripeKey = process.env.STRIPE_SECRET_KEY!;

    // Use native fetch instead of Stripe SDK to avoid connection issues in Vercel serverless
    const body = new URLSearchParams({
      mode: "subscription",
      "payment_method_types[0]": "card",
      "line_items[0][price]": PRICE_IDS[plan],
      "line_items[0][quantity]": "1",
      "subscription_data[trial_period_days]": "14",
      success_url: `${appUrl}/auth/signup?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: `${appUrl}/pricing`,
      "metadata[plan]": plan,
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
