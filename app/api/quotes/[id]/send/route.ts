/**
 * POST /api/quotes/[id]/send
 *
 * Sends a quote to the customer via email (and optionally SMS).
 * Sets quote.status = 'sent', quote.sent_at = now().
 * Returns the updated quote.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const supabase = createAdminClient();

    // Fetch quote with vehicle details
    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select(`
        *,
        vehicles(id, make, model, year, photo_url)
      `)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchError || !quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (!quote.customer_email && !quote.customer_phone) {
      return NextResponse.json(
        { error: "Quote must have a customer email or phone to send" },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    const quoteUrl = `${baseUrl}/quotes/${quote.accept_token}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicleArr = quote.vehicles as any;
    const vehicle = Array.isArray(vehicleArr) ? vehicleArr[0] : vehicleArr;
    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "a rental vehicle";

    const customerName = quote.customer_name || "there";
    const total = Number(quote.total).toFixed(2);
    const expiresAt = quote.expires_at
      ? new Date(quote.expires_at).toLocaleDateString()
      : "7 days";

    // Send email if we have an address
    let emailSent = false;
    if (quote.customer_email) {
      const emailRes = await fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: quote.customer_email,
          subject: `${operator.business_name} has sent you a rental quote`,
          body: `
<p>Hi ${customerName},</p>

<p><strong>${operator.business_name}</strong> has prepared a rental quote for you.</p>

<table style="border-collapse:collapse;width:100%;margin:16px 0;">
  <tr>
    <td style="padding:8px 0;color:#6b7280;">Vehicle</td>
    <td style="padding:8px 0;font-weight:600;">${vehicleLabel}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;color:#6b7280;">Pickup Date</td>
    <td style="padding:8px 0;font-weight:600;">${quote.pickup_date}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;color:#6b7280;">Return Date</td>
    <td style="padding:8px 0;font-weight:600;">${quote.return_date}</td>
  </tr>
  <tr>
    <td style="padding:8px 0;color:#6b7280;">Duration</td>
    <td style="padding:8px 0;font-weight:600;">${quote.duration_days} day${quote.duration_days !== 1 ? "s" : ""}</td>
  </tr>
  <tr style="border-top:1px solid #e5e7eb;">
    <td style="padding:12px 0;font-weight:700;">Total</td>
    <td style="padding:12px 0;font-weight:700;font-size:18px;color:#2EBD6B;">$${total}</td>
  </tr>
</table>

${quote.notes ? `<p style="background:#f9fafb;padding:12px;border-radius:6px;font-size:14px;color:#374151;"><strong>Note from ${operator.business_name}:</strong><br>${quote.notes}</p>` : ""}

<p>This quote is valid until <strong>${expiresAt}</strong>.</p>

<p style="margin:24px 0;">
  <a href="${quoteUrl}" style="display:inline-block;background:#2EBD6B;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
    View &amp; Accept Quote →
  </a>
</p>

<p style="color:#6b7280;font-size:13px;">Clicking "Accept Quote" converts this into a confirmed reservation. You'll hear from ${operator.business_name} to coordinate pickup details.</p>
          `,
          templateType: "quote_sent",
        }),
      }).catch((e) => { console.error("Quote email error:", e); return null; });

      emailSent = !!emailRes?.ok;
    }

    // SMS if phone provided (graceful — Twilio may not be configured)
    let smsSent = false;
    if (quote.customer_phone) {
      try {
        const smsRes = await fetch(`${baseUrl}/api/sms/send`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: quote.customer_phone,
            body: `${operator.business_name} sent you a rental quote for ${vehicleLabel} ($${total}). View and accept here: ${quoteUrl}`,
          }),
        });
        smsSent = smsRes.ok;
      } catch (e) {
        console.error("Quote SMS error:", e);
      }
    }

    // Update quote status to 'sent'
    const { data: updatedQuote, error: updateError } = await supabase
      .from("quotes")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", id)
      .select(`
        *,
        vehicles(id, make, model, year, photo_url),
        renters(id, name, email, phone)
      `)
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      quote: updatedQuote,
      email_sent: emailSent,
      sms_sent: smsSent,
      quote_url: quoteUrl,
    });
  } catch (err) {
    console.error("POST /api/quotes/[id]/send error:", err);
    return NextResponse.json({ error: "Failed to send quote" }, { status: 500 });
  }
}
