import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { createNotification } from "@/lib/create-notification";

export async function GET() {
  try {
    const operator = await getOperator();
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ notifications: data });
  } catch {
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

    const { id, mark_all } = body;

    if (mark_all) {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("operator_id", operator.id)
        .eq("is_read", false);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true });
    }

    if (!id) {
      return NextResponse.json(
        { error: "Missing notification id" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .eq("operator_id", operator.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // ── Auth: only authenticated operators can create notifications ──────────
    // Get the authenticated operator and use their ID (ignore any operator_id in body)
    const operator = await getOperator();

    const body = await request.json();
    const { type, title, message, link } = body;

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: "Missing required fields: type, title, message" },
        { status: 400 }
      );
    }

    // Always use the authenticated operator's ID — never trust the request body
    const result = await createNotification(
      operator.id,
      type,
      title,
      message,
      link
    );

    if (!result) {
      return NextResponse.json(
        { error: "Failed to create notification" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
