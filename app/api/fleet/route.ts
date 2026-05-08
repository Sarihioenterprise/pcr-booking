import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

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
