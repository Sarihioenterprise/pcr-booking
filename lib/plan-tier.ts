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

/** Per-plan vehicle limits. Fleet is unlimited (Infinity). */
export const PLAN_VEHICLE_LIMITS: Record<PlanTier, number> = {
  growth: 15,
  pro: 40,
  scale: 100,
  fleet: Infinity,
};

/** Returns the vehicle limit for a given plan string. Defaults to growth limit if unknown. */
export function getVehicleLimit(plan: string): number {
  return PLAN_VEHICLE_LIMITS[plan as PlanTier] ?? PLAN_VEHICLE_LIMITS.growth;
}

/** Returns the next plan up from the given plan (or the same if already at fleet). */
export function getUpgradePlan(plan: string): PlanTier {
  const idx = TIER_ORDER.indexOf(plan as PlanTier);
  if (idx < 0 || idx >= TIER_ORDER.length - 1) return "fleet";
  return TIER_ORDER[idx + 1];
}

/** Monthly prices for each plan. */
export const PLAN_MONTHLY_PRICES: Record<PlanTier, number> = {
  growth: 79,
  pro: 149,
  scale: 249,
  fleet: 499,
};
