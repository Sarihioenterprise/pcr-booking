import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

const AUTO_RESOLVE_PATTERNS: Record<string, { keywords: string[]; response: string }> = {
  password: {
    keywords: ["password", "login", "can't access", "can't sign in", "forgot password"],
    response:
      "To reset your password, click **Forgot Password** on the login page at **pcrbooking.com/auth/login**. Enter your email and follow the reset link. If you still need help, reply and we'll assist.",
  },
  payment: {
    keywords: ["payment", "charge", "billing", "invoice", "card"],
    response:
      "For billing questions, please contact **support@pcrbooking.com** or check your Stripe invoice in your account settings. We're happy to help with any billing inquiries.",
  },
  cancel: {
    keywords: ["cancel", "unsubscribe", "stop subscription"],
    response:
      "To cancel your subscription, go to **Dashboard > Settings > Billing** and click **Cancel Subscription**. You'll keep access until the end of your current billing period.",
  },
  booking: {
    keywords: ["booking", "add booking", "create booking", "new booking"],
    response:
      "To add a booking, go to **Dashboard > Bookings > New Booking**. You can manually create bookings or customers can use your embedded booking widget to request one.",
  },
  fleet: {
    keywords: ["fleet", "add car", "add vehicle", "vehicle", "vehicle management"],
    response:
      "To add vehicles to your fleet, go to **Dashboard > Fleet > Add Vehicle**. Set your daily rates, upload photos, and toggle availability.",
  },
  widget: {
    keywords: ["widget", "embed", "booking form", "booking widget"],
    response:
      "To get your booking widget code, go to **Dashboard > Settings > Widget**. Copy the embed code and paste it on your website. Your booking form will appear instantly.",
  },
  help: {
    keywords: ["how", "help", "how do i", "how to", "getting started"],
    response:
      "I can help with many topics! Here are common questions:\n• **Pricing & plans** — Our 4 plans for every business size\n• **Booking setup** — How to add bookings and vehicles\n• **Widget** — Embedding the booking form\n• **Billing** — Subscription and payment questions\n\nWhat would you like help with?",
  },
};

export async function POST(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const body = await request.json();

    const { ticketId, subject, message } = body;

    if (!ticketId || !subject || !message) {
      return NextResponse.json(
        { error: "ticketId, subject, and message are required" },
        { status: 400 }
      );
    }

    // Check if ticket exists and belongs to operator
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("operator_id", operator.id)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: "Ticket not found" },
        { status: 404 }
      );
    }

    // Scan for patterns
    const combined = `${subject} ${message}`.toLowerCase();
    let matchedCategory = null;
    let resolvedResponse = null;

    for (const [category, { keywords, response }] of Object.entries(AUTO_RESOLVE_PATTERNS)) {
      if (keywords.some((kw) => combined.includes(kw))) {
        matchedCategory = category;
        resolvedResponse = response;
        break;
      }
    }

    if (!resolvedResponse) {
      // No pattern matched
      return NextResponse.json({
        resolved: false,
        response: null,
      });
    }

    // Insert auto-resolve message
    const { data: messageData, error: messageError } = await supabase
      .from("ticket_messages")
      .insert({
        ticket_id: ticketId,
        sender_type: "operator",
        sender_name: "PCR Booking AI",
        content: resolvedResponse,
        is_auto_resolved: true,
      })
      .select()
      .single();

    if (messageError) {
      console.error("Failed to insert auto-resolve message:", messageError);
      return NextResponse.json(
        { error: "Failed to create auto-resolve message" },
        { status: 500 }
      );
    }

    // Update ticket status to in_progress and set auto_resolved flag
    const { error: updateError } = await supabase
      .from("support_tickets")
      .update({
        status: "in_progress",
        auto_resolved: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (updateError) {
      console.error("Failed to update ticket:", updateError);
      return NextResponse.json(
        { error: "Failed to update ticket" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      resolved: true,
      response: resolvedResponse,
      messageId: messageData?.id,
    });
  } catch (err) {
    console.error("Auto-resolve error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
