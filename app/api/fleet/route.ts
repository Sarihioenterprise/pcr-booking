import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

// Diagnostic GET endpoint - requires service role key
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Only allow with service role key for diagnostics
  if (!authHeader || !authHeader.includes(serviceKey || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const operatorId = request.nextUrl.searchParams.get("operator_id");
  if (!operatorId) {
    return NextResponse.json({ error: "operator_id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: vehicles, error } = await supabase
    .from("vehicles")
    .select("id, make, model, year, status")
    .eq("operator_id", operatorId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ vehicles, count: vehicles?.length || 0 });
}

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = createAdminClient();
    const body = await request.json();

    const { data, error } = await supabase
      .from("vehicles")
      .insert({ ...body, operator_id: operator.id })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create vehicle" }, { status: 500 });
  }
}
