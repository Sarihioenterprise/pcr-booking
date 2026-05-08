import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
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

  // If no subscription, send to subscription issue page — but only for non-onboarding paths
  // and only if the operator record exists (meaning they completed onboarding).
  // If they JUST came through onboarding with a Stripe session, the webhook may
  // not have fired yet — in that case, let them into the dashboard anyway.
  // Also allow through if operator already has a plan set (manual/admin-provisioned accounts).
  const hasActivePlan = operator.plan && operator.plan !== "free";
  if (!operator.stripe_subscription_id && !hasActivePlan) {
    const headersList = await headers();
    const referer = headersList.get("referer") || "";
    const comingFromOnboarding = referer.includes("/auth/onboarding") || referer.includes("/auth/signup");
    if (!comingFromOnboarding) {
      redirect("/dashboard/subscription-issue");
    }
  }

  return operator as Operator;
}
