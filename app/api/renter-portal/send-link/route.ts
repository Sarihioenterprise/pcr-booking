import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { signMagicToken } from "@/lib/renter-portal-jwt";
import { Resend } from "resend";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? "https://pcrbooking.com";
const FROM_EMAIL = "PCR Booking <notifications@pcrbooking.com>";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Look up renter by email
    const supabase = createAdminClient();
    const { data: renter, error } = await supabase
      .from("renters")
      .select("id, name, email, operator_id")
      .eq("email", normalizedEmail)
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("[renter-portal/send-link] DB error:", error);
    }

    // Always return success to prevent email enumeration
    if (!renter) {
      console.log(
        `[renter-portal/send-link] No renter found for: ${normalizedEmail}`
      );
      return NextResponse.json({
        success: true,
        message: "If an account exists, a login link has been sent.",
      });
    }

    // Generate magic link token (15 min)
    const token = await signMagicToken(renter.id, renter.email);
    const magicLinkUrl = `${APP_URL}/api/renter-portal/verify?token=${encodeURIComponent(token)}`;

    // Send email
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      // Dev fallback — log the link
      console.log(
        `[renter-portal/send-link] STUB (no RESEND_API_KEY) Magic link for ${normalizedEmail}:\n${magicLinkUrl}`
      );
      return NextResponse.json({ success: true, stub: true });
    }

    const resend = new Resend(apiKey);
    const firstName = renter.name?.split(" ")[0] ?? "there";

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:32px 16px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:40px;box-shadow:0 1px 3px rgba(0,0,0,.08)">
    <div style="margin-bottom:28px">
      <span style="font-size:24px;font-weight:700;color:#111">PCR Booking</span>
    </div>
    <h1 style="font-size:22px;font-weight:600;color:#111;margin:0 0 12px">Your login link</h1>
    <p style="color:#555;line-height:1.6;margin:0 0 28px">
      Hi ${firstName},<br><br>
      Click the button below to access your rental account. This link expires in <strong>15 minutes</strong>.
    </p>
    <a href="${magicLinkUrl}"
       style="display:inline-block;background:#2EBD6B;color:#fff;font-weight:600;font-size:15px;text-decoration:none;padding:14px 28px;border-radius:8px;margin-bottom:24px">
      Access My Account →
    </a>
    <p style="color:#888;font-size:13px;margin:0">
      If you didn't request this, you can safely ignore this email.
    </p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:24px 0">
    <p style="color:#aaa;font-size:12px;margin:0">
      PCR Booking &mdash; Rental management made simple
    </p>
  </div>
</body>
</html>`;

    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [renter.email],
      subject: "Your PCR Booking login link",
      html,
    });

    if (emailError) {
      console.error("[renter-portal/send-link] Email error:", emailError);
      return NextResponse.json(
        { error: "Failed to send email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[renter-portal/send-link] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
