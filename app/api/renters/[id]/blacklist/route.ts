import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { is_blacklisted, blacklist_reason } = body;

    const { data, error } = await supabase
      .from("renters")
      .update({
        is_blacklisted,
        blacklist_reason: is_blacklisted ? blacklist_reason : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
