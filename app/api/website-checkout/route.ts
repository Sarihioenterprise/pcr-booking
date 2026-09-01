import { NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";

export async function POST() {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";
    const stripeKey = process.env.STRIPE_SECRET_KEY!;

    const body = new URLSearchParams({
      mode: "payment",
      "payment_method_types[0]": "card",
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": "99700",
      "line_items[0][price_data][product_data][name]": "Professional Website Build",
      "line_items[0][price_data][product_data][description]":
        "Custom rental car business website — live within 24–72 hours",
      "line_items[0][quantity]": "1",
      success_url: `${appUrl}/dashboard/website/success`,
      cancel_url: `${appUrl}/dashboard/website`,
      ...(operator.email ? { customer_email: operator.email } : {}),
      "metadata[operator_id]": operator.id,
      "metadata[business_name]": operator.business_name ?? "",
      "metadata[product]": "website_build",
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

    const data = await response.json() as { url?: string; error?: { message: string } };

    if (!response.ok || data.error) {
      console.error("[website-checkout] Stripe error:", data.error);
      return NextResponse.json({ error: data.error?.message || "Stripe error" }, { status: 400 });
    }

    return NextResponse.json({ url: data.url });
  } catch (err: unknown) {
    console.error("[website-checkout] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
