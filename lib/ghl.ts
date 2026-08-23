/**
 * GoHighLevel (GHL) CRM integration for PCR Booking
 *
 * Sub-account: PCR Booking (ZAx5IJmRKdx9egctECgC)
 * All calls are scoped to this location only.
 *
 * SAFETY RULES:
 * - All functions are fire-and-forget safe: they catch all errors and NEVER throw.
 * - CRM sync failures must never break signup, checkout, or booking flows.
 * - No outbound messaging (email/SMS) is triggered here — data sync only.
 * - Retry on 429/5xx with exponential backoff. Never tight-loops.
 *
 * TAG MANAGEMENT (verified against GHL API 2026-08-17):
 *   ADD tags:    POST /contacts/{id}/tags  — MERGES (does not replace)
 *   REMOVE tags: DELETE /contacts/{id}/tags — removes specific tags
 *   PUT /contacts/{id} with tags REPLACES all tags — AVOID for tag management
 *   POST /contacts/upsert with tags REPLACES all tags — AVOID for tag management
 *
 * CUSTOM FIELDS:
 *   Use field ID (UUID) not fieldKey string.
 *   Field IDs created 2026-08-17 for PCR Booking sub-account:
 *     Plan Tier:            3QCsVydJWGCq2AqeKdEb
 *     Plan Interval:        a8pPztpembowAlM6LbtE
 *     MRR Value:            vMKTj7C942YTIT9HjkKj
 *     Vehicle Count:        VARmipLySMKNoaBaDnmX
 *     Signup Date:          yE95Yj61TaEkIIgFBZyW
 *     Trial End Date:       mmdUA3LqixQAA15axdk1
 *     Supabase Operator ID: sjLmrJGeoQJLn6Y5ULkZ
 *     Booking Page URL:     p64dWyz6WgAHzieO4Nol
 *   Company Name is a GHL standard field → use `companyName` in body.
 */

const GHL_BASE_URL = "https://services.leadconnectorhq.com";

// Custom field IDs — UUIDs returned by GHL API at field creation.
// DO NOT change these; they are permanent identifiers for the PCR Booking sub-account.
export const GHL_FIELD_IDS = {
  PLAN_TIER: "3QCsVydJWGCq2AqeKdEb",
  PLAN_INTERVAL: "a8pPztpembowAlM6LbtE",
  MRR_VALUE: "vMKTj7C942YTIT9HjkKj",
  VEHICLE_COUNT: "VARmipLySMKNoaBaDnmX",
  SIGNUP_DATE: "yE95Yj61TaEkIIgFBZyW",
  TRIAL_END_DATE: "mmdUA3LqixQAA15axdk1",
  OPERATOR_ID: "sjLmrJGeoQJLn6Y5ULkZ",
  BOOKING_PAGE_URL: "p64dWyz6WgAHzieO4Nol",
} as const;

// Also keep fieldKey aliases for documentation purposes
export const GHL_FIELDS = {
  PLAN_TIER: "contact.plan_tier",
  PLAN_INTERVAL: "contact.plan_interval",
  MRR_VALUE: "contact.mrr_value",
  VEHICLE_COUNT: "contact.vehicle_count",
  SIGNUP_DATE: "contact.signup_date",
  TRIAL_END_DATE: "contact.trial_end_date",
  OPERATOR_ID: "contact.supabase_operator_id",
  BOOKING_PAGE_URL: "contact.booking_page_url",
} as const;

// ─── Token & location ID pulled from env ──────────────────────────────────
function getToken(): string | undefined {
  return process.env.GHL_PCR_BOOKING_TOKEN;
}

function getLocationId(): string | undefined {
  return process.env.GHL_PCR_BOOKING_LOCATION_ID;
}

// ─── Core HTTP helper with retry ──────────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an authenticated request to the GHL API with exponential backoff retry.
 * Returns the parsed JSON or null on failure. Never throws.
 */
async function ghlRequest(
  method: string,
  endpoint: string,
  body?: Record<string, unknown>,
  maxRetries = 3
): Promise<unknown | null> {
  const token = getToken();
  const locationId = getLocationId();

  if (!token || !locationId) {
    console.warn("[GHL] Missing GHL_PCR_BOOKING_TOKEN or GHL_PCR_BOOKING_LOCATION_ID — skipping CRM sync");
    return null;
  }

  const url = `${GHL_BASE_URL}${endpoint}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Version: "2021-07-28",
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "PCRBooking/1.0",
  };

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
        const retryAfter = response.headers.get("Retry-After");
        const waitMs = retryAfter
          ? parseInt(retryAfter, 10) * 1000
          : Math.min(1000 * Math.pow(2, attempt - 1), 30_000);

        console.warn(`[GHL] ${method} ${endpoint} returned ${response.status}; retrying in ${waitMs}ms (attempt ${attempt}/${maxRetries})`);

        if (attempt < maxRetries) {
          await sleep(waitMs);
          continue;
        }
      }

      if (!response.ok) {
        const errText = await response.text().catch(() => "(unreadable)");
        console.error(`[GHL] ${method} ${endpoint} → ${response.status}: ${errText}`);
        return null;
      }

      return await response.json();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const waitMs = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
        console.warn(`[GHL] Network error on ${method} ${endpoint}; retry in ${waitMs}ms (attempt ${attempt}/${maxRetries}):`, err);
        await sleep(waitMs);
      }
    }
  }

  console.error(`[GHL] All retries exhausted for ${method} ${endpoint}:`, lastError);
  return null;
}

// ─── Contact types ────────────────────────────────────────────────────────

export interface GHLCustomField {
  /** GHL field UUID (use GHL_FIELD_IDS constants) */
  id: string;
  field_value: string | number;
}

export interface GHLContactPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  companyName?: string;
  customFields?: GHLCustomField[];
}

// ─── Upsert contact ───────────────────────────────────────────────────────

/**
 * Upsert a contact by email. Returns the GHL contact object (with `.id`) or null.
 * Idempotent — safe to call on repeated webhook deliveries for the same email.
 *
 * NOTE: Do NOT include tags here — upsert REPLACES tags.
 *       Use addTags() after upsert to merge tags.
 */
export async function upsertContact(
  payload: GHLContactPayload
): Promise<{ id: string; [key: string]: unknown } | null> {
  const locationId = getLocationId();
  if (!locationId) return null;

  try {
    const body: Record<string, unknown> = {
      locationId,
      email: payload.email,
    };

    if (payload.firstName) body.firstName = payload.firstName;
    if (payload.lastName) body.lastName = payload.lastName;
    if (payload.phone) body.phone = payload.phone;
    if (payload.companyName) body.companyName = payload.companyName;
    if (payload.customFields?.length) body.customFields = payload.customFields;

    const result = await ghlRequest("POST", "/contacts/upsert", body);
    const contact = (result as Record<string, unknown> | null)?.contact as { id: string } | undefined;

    if (contact?.id) {
      console.log(`[GHL] Upserted contact ${payload.email} → ${contact.id}`);
      return contact as { id: string; [key: string]: unknown };
    }

    console.warn(`[GHL] Upsert returned no contact for ${payload.email}`);
    return null;
  } catch (err) {
    console.error(`[GHL] upsertContact failed for ${payload.email}:`, err);
    return null;
  }
}

// ─── Tag helpers ──────────────────────────────────────────────────────────

/**
 * Add tags to a contact (MERGE — does not replace existing tags).
 * Uses POST /contacts/{id}/tags which is the correct merge endpoint.
 */
export async function addTags(contactId: string, tags: string[]): Promise<boolean> {
  if (!tags.length) return true;

  try {
    const result = await ghlRequest("POST", `/contacts/${contactId}/tags`, { tags }) as Record<string, unknown> | null;
    const ok = Array.isArray(result?.tags);
    if (ok) console.log(`[GHL] Added tags [${tags.join(", ")}] to ${contactId}`);
    return ok;
  } catch (err) {
    console.error(`[GHL] addTags failed for ${contactId}:`, err);
    return false;
  }
}

/**
 * Remove specific tags from a contact.
 * Uses DELETE /contacts/{id}/tags.
 */
export async function removeTags(contactId: string, tags: string[]): Promise<boolean> {
  if (!tags.length) return true;

  try {
    const result = await ghlRequest("DELETE", `/contacts/${contactId}/tags`, { tags }) as Record<string, unknown> | null;
    // DELETE returns {tags: [...remaining], tagsRemoved: [...]}
    const ok = result !== null && "tags" in result;
    if (ok) console.log(`[GHL] Removed tags [${tags.join(", ")}] from ${contactId}`);
    return ok;
  } catch (err) {
    console.error(`[GHL] removeTags failed for ${contactId}:`, err);
    return false;
  }
}

// ─── Single-tag aliases ───────────────────────────────────────────────────

export async function addTag(contactId: string, tag: string): Promise<boolean> {
  return addTags(contactId, [tag]);
}

export async function removeTag(contactId: string, tag: string): Promise<boolean> {
  return removeTags(contactId, [tag]);
}

// ─── Note helper ─────────────────────────────────────────────────────────

export async function addNote(contactId: string, note: string): Promise<boolean> {
  const locationId = getLocationId();
  if (!locationId) return false;

  try {
    const result = await ghlRequest("POST", `/contacts/${contactId}/notes`, {
      locationId,
      body: note,
    }) as Record<string, unknown> | null;

    return !!result?.id;
  } catch (err) {
    console.error(`[GHL] addNote failed for ${contactId}:`, err);
    return false;
  }
}

// ─── Lifecycle event functions ────────────────────────────────────────────

export interface OperatorContact {
  id?: string;                     // Supabase operator ID
  email: string;
  owner_name?: string;
  business_name?: string;
  phone?: string | null;
  booking_slug?: string | null;
  created_at?: string;
  vehicle_count?: number;
}

function buildBasePayload(op: OperatorContact): GHLContactPayload {
  const nameParts = (op.owner_name ?? "").trim().split(" ");
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";
  const bookingUrl = op.booking_slug
    ? `https://pcrbooking.com/book/${op.booking_slug}`
    : undefined;

  const customFields: GHLCustomField[] = [];
  if (op.id) customFields.push({ id: GHL_FIELD_IDS.OPERATOR_ID, field_value: op.id });
  if (bookingUrl) customFields.push({ id: GHL_FIELD_IDS.BOOKING_PAGE_URL, field_value: bookingUrl });
  if (op.created_at) customFields.push({ id: GHL_FIELD_IDS.SIGNUP_DATE, field_value: op.created_at.slice(0, 10) });
  if (op.vehicle_count !== undefined) customFields.push({ id: GHL_FIELD_IDS.VEHICLE_COUNT, field_value: op.vehicle_count });

  return {
    email: op.email,
    firstName: firstName || undefined,
    lastName: lastName || undefined,
    phone: op.phone ?? undefined,
    companyName: op.business_name ?? undefined,
    customFields: customFields.length ? customFields : undefined,
  };
}

/**
 * Signup started — upsert contact and add tag pcrbooking-trial.
 * Call when an operator account is created (before card capture).
 */
export async function syncSignup(op: OperatorContact): Promise<void> {
  try {
    const contact = await upsertContact(buildBasePayload(op));
    if (!contact) return;
    await addTags(contact.id, ["pcrbooking-trial"]);
    console.log(`[GHL] syncSignup complete for ${op.email}`);
  } catch (err) {
    console.error("[GHL] syncSignup failed (non-fatal):", err);
  }
}

/**
 * Trial activated — card captured (checkout.session.completed) or subscription.created (trialing).
 * Tags: pcrbooking-trial-active. Updates plan tier, interval, MRR, trial end date.
 */
export async function syncTrialActivated(
  op: OperatorContact,
  opts: {
    planTier: string;
    interval: "monthly" | "annual";
    mrr: number;          // USD/month — NOT total invoice amount
    trialEndDate?: string; // ISO date YYYY-MM-DD
  }
): Promise<void> {
  try {
    const payload = buildBasePayload(op);
    payload.customFields = [
      ...(payload.customFields ?? []),
      { id: GHL_FIELD_IDS.PLAN_TIER, field_value: opts.planTier },
      { id: GHL_FIELD_IDS.PLAN_INTERVAL, field_value: opts.interval },
      { id: GHL_FIELD_IDS.MRR_VALUE, field_value: opts.mrr },
      ...(opts.trialEndDate ? [{ id: GHL_FIELD_IDS.TRIAL_END_DATE, field_value: opts.trialEndDate }] : []),
    ];

    const contact = await upsertContact(payload);
    if (!contact) return;

    await addTags(contact.id, ["pcrbooking-trial-active"]);
    // Remove plain trial tag now that trial is active
    await removeTags(contact.id, ["pcrbooking-trial"]);

    console.log(`[GHL] syncTrialActivated complete for ${op.email}`);
  } catch (err) {
    console.error("[GHL] syncTrialActivated failed (non-fatal):", err);
  }
}

/**
 * Converted to paid — first real invoice payment (NOT $0 trial invoice).
 * Tags: pcrbooking-customer + pcrbooking-plan-{tier}
 * Removes: pcrbooking-trial-active, pcrbooking-trial
 */
export async function syncConverted(
  op: OperatorContact,
  opts: {
    planTier: string;
    interval: "monthly" | "annual";
    mrr: number;
  }
): Promise<void> {
  try {
    const payload = buildBasePayload(op);
    payload.customFields = [
      ...(payload.customFields ?? []),
      { id: GHL_FIELD_IDS.PLAN_TIER, field_value: opts.planTier },
      { id: GHL_FIELD_IDS.PLAN_INTERVAL, field_value: opts.interval },
      { id: GHL_FIELD_IDS.MRR_VALUE, field_value: opts.mrr },
    ];

    const contact = await upsertContact(payload);
    if (!contact) return;

    const planTag = `pcrbooking-plan-${opts.planTier}` as const;
    await addTags(contact.id, ["pcrbooking-customer", planTag]);
    // Clear trial tags AND any stale payment-failed tag (recovered account).
    await removeTags(contact.id, [
      "pcrbooking-trial-active",
      "pcrbooking-trial",
      "pcrbooking-payment-failed",
    ]);

    console.log(`[GHL] syncConverted complete for ${op.email} — ${opts.planTier} ${opts.interval}`);
  } catch (err) {
    console.error("[GHL] syncConverted failed (non-fatal):", err);
  }
}

/**
 * Payment failed — invoice.payment_failed or status past_due.
 * Tags: pcrbooking-payment-failed
 * HIGH PRIORITY: 7-business-day save window before public booking page goes dark.
 */
export async function syncPaymentFailed(op: OperatorContact): Promise<void> {
  try {
    const contact = await upsertContact(buildBasePayload(op));
    if (!contact) return;
    await addTags(contact.id, ["pcrbooking-payment-failed"]);
    console.log(`[GHL] syncPaymentFailed complete for ${op.email}`);
  } catch (err) {
    console.error("[GHL] syncPaymentFailed failed (non-fatal):", err);
  }
}

/**
 * Canceled/churned — subscription.deleted.
 * Tags: pcrbooking-churned
 * Removes: pcrbooking-customer, pcrbooking-plan-*, pcrbooking-payment-failed
 */
export async function syncChurned(
  op: OperatorContact,
  opts?: { planTier?: string }
): Promise<void> {
  try {
    const contact = await upsertContact(buildBasePayload(op));
    if (!contact) return;

    await addTags(contact.id, ["pcrbooking-churned"]);

    const tagsToRemove = [
      "pcrbooking-customer",
      "pcrbooking-trial-active",
      "pcrbooking-trial",
      "pcrbooking-payment-failed",
    ];
    if (opts?.planTier) tagsToRemove.push(`pcrbooking-plan-${opts.planTier}`);
    await removeTags(contact.id, tagsToRemove);

    console.log(`[GHL] syncChurned complete for ${op.email}`);
  } catch (err) {
    console.error("[GHL] syncChurned failed (non-fatal):", err);
  }
}

// ─── Legacy fireGHLEvent (backward compat shim) ───────────────────────────
// The webhook file calls this; keep the signature intact.
// New code should call the specific sync* functions instead.

export async function createOrUpdateContact(operator: {
  id: string;
  owner_name: string;
  business_name: string;
  phone?: string | null;
  business_email?: string | null;
  plan?: string;
  booking_slug?: string | null;
}): Promise<{ id: string } | null> {
  const email = operator.business_email || `operator-${operator.id}@pcrbooking.local`;
  return upsertContact({
    email,
    firstName: operator.owner_name?.split(" ")[0],
    lastName: operator.owner_name?.split(" ").slice(1).join(" ") || undefined,
    phone: operator.phone ?? undefined,
    companyName: operator.business_name,
  });
}

export async function fireGHLEvent(
  operator: {
    id?: string;
    owner_name?: string;
    business_name?: string;
    phone?: string | null;
    business_email?: string | null;
    plan?: string;
    booking_slug?: string | null;
  },
  tag: string,
  note: string,
  additionalTags?: string[]
): Promise<void> {
  try {
    const email = operator.business_email || (operator.id ? `operator-${operator.id}@pcrbooking.local` : null);
    if (!email) {
      console.warn("[GHL] fireGHLEvent: no email available, skipping");
      return;
    }

    const contact = await upsertContact({
      email,
      firstName: operator.owner_name?.split(" ")[0],
      lastName: operator.owner_name?.split(" ").slice(1).join(" ") || undefined,
      phone: operator.phone ?? undefined,
      companyName: operator.business_name,
    });

    if (!contact?.id) return;

    const allTags = [tag, ...(additionalTags ?? [])];
    await addTags(contact.id, allTags);

    if (note) {
      await addNote(contact.id, note);
    }
  } catch (err) {
    console.error("[GHL] fireGHLEvent failed (non-fatal):", err);
  }
}
