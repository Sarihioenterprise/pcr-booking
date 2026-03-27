import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Stripe signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(supabase, subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }
      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Stripe webhook processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const priceId = subscription.items.data[0]?.price?.id;
  const lookupKey = subscription.items.data[0]?.price?.lookup_key;
  // Map by lookup_key or fall back to a default
  if (lookupKey === "scale" || lookupKey === "pro" || lookupKey === "growth") {
    return lookupKey;
  }
  // Fallback: log the price ID for debugging
  console.log("Unknown price mapping for:", priceId);
  return "growth";
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const plan = getPlanFromSubscription(subscription);

  // Upsert into subscriptions table
  const { error: subError } = await supabase.from("subscriptions").upsert(
    {
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      stripe_price_id: subscription.items.data[0]?.price?.id ?? "",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" }
  );

  if (subError) {
    console.error("Failed to upsert subscription:", subError);
  }

  // Update operator plan
  const { error: opError } = await supabase
    .from("operators")
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
    })
    .eq("stripe_customer_id", customerId);

  if (opError) {
    console.error("Failed to update operator plan:", opError);
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;

  const { error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("stripe_subscription_id", subscription.id);

  if (subError) {
    console.error("Failed to mark subscription canceled:", subError);
  }

  // Downgrade operator to growth plan
  const { error: opError } = await supabase
    .from("operators")
    .update({ plan: "growth" })
    .eq("stripe_customer_id", customerId);

  if (opError) {
    console.error("Failed to downgrade operator plan:", opError);
  }
}
