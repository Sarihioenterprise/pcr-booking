import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { fireGHLEvent, syncTrialActivated, syncConverted, syncPaymentFailed, syncChurned } from "@/lib/ghl";
import { addBusinessDays } from "@/lib/business-days";
import { capiStartTrial, capiSubscribe, capiPurchase, generateEventId } from "@/lib/meta-capi";

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
      case "customer.subscription.created": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(supabase, subscription, stripe, true);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpsert(supabase, subscription, stripe, false);
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
      // NOTE: Alton must enable `customer.subscription.trial_will_end` in the Stripe
      // dashboard under Webhooks → your endpoint → Events to receive this event.
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleTrialWillEnd(supabase, subscription, stripe);
        break;
      }
      case "account.updated": {
        const account = event.data.object as Stripe.Account;
        const accountId = account.id;

        // Find the operator with this stripe_account_id (Connect onboarding)
        const { data: operator } = await supabase
          .from("operators")
          .select("id")
          .eq("stripe_account_id", accountId)
          .single();

        if (operator) {
          await supabase.from("operators").update({
            charges_enabled: account.charges_enabled,
            payouts_enabled: account.payouts_enabled,
            stripe_connect_status: account.details_submitted
              ? (account.charges_enabled ? "active" : "pending_review")
              : "incomplete",
            updated_at: new Date().toISOString(),
          }).eq("id", operator.id);
          console.log(`[webhook] account.updated synced for stripe_account_id=${accountId}: charges_enabled=${account.charges_enabled}, details_submitted=${account.details_submitted}`);
        } else {
          console.log(`[webhook] account.updated: no operator found for stripe_account_id=${accountId}`);
        }
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
  stripe: Stripe,
  isNewSubscription = false
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

  // ── Meta CAPI: StartTrial + Purchase (deduplicated) ───────────────────────
  // Fire on subscription.created (new trial) only — not on subsequent updates.
  // The capi_event_id from subscription metadata is shared with the browser pixel
  // Purchase event so Meta can deduplicate both into one conversion.
  // We fire BOTH StartTrial (trial-specific signal) AND Purchase (main conversion
  // event, deduplicated with browser /thank-you page if eid was in the success URL).
  if (isNewSubscription && subscription.status === "trialing") {
    const capiEventId = (subscription.metadata?.capi_event_id as string | undefined) || generateEventId("trial");
    const planTier = getPlanFromSubscription(subscription);
    const planValue = subscription.items.data[0]?.price?.unit_amount
      ? subscription.items.data[0].price.unit_amount / 100
      : 0;
    const billingInterval = subscription.items.data[0]?.price?.recurring?.interval;
    const annualSuffix = billingInterval === "year" ? " Annual" : " Monthly";
    const planName = `${planTier.charAt(0).toUpperCase() + planTier.slice(1)}${annualSuffix}`;

    // Fetch customer email for user matching
    let customerEmail: string | null = null;
    try {
      const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
      customerEmail = customer.email ?? null;
    } catch { /* non-fatal */ }

    // Fire StartTrial (trial-specific signal — use a fresh ID, not deduplicated)
    capiStartTrial({
      eventId: generateEventId("starttrial"),
      email: customerEmail,
      value: planValue,
      planName,
    }).catch((err) => console.error("[CAPI] StartTrial failed:", err));

    // Fire Purchase (main conversion — deduplicated with browser thank-you event)
    // For new users (checkout-public → auth/signup), the browser does NOT fire a
    // Purchase event, so CAPI Purchase fires standalone.
    // For existing users (checkout → /thank-you), the browser fires Purchase with
    // the same eid, and Meta deduplicates them into one conversion.
    capiPurchase({
      eventId: capiEventId,
      email: customerEmail,
      value: planValue,
      planName,
      orderId: subscription.id,
    }).catch((err) => console.error("[CAPI] Purchase (trial) failed:", err));
  }

  // ── GHL CRM: lifecycle sync ─────────────────────────────────────────────
  // Only act on new subscriptions here; payment events are handled in invoice handlers.
  if (isNewSubscription && (subscription.status === "trialing" || subscription.status === "active")) {
    try {
      // Fetch customer email (best-effort; may already have been fetched for CAPI above)
      let ghlEmail: string | null = null;
      try {
        const ghlCustomer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        ghlEmail = ghlCustomer.email ?? null;
      } catch { /* non-fatal */ }

      if (operator && ghlEmail) {
        const billingInterval = subscription.items.data[0]?.price?.recurring?.interval;
        const unitAmount = subscription.items.data[0]?.price?.unit_amount ?? 0;
        // MRR in USD: monthly = price/100, annual = price/100/12
        const mrr = billingInterval === "year"
          ? Math.round((unitAmount / 100 / 12) * 100) / 100
          : unitAmount / 100;
        const interval: "monthly" | "annual" = billingInterval === "year" ? "annual" : "monthly";
        const trialEndTs = subscription.trial_end;
        const trialEndDate = trialEndTs ? new Date(trialEndTs * 1000).toISOString().slice(0, 10) : undefined;

        const opContact = {
          id: operator.id as string | undefined,
          email: ghlEmail,
          owner_name: operator.owner_name as string | undefined,
          business_name: operator.business_name as string | undefined,
          phone: operator.phone as string | null | undefined,
          booking_slug: operator.booking_slug as string | null | undefined,
          created_at: operator.created_at as string | undefined,
        };

        if (subscription.status === "trialing") {
          // Card captured, free trial activated
          syncTrialActivated(opContact, { planTier: plan, interval, mrr, trialEndDate })
            .catch((err) => console.error("[GHL] syncTrialActivated failed:", err));

          // Kick off nurture sequence: upsert GHL contact then insert nurture row
          void (async () => {
            try {
              const { upsertContact } = await import("@/lib/ghl");
              const ghlContact = await upsertContact({
                email: ghlEmail,
                firstName: opContact.owner_name?.split(" ")[0],
                lastName: opContact.owner_name?.split(" ").slice(1).join(" ") || undefined,
                phone: opContact.phone ?? undefined,
                companyName: opContact.business_name ?? undefined,
              });
              const nameParts = (opContact.owner_name ?? "").trim().split(" ");
              await supabase.from("pcr_booking_nurture").upsert({
                email: ghlEmail,
                first_name: nameParts[0] || null,
                ghl_contact_id: ghlContact?.id ?? null,
                trial_started_at: new Date().toISOString(),
                emails_sent: [],
              }, { onConflict: "email" });
              console.log(`[nurture] Nurture row created for ${ghlEmail}`);
            } catch (err) {
              console.error("[nurture] Failed to create nurture row (non-fatal):", err);
            }
          })();
        } else if (subscription.status === "active") {
          // Direct activation (no trial) — immediate paying customer
          syncConverted(opContact, { planTier: plan, interval, mrr })
            .catch((err) => console.error("[GHL] syncConverted (direct) failed:", err));
        }
      }
    } catch (err) {
      // Never let GHL errors surface to the webhook response
      console.error("[GHL] subscription upsert GHL block failed (non-fatal):", err);
    }
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  // Lock the account — clear stripe_subscription_id so get-operator redirects to /subscription-issue page.
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
    // ── GHL CRM: payment failed lifecycle event ──────────────────────────
    const operator = updatedOps?.[0];
    if (operator) {
      try {
        let ghlEmail: string | null = null;
        try {
          const ghlStripe = getStripe();
          const ghlCustomer = await ghlStripe.customers.retrieve(customerId) as Stripe.Customer;
          ghlEmail = ghlCustomer.email ?? null;
        } catch { /* non-fatal */ }

        if (ghlEmail) {
          syncPaymentFailed({
            id: operator.id as string | undefined,
            email: ghlEmail,
            owner_name: operator.owner_name as string | undefined,
            business_name: operator.business_name as string | undefined,
            phone: operator.phone as string | null | undefined,
            booking_slug: operator.booking_slug as string | null | undefined,
          }).catch((err) => console.error("[GHL] syncPaymentFailed failed:", err));
        }
      } catch (err) {
        console.error("[GHL] payment failed GHL block (non-fatal):", err);
      }
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
  const { error, data: restoredOps } = await supabase
    .from("operators")
    .update({
      stripe_subscription_id: subscriptionId,
      public_grace_deadline_at: null, // clear grace period — page comes back immediately
    })
    .eq("stripe_customer_id", customerId)
    .select();

  if (error) {
    console.error("Failed to restore account after payment success:", error);
  }

  // ── Meta CAPI: Subscribe (first real payment) or Purchase (recurring) ─────
  // Skip $0 invoices (trial start invoices). Only track real money events.
  // billing_reason values:
  //   subscription_create → first invoice when subscription created (often $0 trial)
  //   subscription_cycle  → recurring invoice (trial conversion OR subsequent)
  // For Subscribe: fire when trial converts (subscription_cycle, first paid)
  // For Purchase: fire on subsequent subscription_cycle invoices
  // We detect "first paid" by listing paid invoices for this subscription.
  const amountPaid = invoice.amount_paid ?? 0;
  const billingReason = invoice.billing_reason;

  if (amountPaid > 0 && (billingReason === "subscription_cycle" || billingReason === "subscription_create")) {
    try {
      const stripe = getStripe();

      // Fetch customer email
      let customerEmail: string | null = null;
      try {
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        customerEmail = customer.email ?? null;
      } catch { /* non-fatal */ }

      // Get plan name from subscription
      let planName = "PCR Booking";
      let planTier = "growth";
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        planTier = (() => {
          // Reuse price ID -> plan mapping via env vars
          const priceId = sub.items.data[0]?.price?.id;
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
          return map[priceId ?? ""] ?? "growth";
        })();
        const billingInterval = sub.items.data[0]?.price?.recurring?.interval;
        const annualSuffix = billingInterval === "year" ? " Annual" : " Monthly";
        planName = `${planTier.charAt(0).toUpperCase() + planTier.slice(1)}${annualSuffix}`;
      } catch { /* non-fatal */ }

      const valueUsd = amountPaid / 100;
      const orderId = invoice.id;
      const eventId = generateEventId("invoice");
      const operator = restoredOps?.[0];

      if (billingReason === "subscription_create") {
        // First-ever invoice (immediate paid subscription, no trial) → Subscribe
        capiSubscribe({
          eventId,
          email: customerEmail,
          value: valueUsd,
          planName,
          orderId,
        }).catch((err) => console.error("[CAPI] Subscribe failed:", err));
      } else {
        // subscription_cycle: detect first payment after trial vs recurring
        // If this subscription had a trial, the first cycle payment is the Subscribe event.
        // Subsequent cycle payments are Purchase events.
        // We check by counting paid invoices for this subscription.
        let isFirstPayment = false;
        try {
          const paidInvoices = await stripe.invoices.list({
            subscription: subscriptionId,
            status: "paid" as "paid",
            limit: 2,
          });
          isFirstPayment = paidInvoices.data.length === 1;
        } catch { /* non-fatal, default to Purchase */ }

        if (isFirstPayment) {
          // Trial converted to paid — fire Subscribe (CAPI)
          capiSubscribe({
            eventId,
            email: customerEmail,
            value: valueUsd,
            planName,
            orderId,
          }).catch((err) => console.error("[CAPI] Subscribe (trial conversion) failed:", err));

          // GHL CRM: mark as converted customer
          if (operator && customerEmail) {
            // Determine billing interval from the subscription
            let ghlInterval: "monthly" | "annual" = "monthly";
            let ghlMrr = valueUsd;
            try {
              const ghlSub = await stripe.subscriptions.retrieve(subscriptionId);
              const ghlBillingInterval = ghlSub.items.data[0]?.price?.recurring?.interval;
              ghlInterval = ghlBillingInterval === "year" ? "annual" : "monthly";
              const ghlUnitAmount = ghlSub.items.data[0]?.price?.unit_amount ?? 0;
              ghlMrr = ghlInterval === "annual"
                ? Math.round((ghlUnitAmount / 100 / 12) * 100) / 100
                : ghlUnitAmount / 100;
            } catch { /* non-fatal, use invoice amount as fallback */ }

            syncConverted({
              id: operator.id as string | undefined,
              email: customerEmail,
              owner_name: operator.owner_name as string | undefined,
              business_name: operator.business_name as string | undefined,
              phone: operator.phone as string | null | undefined,
              booking_slug: operator.booking_slug as string | null | undefined,
            }, { planTier: planTier, interval: ghlInterval, mrr: ghlMrr })
              .catch((err) => console.error("[GHL] syncConverted (trial) failed:", err));

            // Stop nurture sequence now that they've converted to paid
            void supabase.from("pcr_booking_nurture")
              .update({ stopped_at: new Date().toISOString() })
              .eq("email", customerEmail)
              .is("stopped_at", null)
              .then(() => console.log(`[nurture] Stopped nurture for converted customer ${customerEmail}`));
          }
        } else {
          // Recurring payment — fire Purchase
          capiPurchase({
            eventId,
            email: customerEmail,
            value: valueUsd,
            planName,
            orderId,
          }).catch((err) => console.error("[CAPI] Purchase (recurring) failed:", err));
        }
      }
    } catch (err) {
      // NEVER let tracking errors break the webhook response
      console.error("[CAPI] handlePaymentSucceeded CAPI block failed:", err);
    }
  }
}

async function handleTrialWillEnd(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: Stripe.Subscription,
  stripe: Stripe
) {
  const customerId = subscription.customer as string;
  const trialEnd = subscription.trial_end;
  const trialEndDate = trialEnd
    ? new Date(trialEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "in 3 days";

  // Fetch customer email
  let customerEmail: string | null = null;
  try {
    const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
    customerEmail = customer.email ?? null;
  } catch (e) {
    console.error("[webhook] trial_will_end: failed to retrieve customer:", e);
  }

  if (!customerEmail) {
    console.warn(`[webhook] trial_will_end: no email found for customer ${customerId}`);
    return;
  }

  // Look up operator for context
  const { data: operator } = await supabase
    .from("operators")
    .select("owner_name, business_name, booking_slug")
    .eq("stripe_customer_id", customerId)
    .single();

  const ownerName = (operator?.owner_name as string | undefined) ?? "there";
  const dashboardUrl = "https://pcrbooking.com/dashboard";

  const emailBody = `
<p>Hey ${ownerName},</p>
<p>Your PCR Booking free trial ends on <strong>${trialEndDate}</strong> — 3 days from now.</p>
<p>When your trial ends, your card on file will be charged automatically and you'll continue to have full access to your dashboard, fleet, and booking page with no interruption.</p>
<p><strong>No action needed</strong> — everything is already set up. Just keep using it.</p>
<p>If you have any questions about billing or your plan, reply to this email and we'll sort it out right away.</p>
<p><a href="${dashboardUrl}" style="display:inline-block;background:#2EBD6B;color:#fff;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;margin:8px 0;">Go to My Dashboard →</a></p>
<p style="color:#6b7280;font-size:14px;">Questions? Email us at <a href="mailto:support@pcrbooking.com" style="color:#2EBD6B;">support@pcrbooking.com</a> — we're happy to help.</p>
<p>— The PCR Booking Team</p>
  `.trim();

  // Send trial warning email via internal API
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://pcrbooking.com";
    await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: customerEmail,
        subject: "Your PCR Booking trial ends in 3 days",
        body: emailBody,
        templateType: "trial_will_end",
      }),
    });
    console.log(`[webhook] trial_will_end: warning email sent to ${customerEmail}`);
  } catch (err) {
    console.error("[webhook] trial_will_end: email send failed:", err);
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
    // ── GHL CRM: churned lifecycle event ─────────────────────────────────
    const operator = updatedOps?.[0];
    if (operator) {
      try {
        let ghlEmail: string | null = null;
        try {
          const ghlStripe = getStripe();
          const ghlCust = await ghlStripe.customers.retrieve(customerId) as Stripe.Customer;
          ghlEmail = ghlCust.email ?? null;
        } catch { /* non-fatal */ }

        if (ghlEmail) {
          // `plan` comes from getPlanFromSubscription above but subscription is already deleted;
          // use updatedOps plan field as fallback for the plan tag removal.
          const churnedPlan = (operator.plan as string | undefined) ?? undefined;
          syncChurned({
            id: operator.id as string | undefined,
            email: ghlEmail,
            owner_name: operator.owner_name as string | undefined,
            business_name: operator.business_name as string | undefined,
            phone: operator.phone as string | null | undefined,
            booking_slug: operator.booking_slug as string | null | undefined,
          }, { planTier: churnedPlan }).catch((err) => console.error("[GHL] syncChurned failed:", err));
        }
      } catch (err) {
        console.error("[GHL] churn GHL block (non-fatal):", err);
      }
    }
  }
}
