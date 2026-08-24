import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${APP_URL}/auth/login`);

  const { data: operator } = await supabase
    .from("operators")
    .select("id, business_email, stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  if (!operator) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Create Stripe customer if needed
  let customerId = operator.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: operator.business_email });
    customerId = customer.id;
    const admin = createAdminClient();
    await admin.from("operators").update({ stripe_customer_id: customerId }).eq("id", operator.id);
  }

  // Stripe Checkout in setup mode — collects card, no charge
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    success_url: `${APP_URL}/api/billing/checkout-free/success?session_id={CHECKOUT_SESSION_ID}&operator_id=${operator.id}`,
    cancel_url: `${APP_URL}/onboarding/plan`,
    metadata: { operatorId: operator.id },
  });

  return NextResponse.redirect(session.url!);
}
