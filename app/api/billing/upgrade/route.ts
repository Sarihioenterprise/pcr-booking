/**
 * POST /api/billing/upgrade
 * Upgrades (or downgrades) an operator's Stripe subscription to a new plan tier.
 * Uses Stripe proration so the charge is immediate and accurate.
 *
 * Body: { plan: "growth" | "pro" | "scale" | "fleet", billing?: "monthly" | "annual" }
 * Returns: { success: true, plan: string } or { error: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";
import { PLAN_VEHICLE_LIMITS } from "@/lib/plan-tier";

const PRICE_IDS: Record<string, string | undefined> = {
  growth: process.env.STRIPE_PRICE_GROWTH,
  pro: process.env.STRIPE_PRICE_PRO,
  scale: process.env.STRIPE_PRICE_SCALE,
  fleet: process.env.STRIPE_PRICE_FLEET,
  growth_annual: process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID,
  pro_annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID,
  scale_annual: process.env.STRIPE_SCALE_ANNUAL_PRICE_ID,
  fleet_annual: process.env.STRIPE_FLEET_ANNUAL_PRICE_ID,
};

const VALID_PLANS = ["growth", "pro", "scale", "fleet"] as const;
type Plan = typeof VALID_PLANS[number];

export async function POST(req: NextRequest) {
  try {
    const operator = await getOperator();

    if (!operator.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    const { plan, billing = "monthly" } = await req.json();

    if (!VALID_PLANS.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const planKey = billing === "annual" ? `${plan}_annual` : plan;
    const newPriceId = PRICE_IDS[planKey];

    if (!newPriceId) {
      return NextResponse.json(
        { error: `No price configured for plan: ${planKey}. Contact support.` },
        { status: 400 }
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY!;

    // ── Fetch current subscription from Stripe ────────────────────────────────
    const subRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${operator.stripe_subscription_id}`,
      {
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Stripe-Version": "2025-02-24.acacia",
        },
      }
    );
    const subscription = await subRes.json() as {
      id: string;
      items: { data: { id: string; price: { id: string } }[] };
      status: string;
      error?: { message: string };
    };

    if (!subRes.ok || subscription.error) {
      console.error("[billing/upgrade] Stripe subscription fetch error:", subscription.error);
      return NextResponse.json(
        { error: subscription.error?.message || "Failed to fetch subscription" },
        { status: 400 }
      );
    }

    const subscriptionItemId = subscription.items.data[0]?.id;
    if (!subscriptionItemId) {
      return NextResponse.json({ error: "Could not find subscription item" }, { status: 400 });
    }

    // ── Downgrade guard: if they have more vehicles than the target plan allows, block ──
    if ((plan as Plan) !== operator.plan) {
      const targetLimit = PLAN_VEHICLE_LIMITS[plan as Plan] ?? 15;
      if (targetLimit !== Infinity) {
        const supabase = createAdminClient();
        const { count } = await supabase
          .from("vehicles")
          .select("id", { count: "exact", head: true })
          .eq("operator_id", operator.id);
        if ((count ?? 0) > targetLimit) {
          return NextResponse.json(
            {
              error: `Cannot downgrade to ${plan}: you have ${count} vehicles but the ${plan} plan allows ${targetLimit}. Remove vehicles first.`,
              downgrade_blocked: true,
              vehicle_count: count,
              plan_limit: targetLimit,
            },
            { status: 422 }
          );
        }
      }
    }

    // ── Update subscription item with new price (with proration) ─────────────
    const updateBody = new URLSearchParams({
      "items[0][id]": subscriptionItemId,
      "items[0][price]": newPriceId,
      proration_behavior: "create_prorations",
      "payment_behavior": "default_incomplete",
    });

    const updateRes = await fetch(
      `https://api.stripe.com/v1/subscriptions/${operator.stripe_subscription_id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Stripe-Version": "2025-02-24.acacia",
        },
        body: updateBody.toString(),
      }
    );

    const updatedSub = await updateRes.json() as { id: string; status: string; error?: { message: string } };

    if (!updateRes.ok || updatedSub.error) {
      console.error("[billing/upgrade] Stripe update error:", updatedSub.error);
      return NextResponse.json(
        { error: updatedSub.error?.message || "Failed to update subscription" },
        { status: 400 }
      );
    }

    // ── Update operator plan in DB immediately ────────────────────────────────
    const supabase = createAdminClient();
    await supabase
      .from("operators")
      .update({ plan })
      .eq("id", operator.id);

    console.log(`[billing/upgrade] Upgraded operator ${operator.id} from ${operator.plan} to ${plan}`);

    return NextResponse.json({ success: true, plan });
  } catch (err: unknown) {
    console.error("[billing/upgrade] error:", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
