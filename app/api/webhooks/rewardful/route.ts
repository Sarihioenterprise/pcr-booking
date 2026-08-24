/**
 * Rewardful Webhook Handler
 *
 * Registers at: https://pcrbooking.com/api/webhooks/rewardful
 * Set this URL in your Rewardful dashboard → Webhooks → New Endpoint.
 *
 * Required env var: REWARDFUL_WEBHOOK_SECRET
 *   → Copy from Rewardful dashboard → Webhooks → [your endpoint] → Signing Secret
 *
 * Events handled:
 *   referral.created    → Insert row in `referrals` table (matched by link token → operator.referral_code)
 *   referral.converted  → Mark referral is_active = true
 *   referral.deleted    → Mark referral is_active = false
 *   commission.created  → Increment total_earned on matching referral
 *   commission.paid     → No-op (already counted on .created; logged for audit)
 *   commission.voided   → Decrement total_earned on matching referral
 *
 * Signature verification:
 *   Header: X-Rewardful-Signature
 *   Method: HMAC-SHA256(rawBody, REWARDFUL_WEBHOOK_SECRET) → hex string
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// ---------------------------------------------------------------------------
// Types (based on Rewardful REST API object shapes)
// ---------------------------------------------------------------------------

interface RewardfulLink {
  id: string;
  url: string;
  token: string;
  leads?: number;
  visitors?: number;
  conversions?: number;
}

interface RewardfulAffiliate {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  links?: RewardfulLink[];
}

interface RewardfulCustomer {
  id: string;
  email: string;
  name?: string;
  platform?: string;
}

interface RewardfulReferral {
  id: string;
  link: RewardfulLink;
  affiliate: RewardfulAffiliate;
  customer: RewardfulCustomer;
  conversion_state: "visitor" | "lead" | "conversion";
  deactivated_at: string | null;
  created_at: string;
  expires_at: string | null;
}

interface RewardfulSale {
  id: string;
  referral: RewardfulReferral;
  affiliate: RewardfulAffiliate;
  charge_amount_cents?: number;
  sale_amount_cents?: number;
}

interface RewardfulCommission {
  id: string;
  amount: number; // in cents
  currency: string;
  state: "due" | "paid" | "voided";
  sale: RewardfulSale;
}

interface RewardfulEvent {
  id: string;
  type: string;
  created_at: string;
  api_version: string;
}

interface RewardfulPayload {
  object: RewardfulReferral | RewardfulCommission | Record<string, unknown>;
  event: RewardfulEvent;
  request: { id: string };
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(signature, "hex"));
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Helper: find operator by referral_code (token) or by email
// ---------------------------------------------------------------------------

async function findOperatorByReferralCode(
  supabase: ReturnType<typeof createAdminClient>,
  token: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("operators")
    .select("id")
    .eq("referral_code", token)
    .single();
  if (error || !data) return null;
  return data.id;
}

async function findOperatorByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("operators")
    .select("id")
    .eq("email", email)
    .single();
  if (error || !data) return null;
  return data.id;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * referral.created / referral.lead / referral.converted
 * Upserts a row in `referrals`.
 */
async function handleReferralUpsert(
  supabase: ReturnType<typeof createAdminClient>,
  referral: RewardfulReferral,
  eventType: string
): Promise<void> {
  const token = referral.link?.token;
  const customerEmail = referral.customer?.email;

  if (!token) {
    console.warn("[rewardful] referral.created: no link token in payload, skipping");
    return;
  }

  const referrerOperatorId = await findOperatorByReferralCode(supabase, token);
  if (!referrerOperatorId) {
    console.warn(`[rewardful] No operator found with referral_code="${token}" — skipping`);
    return;
  }

  // For referral.created the referred user may not have signed up yet (visitor/lead state).
  // We still insert a placeholder row; referred_operator_id fills in when they sign up.
  const referredOperatorId = customerEmail
    ? await findOperatorByEmail(supabase, customerEmail)
    : null;

  const isConversion = referral.conversion_state === "conversion";
  const isActive = referral.deactivated_at === null && isConversion;

  // Upsert by rewardful referral id stored in the `id` column
  // NOTE: If your `referrals.id` is a UUID generated by Supabase, use a separate
  // `rewardful_referral_id` column instead. Here we use the Rewardful id directly
  // as the primary key to enable idempotent upserts.
  const { error } = await supabase
    .from("referrals")
    .upsert(
      {
        id: referral.id,
        referrer_operator_id: referrerOperatorId,
        referred_operator_id: referredOperatorId,
        signup_date: referral.created_at,
        is_active: isActive,
        commission_pct: 30,
        months_remaining: 12,
        total_earned: 0,
      },
      { onConflict: "id", ignoreDuplicates: false }
    );

  if (error) {
    // If the table uses a Supabase auto-generated UUID as PK, the upsert will fail.
    // Fall back to insert-if-not-exists by referrer+referred pair.
    console.warn("[rewardful] upsert by id failed, trying match by referrer+referred:", error.message);
    await supabase.from("referrals").upsert(
      {
        referrer_operator_id: referrerOperatorId,
        referred_operator_id: referredOperatorId,
        signup_date: referral.created_at,
        is_active: isActive,
        commission_pct: 30,
        months_remaining: 12,
        total_earned: 0,
      },
      { onConflict: "referrer_operator_id,referred_operator_id", ignoreDuplicates: true }
    );
  }

  // For conversion events, also ensure is_active = true
  if (eventType === "referral.converted" || isConversion) {
    await supabase
      .from("referrals")
      .update({ is_active: true })
      .eq("referrer_operator_id", referrerOperatorId)
      .not("referred_operator_id", "is", null)
      .eq("referred_operator_id", referredOperatorId ?? "");
  }

  console.log(
    `[rewardful] ${eventType}: referrer=${referrerOperatorId} referred=${referredOperatorId ?? "pending"} state=${referral.conversion_state}`
  );
}

/**
 * referral.deleted — set is_active = false
 */
async function handleReferralDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  referral: RewardfulReferral
): Promise<void> {
  // Try by Rewardful referral id first
  const { error } = await supabase
    .from("referrals")
    .update({ is_active: false })
    .eq("id", referral.id);

  if (error) {
    // Fallback: by email
    const customerEmail = referral.customer?.email;
    if (customerEmail) {
      const referredId = await findOperatorByEmail(supabase, customerEmail);
      if (referredId) {
        await supabase
          .from("referrals")
          .update({ is_active: false })
          .eq("referred_operator_id", referredId);
      }
    }
  }

  console.log(`[rewardful] referral.deleted: id=${referral.id}`);
}

/**
 * commission.created / commission.voided — update total_earned
 */
async function handleCommission(
  supabase: ReturnType<typeof createAdminClient>,
  commission: RewardfulCommission,
  eventType: string
): Promise<void> {
  const referral = commission.sale?.referral;
  if (!referral) {
    console.warn("[rewardful] commission event: no referral in payload, skipping");
    return;
  }

  const token = referral.link?.token;
  const customerEmail = referral.customer?.email;

  // Find referrer
  const referrerOperatorId = token
    ? await findOperatorByReferralCode(supabase, token)
    : null;

  // Amount in dollars (Rewardful amount is in cents)
  const amountDollars = commission.amount / 100;
  const delta = eventType === "commission.voided" ? -amountDollars : amountDollars;

  if (!referrerOperatorId) {
    console.warn(`[rewardful] ${eventType}: could not find referrer operator for token="${token}"`);
    return;
  }

  // Try updating by referrer_operator_id + referred_operator_id
  let updateQuery = supabase
    .from("referrals")
    .select("id, total_earned, referred_operator_id")
    .eq("referrer_operator_id", referrerOperatorId);

  if (customerEmail) {
    const referredId = await findOperatorByEmail(supabase, customerEmail);
    if (referredId) {
      updateQuery = updateQuery.eq("referred_operator_id", referredId);
    }
  }

  const { data: rows } = await updateQuery;

  if (!rows || rows.length === 0) {
    console.warn(`[rewardful] ${eventType}: no referral row found for referrer=${referrerOperatorId}`);
    return;
  }

  const row = rows[0];
  const newTotal = Math.max(0, Number(row.total_earned || 0) + delta);

  await supabase
    .from("referrals")
    .update({ total_earned: newTotal })
    .eq("id", row.id);

  console.log(
    `[rewardful] ${eventType}: referral=${row.id} delta=$${delta} new_total=$${newTotal}`
  );
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();

  // --- Signature verification ---
  const webhookSecret = process.env.REWARDFUL_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature = request.headers.get("x-rewardful-signature");
    if (!signature) {
      console.warn("[rewardful] Missing X-Rewardful-Signature header");
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    if (!verifySignature(rawBody, signature, webhookSecret)) {
      console.warn("[rewardful] Signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } else {
    // Allow unsigned in development; warn loudly in production
    if (process.env.NODE_ENV === "production") {
      console.error("[rewardful] REWARDFUL_WEBHOOK_SECRET is not set — rejecting unsigned request");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }
    console.warn("[rewardful] REWARDFUL_WEBHOOK_SECRET not set; skipping signature check (dev only)");
  }

  // --- Parse payload ---
  let payload: RewardfulPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = payload.event?.type;
  const supabase = createAdminClient();

  console.log(`[rewardful] Received event: ${eventType} (id=${payload.event?.id})`);

  try {
    switch (eventType) {
      case "referral.created":
      case "referral.lead":
      case "referral.converted":
        await handleReferralUpsert(supabase, payload.object as RewardfulReferral, eventType);
        break;

      case "referral.deleted":
        await handleReferralDeleted(supabase, payload.object as RewardfulReferral);
        break;

      case "commission.created":
        await handleCommission(supabase, payload.object as RewardfulCommission, eventType);
        break;

      case "commission.paid":
        // Already counted on commission.created; log for audit trail only.
        console.log(`[rewardful] commission.paid received (id=${(payload.object as RewardfulCommission).id}) — no DB update needed`);
        break;

      case "commission.voided":
        await handleCommission(supabase, payload.object as RewardfulCommission, eventType);
        break;

      default:
        // Unknown / unhandled event — still return 200 so Rewardful doesn't retry
        console.log(`[rewardful] Unhandled event type: ${eventType}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[rewardful] Error handling ${eventType}:`, msg);
    // Return 500 so Rewardful retries delivery
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
