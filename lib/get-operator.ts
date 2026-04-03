import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Operator } from "@/lib/types";

export async function getOperator(): Promise<Operator> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: operator } = await supabase
    .from("operators")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!operator) redirect("/auth/onboarding");

  // If no subscription yet, redirect to plan selection
  // EXCEPTION: if we're already in the onboarding flow (prevent redirect loops)
  if (!operator.stripe_subscription_id) {
    const headersList = await headers();
    const pathname = headersList.get("x-pathname") || headersList.get("x-invoke-path") || "";
    if (!pathname.includes("/onboarding")) {
      redirect("/onboarding/plan");
    }
  }

  return operator as Operator;
}
