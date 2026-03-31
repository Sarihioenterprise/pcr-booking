import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("renter_communications")
      .select("*")
      .eq("renter_id", id)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false });

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { type, subject, content } = body;

    const { data, error } = await supabase
      .from("renter_communications")
      .insert({
        renter_id: id,
        operator_id: operator.id,
        type: type || "note",
        subject: subject || null,
        content,
        created_by: operator.owner_name,
      })
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
