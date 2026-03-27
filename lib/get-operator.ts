import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
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

  return operator as Operator;
}
