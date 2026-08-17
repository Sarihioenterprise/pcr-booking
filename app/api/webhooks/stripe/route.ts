import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { fireGHLEvent, addTag, createOrUpdateContact } from "@/lib/ghl";
import { addBusinessDays } from "@/lib/business-days";

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

// Explicit price-ID -> plan map. Authoritative: env vars are the source of truth,
// so monthly/annual price IDs both resolve to the correct base plan tier.
function priceIdToPlan(priceId: string | undefined): string | null {
  if (!priceId) return null;
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_GROWTH ?? ""]: "growth",
    [process.env.STRIPE_PRICE_PRO ?? ""]: "pro",
    [process.env.STRIPE_PRICE_SCALE ?? ""]: "scale",
    [process.env.STRIPE_PRICE_FLEET ?? ""]: "fleet",
    [process.env.STRIPE_GROWTH_ANNUAL_PRICE_ID ?? ""]: "growth",
    [process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? ""]: "pro",
    [process.env.STRIPE_SCALE_ANNUAL_PRICE_ID ?? ""]: "scale",
    [process.env.STRIPE_FLEET_ANNUAL_PRICE_ID ?? ""]: "fleet",
  };
  delete map[""];
  return map[priceId] ?? null;
}

// Normalize a Stripe lookup_key (e.g. "pro_annual") down to its base plan tier.
function lookupKeyToPlan(lookupKey: string | null | undefined): string | null {
  if (!lookupKey) return null;
  const base = lookupKey.replace(/_(annual|monthly|yearly)$/, "");
  return base === "growth" || base === "pro" || base === "scale" || base === "fleet" ? base : null;
}

function getPlanFromSubscription(subscription: Stripe.Subscription): string {
  const price = subscription.items.data[0]?.price;
  const priceId = price?.id;

  // 1) Price ID is the most reliable signal — matches our configured env vars.
  const byPriceId = priceIdToPlan(priceId);
  if (byPriceId) return byPriceId;

  // 2) Fall back to lookup_key (now set on all prices in Stripe).
  const byLookupKey = lookupKeyToPlan(price?.lookup_key);
  if (byLookupKey) return byLookupKey;

  // 3) Nothing matched — this is a real misconfiguration. Log loudly and keep
  //    "growth" only as a last resort so the customer still gets access.
  console.error(
    `[stripe-webhook] UNMAPPED PRICE: could not resolve plan for price_id=${priceId} ` +
      `lookup_key=${price?.lookup_key ?? "none"} subscription=${subscription.id}. ` +
      `Defaulting to "growth" — verify STRIPE_PRICE_* env vars.`
  );
  return "growth";
}

async function handleSubscriptionUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  stripe: Stripe
) {
  const customerId = subscription.customer as string;
  const plan = getPlanFromSubscription(subscription);

  // Statuses that should revoke dashboard access immediately.
  // Owner requirement: "they should just not have access if their payment doesn't go through, immediately."
  const ACCESS_REVOKED_STATUSES: string[] = ["past_due", "unpaid", "incomplete_expired", "canceled"];
  const accessRevoked = ACCESS_REVOKED_STATUSES.includes(subscription.status);

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

  // Update operator plan + access flag
  // If status is revoking (past_due/unpaid/etc.), null out stripe_subscription_id to block dashboard access.
  // If status is healthy (trialing/active), ensure stripe_subscription_id is set (restore if locked)
  // AND clear any active public page grace deadline.
  //
  // For revoking statuses: set public_grace_deadline_at if not already set.
  // We fetch existing to avoid resetting the clock on repeated subscription.updated events.
  let existingGraceDeadline: string | null = null;
  if (accessRevoked) {
    const { data: existingOpSub } = await supabase
      .from("operators")
      .select("public_grace_deadline_at")
      .eq("stripe_customer_id", customerId)
      .single();
    existingGraceDeadline = existingOpSub?.public_grace_deadline_at ?? null;
  }

  const gracePeriodDeadline = addBusinessDays(new Date(), 7).toISOString();

  const operatorUpdate: Record<string, string | null> = {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: accessRevoked ? null : subscription.id,
    // Revoking: set grace deadline (only if not already set)
    // Restoring: clear grace deadline so public page comes back immediately
    public_grace_deadline_at: accessRevoked
      ? (existingGraceDeadline ?? gracePeriodDeadline)
      : null,
  };

  if (accessRevoked) {
    console.log(`[webhook] Revoking dashboard access for customer ${customerId} — subscription status: ${subscription.status}. Public page deadline: ${operatorUpdate.public_grace_deadline_at}`);
  } else {
    console.log(`[webhook] Restoring access for customer ${customerId} — subscription status: ${subscription.status}. Clearing grace deadline.`);
  }

  const { error: opError, data: updatedOps } = await supabase
    .from("operators")
    .update(operatorUpdate)
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

  // Lock the account — clear stripe_subscription_id so get-operator redirects to subscription-issue page.
  // We do NOT update plan here; the DB constraint forbids 'free' and we keep the previous plan value
  // so the operator still knows what tier they were on when they recover payment.
  //
  // Stage 2 (public page grace period): set public_grace_deadline_at = now + 7 business days.
  // The public booking page will go dark once now() > that deadline.
  // We use COALESCE logic in JS: only set the deadline if it's not already set
  // (so repeated failed invoices don't reset the clock and extend the deadline).
  const gracePeriodDeadline = addBusinessDays(new Date(), 7).toISOString();

  // First fetch existing deadline so we don't reset the clock on repeat failures.
  const { data: existingOp } = await supabase
    .from("operators")
    .select("public_grace_deadline_at")
    .eq("stripe_customer_id", customerId)
    .single();

  const { error, data: updatedOps } = await supabase
    .from("operators")
    .update({
      stripe_subscription_id: null,
      // Only set the deadline if it hasn't been set yet — prevents repeated payment
      // failures from pushing the deadline further out.
      public_grace_deadline_at: existingOp?.public_grace_deadline_at ?? gracePeriodDeadline,
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (error) {
    console.error("Failed to lock account after payment failure:", error);
  } else {
    console.log(`Account locked for customer ${customerId}. Public page deadline: ${updatedOps?.[0]?.public_grace_deadline_at ?? gracePeriodDeadline}`);
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

  // Restore access — re-link subscription so get-operator lets them in.
  // Also clear public_grace_deadline_at so the public booking page comes back up immediately.
  // We update ALL matching operators (not just locked ones) to handle edge cases where
  // the subscription_id was already set but the grace deadline was still ticking.
  const { error } = await supabase
    .from("operators")
    .update({
      stripe_subscription_id: subscriptionId,
      public_grace_deadline_at: null, // clear grace period — page comes back immediately
    })
    .eq("stripe_customer_id", customerId);

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

  // Revoke dashboard access: null out stripe_subscription_id so the gate blocks them.
  // Keep their plan value for reference (they can see what they had when they recover).
  // Note: public booking pages (/book/[slug]) do NOT use getOperator() so renters are unaffected
  // until the 7-business-day grace period expires.
  //
  // Also set public_grace_deadline_at if not already set (subscription.deleted fires after
  // invoice.payment_failed in the dunning flow, but may also fire standalone for cancellations).
  const gracePeriodDeadline = addBusinessDays(new Date(), 7).toISOString();

  const { data: existingOpDel } = await supabase
    .from("operators")
    .select("public_grace_deadline_at")
    .eq("stripe_customer_id", customerId)
    .single();

  const { error: opError, data: updatedOps } = await supabase
    .from("operators")
    .update({
      plan: "growth",
      stripe_subscription_id: null,
      public_grace_deadline_at: existingOpDel?.public_grace_deadline_at ?? gracePeriodDeadline,
    })
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
