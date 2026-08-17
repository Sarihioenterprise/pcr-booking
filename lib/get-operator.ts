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

  // Subscription gate: operator must have an active Stripe subscription to access dashboard.
  // stripe_subscription_id is nulled out by webhooks on: payment failure, subscription deletion,
  // or status becoming past_due/unpaid. A brief referer grace period allows the Stripe webhook
  // to fire after onboarding completes before we start blocking the new operator.
  if (!operator.stripe_subscription_id) {
    const headersList = await headers();
    const referer = headersList.get("referer") || "";
    // Allow through briefly if they just came from the onboarding or checkout flow
    // so the webhook has time to link the subscription. This is a narrow window only.
    const comingFromOnboarding =
      referer.includes("/auth/onboarding") ||
      referer.includes("/thank-you") ||
      referer.includes("/auth/signup");
    if (!comingFromOnboarding) {
      redirect("/dashboard/subscription-issue");
    }
  }

  return operator as Operator;
}
