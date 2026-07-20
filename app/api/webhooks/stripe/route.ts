import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { fireGHLEvent, addTag, createOrUpdateContact } from "@/lib/ghl";

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
        await handleSubscriptionUpsert(supabase, subscription, stripe);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(supabase, invoice);
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
  subscription: Stripe.Subscription,
  stripe: Stripe
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
  const { error: opError, data: updatedOps } = await supabase
    .from("operators")
    .update({
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (opError) {
    console.error("Failed to update operator plan:", opError);
  }

  let operator = updatedOps?.[0];

  // If no operator matched by customer ID, try email fallback
  if (!operator) {
    try {
      const stripeCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      if (stripeCustomer.email) {
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const matchedUser = authUsers?.users?.find(u => u.email === stripeCustomer.email);
        if (matchedUser) {
          const { data: updated } = await supabase
            .from("operators")
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            })
            .eq("user_id", matchedUser.id)
            .select()
            .single();
          operator = updated;
          console.log(`[webhook] Linked subscription via email fallback for ${stripeCustomer.email}`);
        }
      }
    } catch (e) {
      console.error("[webhook] Email fallback failed:", e);
    }
  }

  // Fire GHL event if subscription is active or trialing (fire and forget)
  if (
    operator &&
    (subscription.status === "active" || subscription.status === "trialing")
  ) {
    const amount = subscription.items.data[0]?.price?.unit_amount
      ? (subscription.items.data[0].price.unit_amount / 100).toFixed(2)
      : "0.00";
    const note = `Subscribed to ${plan} plan at $${amount}/month on ${new Date().toLocaleDateString()}`;
    fireGHLEvent(
      operator,
      "pcr-booking-paid",
      note,
      [`plan-${plan}`]
    ).catch((err) => console.error("[GHL] subscription event failed:", err));
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Lock the account — set stripe_subscription_id to null so get-operator redirects to plan page
  const { error, data: updatedOps } = await supabase
    .from("operators")
    .update({
      stripe_subscription_id: null,
      plan: "free",
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (error) {
    console.error("Failed to lock account after payment failure:", error);
  } else {
    console.log(`Account locked for customer ${customerId} due to payment failure`);
    // Fire GHL event for payment failure (fire and forget)
    const operator = updatedOps?.[0];
    if (operator) {
      const amount = invoice.amount_due
        ? (invoice.amount_due / 100).toFixed(2)
        : "unknown";
      const note = `Payment failed for ${amount}. Subscription paused.`;
      fireGHLEvent(operator, "payment-failed", note).catch((err) =>
        console.error("[GHL] payment failed event failed:", err)
      );
    }
  }
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  const subscriptionId = invoice.subscription as string;
  if (!customerId || !subscriptionId) return;

  // Restore access — re-link subscription so get-operator lets them in
  const { error } = await supabase
    .from("operators")
    .update({ stripe_subscription_id: subscriptionId })
    .eq("stripe_customer_id", customerId)
    .is("stripe_subscription_id", null); // only restore if it was locked

  if (error) {
    console.error("Failed to restore account after payment success:", error);
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
  const { error: opError, data: updatedOps } = await supabase
    .from("operators")
    .update({ plan: "growth" })
    .eq("stripe_customer_id", customerId)
    .select();

  if (opError) {
    console.error("Failed to downgrade operator plan:", opError);
  } else {
    // Fire GHL event for subscription cancellation (fire and forget)
    const operator = updatedOps?.[0];
    if (operator) {
      const note = `Cancelled PCR Booking subscription on ${new Date().toLocaleDateString()}`;
      fireGHLEvent(operator, "pcr-booking-churned", note).catch((err) =>
        console.error("[GHL] subscription cancelled event failed:", err)
      );
    }
  }
}
