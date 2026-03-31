import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { type, name, subject, body: templateBody } = body;

    if (!type || !name || !subject || !templateBody) {
      return NextResponse.json(
        { error: "Type, name, subject, and body are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        operator_id: operator.id,
        type,
        name,
        subject,
        body: templateBody,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create email template:", error);
      return NextResponse.json(
        { error: "Failed to create email template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Email template error:", err);
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
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("email_templates")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update email template:", error);
      return NextResponse.json(
        { error: "Failed to update email template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Email template update error:", err);
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
    const templateId = searchParams.get("id");

    if (!templateId) {
      return NextResponse.json(
        { error: "Template ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("email_templates")
      .delete()
      .eq("id", templateId)
      .eq("operator_id", operator.id);

    if (error) {
      console.error("Failed to delete email template:", error);
      return NextResponse.json(
        { error: "Failed to delete email template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Email template delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
