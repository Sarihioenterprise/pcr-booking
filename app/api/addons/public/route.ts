import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/addons/public?operator_id=xxx
// Public endpoint — used by the booking page widget (no auth required).
// Uses service role client to bypass RLS.
export async function GET(request: NextRequest) {
  const operator_id = request.nextUrl.searchParams.get("operator_id");
  if (!operator_id) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("addons")
    .select("id, name, description, pricing_type, price, category, required, sort_order")
    .eq("operator_id", operator_id)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    // Table may not exist yet (migration pending) — return empty gracefully
    if (error.code === "42P01") {
      return NextResponse.json({ addons: [] });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ addons: data ?? [] });
}
