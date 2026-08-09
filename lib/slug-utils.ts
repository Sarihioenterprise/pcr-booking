/**
 * Slug generation utilities for PCR Booking operator booking pages.
 * 
 * Business rules:
 *  - Free plan: pcrbooking.com/book/<slug>  (auto-generated from business name)
 *  - Growth+: custom domain support
 *  - Manual override available in Settings > Booking Page
 */

import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Convert a business name to a URL-safe slug.
 * e.g. "City Car Rentals & More!" → "city-car-rentals-more"
 */
export function slugifyBusinessName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")   // non-alphanum → dash
    .replace(/^-+|-+$/g, "")       // trim leading/trailing dashes
    .slice(0, 50);                  // max 50 chars
}

/**
 * Check if a value looks like a legacy auto-code (PCR-XXXXXX pattern).
 * These were auto-generated referral codes used as slugs before Tier 2.
 */
export function isLegacyCode(slug: string | null | undefined): boolean {
  if (!slug) return true;
  return /^PCR-[A-F0-9]{6}$/i.test(slug);
}

/**
 * Generate a unique slug for an operator from their business name.
 * Checks the operators table for collisions and appends a numeric suffix if needed.
 * 
 * Uses admin client (service role) since slugs are unique across all operators.
 */
export async function generateUniqueSlug(
  supabase: SupabaseClient,
  businessName: string,
  excludeOperatorId?: string
): Promise<string> {
  const base = slugifyBusinessName(businessName) || "rental";

  // Check if base slug is available
  const taken = await isSlugTaken(supabase, base, excludeOperatorId);
  if (!taken) return base;

  // Try numeric suffixes 2–99
  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`;
    const takenN = await isSlugTaken(supabase, candidate, excludeOperatorId);
    if (!takenN) return candidate;
  }

  // Final fallback: base + short timestamp suffix (very unlikely to collide)
  return `${base}-${Date.now().toString(36).slice(-4)}`;
}

async function isSlugTaken(
  supabase: SupabaseClient,
  slug: string,
  excludeOperatorId?: string
): Promise<boolean> {
  let query = supabase
    .from("operators")
    .select("id")
    .eq("booking_slug", slug);

  if (excludeOperatorId) {
    query = query.neq("id", excludeOperatorId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}
