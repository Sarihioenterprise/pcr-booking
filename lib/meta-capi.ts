/**
 * Meta Conversions API (CAPI) helper for PCR Booking.
 *
 * Sends server-side events to the Meta Conversions API for pixel 1467551770936199.
 * Designed to be used alongside the browser pixel for deduplication.
 *
 * Key design decisions:
 * - ALL PII is SHA-256 hashed, lowercase+trimmed, never sent raw (Meta spec).
 * - Errors never throw — tracking must NEVER break checkout or any user flow.
 * - test_event_code can be set via META_CAPI_TEST_CODE env var to validate in Events Manager.
 * - Fail gracefully with logged errors so production issues are visible without causing 500s.
 */

import crypto from "crypto";

const PIXEL_ID = "1467551770936199";
const CAPI_ENDPOINT = `https://graph.facebook.com/v20.0/${PIXEL_ID}/events`;
const API_VERSION = "v20.0";

// ── PII Hashing ──────────────────────────────────────────────────────────────

/**
 * Hash a PII string with SHA-256, lowercase+trimmed, per Meta spec.
 * Returns null if the input is falsy so callers don't accidentally send empty hashes.
 */
export function hashPii(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface CapiUserData {
  /** Raw email — will be SHA-256 hashed before sending */
  email?: string | null;
  /** Raw phone (E.164 preferred, e.g. "+15551234567") — will be SHA-256 hashed */
  phone?: string | null;
  /** fbp cookie value (Facebook Browser ID) — NOT hashed, send as-is */
  fbp?: string | null;
  /** fbc cookie value (Facebook Click ID) — NOT hashed, send as-is */
  fbc?: string | null;
  /** Client IP address from request headers — NOT hashed */
  clientIp?: string | null;
  /** Client user-agent string — NOT hashed */
  userAgent?: string | null;
}

export interface CapiCustomData {
  value?: number;
  currency?: string;
  content_name?: string;
  content_type?: string;
  content_ids?: string[];
  order_id?: string;
  [key: string]: unknown;
}

export interface CapiEventOptions {
  eventName: string;
  eventId: string;
  eventSourceUrl?: string;
  userData?: CapiUserData;
  customData?: CapiCustomData;
  actionSource?: "website" | "email" | "phone_call" | "app" | "physical_store" | "system_generated" | "other";
}

// ── Core sender ──────────────────────────────────────────────────────────────

/**
 * Send a single event to the Meta Conversions API.
 *
 * Never throws. Returns the parsed response or null on failure.
 * Tracking failures must never break user flows.
 */
export async function sendCapiEvent(options: CapiEventOptions): Promise<{ events_received?: number; fbtrace_id?: string } | null> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn("[meta-capi] META_CAPI_ACCESS_TOKEN is not set — skipping CAPI event:", options.eventName);
    return null;
  }

  try {
    const {
      eventName,
      eventId,
      eventSourceUrl = "https://pcrbooking.com",
      userData = {},
      customData,
      actionSource = "website",
    } = options;

    // Build user_data: hash PII, pass cookies/IP/UA as-is
    const user_data: Record<string, string | string[]> = {};

    const hashedEmail = hashPii(userData.email);
    if (hashedEmail) user_data.em = [hashedEmail];

    const hashedPhone = hashPii(userData.phone);
    if (hashedPhone) user_data.ph = [hashedPhone];

    if (userData.fbp) user_data.fbp = userData.fbp;
    if (userData.fbc) user_data.fbc = userData.fbc;
    if (userData.clientIp) user_data.client_ip_address = userData.clientIp;
    if (userData.userAgent) user_data.client_user_agent = userData.userAgent;

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          action_source: actionSource,
          event_source_url: eventSourceUrl,
          user_data,
          ...(customData ? { custom_data: customData } : {}),
        },
      ],
      access_token: accessToken,
    };

    // Include test event code if set — allows validation in Events Manager Test Events
    const testCode = process.env.META_CAPI_TEST_CODE;
    if (testCode) {
      payload.test_event_code = testCode;
    }

    const res = await fetch(CAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": `pcr-booking-capi/${API_VERSION}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json() as { events_received?: number; fbtrace_id?: string; error?: { message: string; code: number } };

    if (!res.ok || json.error) {
      console.error(`[meta-capi] API error for ${eventName}:`, json.error || `HTTP ${res.status}`);
      return null;
    }

    console.log(`[meta-capi] ${eventName} sent OK — events_received=${json.events_received} trace=${json.fbtrace_id} event_id=${eventId}`);
    return json;
  } catch (err) {
    // NEVER let tracking errors propagate — log and swallow
    console.error(`[meta-capi] Unexpected error sending ${options.eventName}:`, err);
    return null;
  }
}

// ── Convenience wrappers ─────────────────────────────────────────────────────

/**
 * Fire a StartTrial CAPI event.
 * Used when a new Stripe subscription enters trial status.
 */
export async function capiStartTrial(params: {
  eventId: string;
  email?: string | null;
  value: number;
  planName?: string;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await sendCapiEvent({
    eventName: "StartTrial",
    eventId: params.eventId,
    eventSourceUrl: "https://pcrbooking.com/pricing",
    userData: {
      email: params.email,
      fbp: params.fbp,
      fbc: params.fbc,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
    },
    customData: {
      value: params.value,
      currency: "USD",
      content_name: params.planName,
    },
  });
}

/**
 * Fire a Subscribe CAPI event.
 * Used when a trial converts to the first real paid billing cycle.
 */
export async function capiSubscribe(params: {
  eventId: string;
  email?: string | null;
  value: number;
  planName?: string;
  orderId?: string;
}): Promise<void> {
  await sendCapiEvent({
    eventName: "Subscribe",
    eventId: params.eventId,
    eventSourceUrl: "https://pcrbooking.com/pricing",
    userData: { email: params.email },
    customData: {
      value: params.value,
      currency: "USD",
      content_name: params.planName,
      order_id: params.orderId,
    },
  });
}

/**
 * Fire a Purchase CAPI event.
 * Used for recurring invoice payments AND (with shared event_id) to deduplicate
 * the browser-side Purchase event fired on the /thank-you page.
 */
export async function capiPurchase(params: {
  eventId: string;
  email?: string | null;
  value: number;
  currency?: string;
  planName?: string;
  orderId?: string;
  fbp?: string | null;
  fbc?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await sendCapiEvent({
    eventName: "Purchase",
    eventId: params.eventId,
    eventSourceUrl: "https://pcrbooking.com/thank-you",
    userData: {
      email: params.email,
      fbp: params.fbp,
      fbc: params.fbc,
      clientIp: params.clientIp,
      userAgent: params.userAgent,
    },
    customData: {
      value: params.value,
      currency: params.currency ?? "USD",
      content_name: params.planName,
      order_id: params.orderId,
    },
  });
}

/**
 * Generate a deterministic-ish but unique event ID.
 * Uses crypto.randomUUID() if available, falls back to timestamp+random.
 */
export function generateEventId(prefix?: string): string {
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return prefix ? `${prefix}-${id}` : id;
}
