import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { name, email, role } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { error: "Name, email, and role are required" },
        { status: 400 }
      );
    }

    if (!["owner", "manager", "staff"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be owner, manager, or staff" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("team_members")
      .insert({
        operator_id: operator.id,
        name,
        email,
        role,
        is_active: true,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add team member:", error);
      return NextResponse.json(
        { error: "Failed to add team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Team member error:", err);
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
    const memberId = searchParams.get("id");

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", memberId)
      .eq("operator_id", operator.id);

    if (error) {
      console.error("Failed to remove team member:", error);
      return NextResponse.json(
        { error: "Failed to remove team member" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Team member delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
