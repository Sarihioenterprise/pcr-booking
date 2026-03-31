import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const body = await request.json();
  const { type, name, url, expiry_date } = body;

  if (!type || !name || !url) {
    return NextResponse.json({ error: "type, name, and url are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("vehicle_documents")
    .insert({
      vehicle_id: id,
      type,
      name,
      url,
      expiry_date: expiry_date || null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");

  if (!docId) {
    return NextResponse.json({ error: "docId is required" }, { status: 400 });
  }

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("vehicle_documents")
    .delete()
    .eq("id", docId)
    .eq("vehicle_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
