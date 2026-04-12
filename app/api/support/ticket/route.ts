import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function POST(req: NextRequest) {
  try {
    const operator = await getOperator();

    const { subject, message } = await req.json();

    if (!subject || typeof subject !== "string") {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Create the support ticket
    // Note: the support_tickets table requires renter_name — we use the business name for operator-submitted tickets
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        operator_id: operator.id,
        subject: subject.trim(),
        renter_name: operator.business_name || operator.owner_name || "Operator",
        renter_email: operator.business_email || null,
        status: "open",
        priority: "normal",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to create support ticket:", error);
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    // Add the message as the first ticket message
    const { error: msgError } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_type: "operator",
      sender_name: operator.business_name || operator.owner_name || "Operator",
      content: message.trim(),
    });

    if (msgError) {
      console.error("Failed to add ticket message:", msgError);
      // Ticket was created — don't fail, just log
    }

    return NextResponse.json({ success: true, ticketId: ticket.id }, { status: 201 });
  } catch (err) {
    console.error("Support ticket error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
