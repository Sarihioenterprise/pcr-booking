/**
 * Renter Portal JWT helpers — stateless magic-link & session tokens.
 *
 * Uses the Web Crypto API (available in both Node.js and Edge Runtime).
 * No external JWT library required.
 *
 * Magic token:  short-lived (15 min), emailed to renter, one-time use
 * Session token: 7-day, stored in httpOnly cookie after magic link verified
 *
 * Env var required: RENTER_PORTAL_JWT_SECRET
 */

const SECRET_KEY =
  process.env.RENTER_PORTAL_JWT_SECRET ??
  "change-me-set-RENTER_PORTAL_JWT_SECRET-in-env";

export interface RenterTokenPayload {
  /** Renter row ID */
  sub: string;
  email: string;
  /** 'magic' | 'session' */
  type: "magic" | "session";
  /** Unix timestamp seconds */
  exp: number;
  iat: number;
}

// ─── Encoding helpers ──────────────────────────────────────────────────────

function b64url(data: string): string {
  return btoa(data).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function b64urlDecode(data: string): string {
  // Pad and convert back to standard base64
  const padded = data + "=".repeat((4 - (data.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

async function getKey(usage: "sign" | "verify") {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage]
  );
}

// ─── Sign / Verify ─────────────────────────────────────────────────────────

async function sign(payload: RenterTokenPayload): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const message = `${header}.${body}`;

  const key = await getKey("sign");
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );

  const sigB64 = b64url(
    String.fromCharCode(...new Uint8Array(sigBuffer))
  );

  return `${message}.${sigB64}`;
}

export async function verifyRenterToken(
  token: string
): Promise<RenterTokenPayload | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, rawSig] = parts;
    const message = `${header}.${body}`;

    // Reconstruct signature bytes
    const sigBytes = Uint8Array.from(
      atob(rawSig.replace(/-/g, "+").replace(/_/g, "/") + "=="),
      (c) => c.charCodeAt(0)
    );

    const key = await getKey("verify");
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      new TextEncoder().encode(message)
    );

    if (!valid) return null;

    const payload = JSON.parse(b64urlDecode(body)) as RenterTokenPayload;

    // Expiry check
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// ─── Token generators ───────────────────────────────────────────────────────

export async function signMagicToken(
  renterId: string,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: renterId,
    email,
    type: "magic",
    iat: now,
    exp: now + 60 * 15, // 15 minutes
  });
}

export async function signSessionToken(
  renterId: string,
  email: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({
    sub: renterId,
    email,
    type: "session",
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 days
  });
}

// ─── Cookie name ───────────────────────────────────────────────────────────

export const RENTER_SESSION_COOKIE = "renter_portal_session";
