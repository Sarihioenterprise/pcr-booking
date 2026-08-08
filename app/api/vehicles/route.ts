import { NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/vehicles — returns the authenticated operator's vehicles
 */
export async function GET() {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = (err as { digest?: string }).digest ?? "";
    if (msg.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const supabase = createAdminClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select(
      "id, make, model, year, color, plate, daily_rate, weekly_rate, monthly_rate, status, category, minimum_rental_days"
    )
    .eq("operator_id", operator.id)
    .order("daily_rate", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vehicles: vehicles ?? [] });
}
