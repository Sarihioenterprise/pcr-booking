import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { to, subject, body, templateType } = await request.json();

    if (!to || !subject || !body) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, body" },
        { status: 400 }
      );
    }

    // For now, log emails to console (in production, integrate with Resend, SendGrid, or Twilio)
    console.log(`📧 Email sent to ${to}`, {
      to,
      subject,
      body,
      templateType,
      sentAt: new Date().toISOString(),
    });

    // In production, use: Resend, SendGrid, or AWS SES
    // const resend = new Resend(process.env.RESEND_API_KEY);
    // const result = await resend.emails.send({
    //   from: "noreply@pcr-booking.com",
    //   to,
    //   subject,
    //   html: body,
    // });

    return NextResponse.json({
      success: true,
      message: `Email sent to ${to}`,
    });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
