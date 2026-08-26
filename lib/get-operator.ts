import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import type { Operator } from "@/lib/types";

export async function getOperator(): Promise<Operator> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Use admin client to bypass RLS on operator lookup
  const adminSupabase = createAdminClient();
  const { data: operator } = await adminSupabase
    .from("operators")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!operator) redirect("/auth/onboarding");

  // Normalize charges_enabled / payouts_enabled: the DB columns may not exist yet
  // (migration 034). Derive from stripe_connect_status as a safe fallback so the
  // Stripe banner logic works correctly in all environments.
  if (!(operator as any).charges_enabled) {
    (operator as any).charges_enabled = (operator as any).stripe_connect_status === 'active';
  }
  if (!(operator as any).payouts_enabled) {
    (operator as any).payouts_enabled = (operator as any).stripe_connect_status === 'active';
  }

  // ── Demo account hard bypass ────────────────────────────────────────────────
  // The demo@pcrbooking.com account is used for sales demos and must NEVER see
  // a paywall, regardless of DB state. This bypass is intentional and permanent.
  const DEMO_EMAILS = ["demo@pcrbooking.com"];
  const isDemoAccount = DEMO_EMAILS.includes(operator.business_email ?? "");

  // Subscription gate: operator must have an active Stripe subscription to access dashboard.
  // stripe_subscription_id is set by the Stripe webhook on subscription creation/activation.
  if (!isDemoAccount && !operator.stripe_subscription_id) {
    redirect("/subscription-issue");
  }

  return operator as Operator;
}
