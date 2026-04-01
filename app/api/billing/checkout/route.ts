import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

const PRICE_IDS: Record<string, string> = {
  growth: process.env.STRIPE_PRICE_GROWTH!,
  pro: process.env.STRIPE_PRICE_PRO!,
  scale: process.env.STRIPE_PRICE_SCALE!,
};

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, referral } = await req.json();

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const stripe = getStripe();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";

    const sessionParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
      success_url: `${appUrl}/dashboard/settings?tab=subscription&success=1`,
      cancel_url: `${appUrl}/dashboard/settings?tab=subscription`,
      customer_creation: "always",
      metadata: {
        user_id: user.id,
        plan,
      },
    };

    // Attach Rewardful referral for affiliate tracking
    if (referral) {
      sessionParams.client_reference_id = referral;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[billing/checkout] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
