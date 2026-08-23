/**
 * POST /api/payments/request-link/[id]/send-email
 *
 * Operator-only. Sends the payment link to the renter's email.
 *
 * Body: { to_email: string }
 * Returns: { success: true }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const body = await request.json();
    const { to_email } = body;

    if (!to_email) {
      return NextResponse.json({ error: "to_email is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Fetch payment request, verify it belongs to this operator
    const { data: pr, error: prError } = await supabase
      .from("payment_requests")
      .select(`
        id,
        token,
        label,
        amount_cents,
        currency,
        status,
        expires_at,
        bookings (
          renter_name,
          start_date,
          end_date,
          vehicles (
            make,
            model,
            year
          )
        )
      `)
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (prError || !pr) {
      return NextResponse.json({ error: "Payment request not found" }, { status: 404 });
    }

    if (pr.status !== "pending") {
      return NextResponse.json(
        { error: `Cannot send email for a ${pr.status} payment request` },
        { status: 400 }
      );
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
    const payUrl = `${baseUrl}/pay/${pr.token}`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const booking = pr.bookings as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const vehicle = booking?.vehicles as any;
    const renterName = booking?.renter_name ?? "Customer";
    const vehicleLabel = vehicle
      ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
      : "your rental vehicle";
    const amountFormatted = `$${(pr.amount_cents / 100).toFixed(2)}`;
    const startDate = booking?.start_date ?? "";
    const endDate = booking?.end_date ?? "";

    const emailBody = `<p>Hi ${renterName},</p>

<p><strong>${operator.business_name}</strong> has sent you a payment request.</p>

<table style="border:none;background:#f9f9f9;border-radius:8px;padding:16px;width:100%;max-width:480px;">
  <tr>
    <td style="padding:6px 0;color:#555;font-size:14px;">Vehicle:</td>
    <td style="padding:6px 0;font-weight:600;font-size:14px;">${vehicleLabel}</td>
  </tr>
  ${startDate && endDate ? `<tr>
    <td style="padding:6px 0;color:#555;font-size:14px;">Rental Dates:</td>
    <td style="padding:6px 0;font-weight:600;font-size:14px;">${startDate} – ${endDate}</td>
  </tr>` : ""}
  <tr>
    <td style="padding:6px 0;color:#555;font-size:14px;">Amount Due:</td>
    <td style="padding:6px 0;font-weight:700;font-size:18px;color:#2EBD6B;">${amountFormatted}</td>
  </tr>
</table>

<p style="margin:24px 0;">
  <a href="${payUrl}" style="display:inline-block;background:#2EBD6B;color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px;">
    Pay ${amountFormatted} Securely →
  </a>
</p>

<p style="color:#6b7280;font-size:13px;">⏰ This payment link expires in 72 hours.</p>
<p style="color:#6b7280;font-size:13px;">If you have questions, contact ${operator.business_name} directly.</p>`;

    // Send via existing email API
    const emailRes = await fetch(`${baseUrl}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: to_email,
        subject: `Payment Request from ${operator.business_name} — ${amountFormatted}`,
        body: emailBody,
        templateType: "payment_request",
      }),
    });

    if (!emailRes.ok) {
      const errData = await emailRes.json().catch(() => ({}));
      console.error("Email send failed:", errData);
      return NextResponse.json(
        { error: (errData as { error?: string }).error ?? "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-email route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
