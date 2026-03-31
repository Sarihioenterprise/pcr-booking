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

  // Verify vehicle belongs to operator
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
  const { url, label, is_primary } = body;

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  // If setting as primary, unset others first
  if (is_primary) {
    await supabase
      .from("vehicle_photos")
      .update({ is_primary: false })
      .eq("vehicle_id", id);
  }

  const { data, error } = await supabase
    .from("vehicle_photos")
    .insert({
      vehicle_id: id,
      url,
      label: label || null,
      is_primary: is_primary || false,
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
  const photoId = searchParams.get("photoId");

  if (!photoId) {
    return NextResponse.json({ error: "photoId is required" }, { status: 400 });
  }

  // Verify ownership chain
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
    .from("vehicle_photos")
    .delete()
    .eq("id", photoId)
    .eq("vehicle_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
