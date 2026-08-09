/**
 * Plan gating utilities for PCR Booking.
 * Plans: free | growth ($79) | pro ($149) | scale ($249)
 */

export type PlanTier = "free" | "growth" | "pro" | "scale";

const TIER_ORDER: PlanTier[] = ["free", "growth", "pro", "scale"];

/** Numeric tier level: free=0, growth=1, pro=2, scale=3 */
export function getTierLevel(plan: string): number {
  const idx = TIER_ORDER.indexOf(plan as PlanTier);
  return idx >= 0 ? idx : 0;
}

/** Growth, Pro, or Scale */
export function isGrowthOrAbove(plan: string): boolean {
  return getTierLevel(plan) >= 1;
}

/** Pro or Scale */
export function isProOrAbove(plan: string): boolean {
  return getTierLevel(plan) >= 2;
}

/** Scale only */
export function isScale(plan: string): boolean {
  return plan === "scale";
}

/** Human-readable plan display name */
export function planDisplayName(plan: string): string {
  const names: Record<string, string> = {
    free: "Free",
    growth: "Growth",
    pro: "Pro",
    scale: "Scale",
  };
  return names[plan] ?? "Free";
}

/** Plans that qualify for custom domain (Growth and above) */
export function canUseCustomDomain(plan: string): boolean {
  return isGrowthOrAbove(plan);
}
