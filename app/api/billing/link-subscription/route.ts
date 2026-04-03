import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const customer_id = session.customer as string;
    const subscription_id = session.subscription as string;
    const plan = session.metadata?.plan;

    if (!customer_id || !subscription_id) {
      return NextResponse.json(
        { error: "Stripe session missing customer or subscription" },
        { status: 400 }
      );
    }

    const adminSupabase = createAdminClient();

    // Update operator record with Stripe info
    const { error: updateError } = await adminSupabase
      .from("operators")
      .update({
        stripe_customer_id: customer_id,
        stripe_subscription_id: subscription_id,
        plan: plan,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("[link-subscription] update error:", updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Upsert into subscriptions table
    const subscription = await stripe.subscriptions.retrieve(subscription_id);
    const sub = subscription as unknown as {
      status: string;
      current_period_start: number;
      current_period_end: number;
      trial_end: number | null;
    };
    await adminSupabase.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customer_id,
      stripe_subscription_id: subscription_id,
      plan: plan,
      status: sub.status,
      current_period_start: sub.current_period_start
        ? new Date(sub.current_period_start * 1000).toISOString()
        : null,
      current_period_end: sub.current_period_end
        ? new Date(sub.current_period_end * 1000).toISOString()
        : null,
      trial_end: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[billing/link-subscription] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
