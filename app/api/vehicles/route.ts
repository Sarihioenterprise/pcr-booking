import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperatorFromRequest } from "@/lib/get-operator-from-request";

/**
 * GET /api/vehicles — returns the authenticated operator's vehicles.
 * Supports both cookie-based sessions and Bearer JWT auth.
 */
export async function GET(request: NextRequest) {
  const result = await getOperatorFromRequest(request);
  if (result.error) return result.error;
  const { operator } = result;

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
