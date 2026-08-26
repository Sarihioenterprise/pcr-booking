/**
 * POST /api/support/contact
 *
 * Public endpoint: accepts support messages from operators, classifies intent,
 * stores in platform_support_tickets, and notifies Alton via Telegram.
 */
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyAlton } from "@/lib/telegram";
import { getStripe } from "@/lib/stripe";

type TicketType = "churn_risk" | "billing" | "bug" | "how_to" | "general";

function classifyIntent(subject: string, message: string): TicketType {
  const text = `${subject} ${message}`.toLowerCase();

  if (/cancel|refund/.test(text)) return "churn_risk";
  if (/billing|charge|payment/.test(text)) return "billing";
  if (/bug|broken|not working|error/.test(text)) return "bug";
  if (/\bhow\b|help|setup/.test(text)) return "how_to";
  return "general";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, userId } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: "name, email, and message are required" },
        { status: 400 }
      );
    }

    const ticketType = classifyIntent(subject ?? "", message);
    const supabase = createAdminClient();

    // Store ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("platform_support_tickets")
      .insert({
        user_id: userId ?? null,
        name,
        email,
        subject: subject ?? null,
        message,
        ticket_type: ticketType,
      })
      .select()
      .single();

    if (ticketError) {
      console.error("[support/contact] DB insert failed:", ticketError);
      return NextResponse.json({ error: "Failed to save ticket" }, { status: 500 });
    }

    // Auto-reply for how_to
    if (ticketType === "how_to") {
      await sendConfirmationEmail(email, name, ticket.id, {
        extraHtml: `<p>You can also check out our <a href="https://pcrbooking.com/setup-guide" style="color:#2EBD6B;">Setup Guide</a> — it walks through adding vehicles, setting availability, and activating your booking link.</p>`,
      });
    } else {
      await sendConfirmationEmail(email, name, ticket.id);
    }

    // Telegram alerts based on type
    if (ticketType === "churn_risk") {
      await supabase
        .from("platform_support_tickets")
        .update({ status: "escalated" })
        .eq("id", ticket.id);

      await notifyAlton(
        `🚨 <b>Churn Risk</b> — ${name} (${email})\n\n<b>Subject:</b> ${subject ?? "(none)"}\n\n${message.substring(0, 300)}`
      );
    } else if (ticketType === "billing") {
      let subInfo = "No subscription found";
      try {
        const stripe = getStripe();
        const customers = await stripe.customers.list({ email, limit: 1 });
        const customer = customers.data[0];
        if (customer) {
          const subs = await stripe.subscriptions.list({
            customer: customer.id,
            limit: 1,
          });
          const sub = subs.data[0];
          if (sub) {
            subInfo = `Status: ${sub.status} | Plan: ${sub.items.data[0]?.price?.lookup_key ?? sub.items.data[0]?.price?.id ?? "unknown"}`;
          }
        }
      } catch (err) {
        console.error("[support/contact] Stripe lookup failed:", err);
      }

      await notifyAlton(
        `💳 <b>Billing Support</b> — ${name} (${email})\n<i>${subInfo}</i>\n\n<b>Subject:</b> ${subject ?? "(none)"}\n\n${message.substring(0, 300)}`
      );
    } else if (ticketType === "bug") {
      await notifyAlton(
        `🐛 <b>Bug Report</b> — ${name} (${email})\n\n<b>Subject:</b> ${subject ?? "(none)"}\n\n${message.substring(0, 300)}`
      );
    }

    return NextResponse.json({ success: true, ticketId: ticket.id, ticketType });
  } catch (err) {
    console.error("[support/contact] Error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function sendConfirmationEmail(
  to: string,
  name: string,
  ticketId: string,
  opts?: { extraHtml?: string }
) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[support/contact] Resend not configured, skipping confirmation email to ${to}`);
    return;
  }

  const resend = new Resend(apiKey);
  const firstName = name.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
  <p>Hey ${firstName},</p>
  <p>We got your message and we're on it. You'll hear back within a few hours.</p>
  ${opts?.extraHtml ?? ""}
  <p>Reference: <code>${ticketId.slice(0, 8).toUpperCase()}</code></p>
  <p style="margin-top:32px;color:#6b7280;font-size:13px;">— Alton &amp; the PCR Booking team<br>
  Questions? Reply to this email.</p>
</body>
</html>
  `.trim();

  try {
    await resend.emails.send({
      from: "PCR Booking <support@pcrbooking.com>",
      to: [to],
      subject: "We got your message",
      html,
    });
  } catch (err) {
    console.error("[support/contact] Confirmation email failed:", err);
  }
}
