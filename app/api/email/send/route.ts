import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";

const FROM_EMAIL = "PCR Booking <notifications@pcrbooking.com>";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { to, subject, body, templateType } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY;

    // If no API key configured, log and return success (non-fatal)
    if (!apiKey) {
      console.log(`📧 [Email stub — RESEND_API_KEY not set] To: ${to} | Subject: ${subject} | Type: ${templateType ?? "general"}`);
      return NextResponse.json({
        success: true,
        message: `Email queued (no provider key) — add RESEND_API_KEY to send real emails`,
        stub: true,
      });
    }

    const resend = new Resend(apiKey);

    const html = wrapTemplate(subject, body);

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json(
        { error: error.message ?? "Failed to send email" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to send email";
    console.error("Email send error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Wrap the body HTML in a clean branded template.
 */
function wrapTemplate(subject: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
          <!-- Header -->
          <tr>
            <td style="background:#2EBD6B;padding:24px 32px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">PCR Booking</p>
              <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Private Car Rental Management</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#111827;">${subject}</h2>
              <div style="font-size:15px;line-height:1.6;color:#374151;">
                ${body}
              </div>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                This email was sent by <a href="https://pcrbooking.com" style="color:#2EBD6B;text-decoration:none;">PCR Booking</a>.
                If you have questions, visit <a href="https://pcrbooking.com" style="color:#2EBD6B;text-decoration:none;">pcrbooking.com</a>.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
