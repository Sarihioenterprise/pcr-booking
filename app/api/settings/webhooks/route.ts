import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { url, events, is_active, secret } = body;

    if (!url || !events || !Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: "URL and at least one event are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("webhook_endpoints")
      .insert({
        operator_id: operator.id,
        url,
        events,
        is_active: is_active ?? true,
        secret: secret || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create webhook:", error);
      return NextResponse.json(
        { error: "Failed to create webhook endpoint" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error("Webhook error:", err);
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
        { error: "Webhook ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("webhook_endpoints")
      .update(updates)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update webhook:", error);
      return NextResponse.json(
        { error: "Failed to update webhook endpoint" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("Webhook update error:", err);
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
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return NextResponse.json(
        { error: "Webhook ID is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("webhook_endpoints")
      .delete()
      .eq("id", webhookId)
      .eq("operator_id", operator.id);

    if (error) {
      console.error("Failed to delete webhook:", error);
      return NextResponse.json(
        { error: "Failed to delete webhook endpoint" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook delete error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
