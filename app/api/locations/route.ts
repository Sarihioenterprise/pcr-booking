import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { name, address, city, state, zip, phone, is_default } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from("locations")
        .update({ is_default: false })
        .eq("operator_id", operator.id);
    }

    const { data, error } = await supabase
      .from("locations")
      .insert({
        operator_id: operator.id,
        name,
        address: address || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        phone: phone || null,
        is_default: is_default ?? false,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create location:", error);
      return NextResponse.json(
        { error: "Failed to create location" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Location error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults first
    if (updates.is_default) {
      await supabase
        .from("locations")
        .update({ is_default: false })
        .eq("operator_id", operator.id);
    }

    const { data, error } = await supabase
      .from("locations")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update location:", error);
      return NextResponse.json(
        { error: "Failed to update location" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Location update error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const locationId = searchParams.get("id");

    if (!locationId) {
      return NextResponse.json(
        { error: "Location ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("locations")
      .delete()
      .eq("id", locationId)
      .eq("operator_id", operator.id);

    if (error) {
      console.error("Failed to delete location:", error);
      return NextResponse.json(
        { error: "Failed to delete location" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Location delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
