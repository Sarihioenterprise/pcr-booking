/**
 * Plan gating utilities for PCR Booking.
 * Plans: growth ($79) | pro ($149) | scale ($249) | fleet ($499)
 * Note: 'free' tier has been retired. All operators are on a paid plan.
 */

export type PlanTier = "growth" | "pro" | "scale" | "fleet";

const TIER_ORDER: PlanTier[] = ["growth", "pro", "scale", "fleet"];

/** Numeric tier level: growth=0, pro=1, scale=2, fleet=3 */
export function getTierLevel(plan: string): number {
  const idx = TIER_ORDER.indexOf(plan as PlanTier);
  return idx >= 0 ? idx : 0;
}

/** Growth, Pro, Scale, or Fleet */
export function isGrowthOrAbove(plan: string): boolean {
  return getTierLevel(plan) >= 0;
}

/** Pro, Scale, or Fleet */
export function isProOrAbove(plan: string): boolean {
  return getTierLevel(plan) >= 1;
}

/** Scale or Fleet */
export function isScaleOrAbove(plan: string): boolean {
  return getTierLevel(plan) >= 2;
}

/** Scale only */
export function isScale(plan: string): boolean {
  return plan === "scale";
}

/** Fleet only */
export function isFleet(plan: string): boolean {
  return plan === "fleet";
}

/** Human-readable plan display name */
export function planDisplayName(plan: string): string {
  const names: Record<string, string> = {
    growth: "Growth",
    pro: "Pro",
    scale: "Scale",
    fleet: "Fleet",
  };
  return names[plan] ?? "Growth";
}

/** Plans that qualify for custom domain (Growth and above — all paid plans) */
export function canUseCustomDomain(plan: string): boolean {
  return isGrowthOrAbove(plan);
}
