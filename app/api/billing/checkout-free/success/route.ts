import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  const operatorId = searchParams.get("operator_id");

  if (!sessionId || !operatorId) return NextResponse.redirect(`${APP_URL}/onboarding/plan`);

  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.status === "complete") {
    const admin = createAdminClient();
    await admin
      .from("operators")
      .update({
        stripe_subscription_id: "free_card_on_file",
        stripe_customer_id: session.customer as string,
      })
      .eq("id", operatorId);
    return NextResponse.redirect(`${APP_URL}/dashboard`);
  }

  return NextResponse.redirect(`${APP_URL}/onboarding/plan`);
}
