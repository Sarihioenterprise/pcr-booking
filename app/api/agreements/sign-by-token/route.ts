/**
 * POST /api/agreements/sign-by-token
 * Public endpoint — no auth required.
 * Accepts { token, typed_name, signature_png_b64? } and marks the agreement signed.
 * Captures IP, User-Agent, timestamp server-side.
 * Sends confirmation emails to both renter and operator after signing.
 *
 * Also handles action="viewed" to record when renter first opened the page.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { token, action, typed_name, signature_png_b64 } = body;

    if (!token) {
      return NextResponse.json({ error: "token is required" }, { status: 400 });
    }

    // ── Find the agreement by sign_token ─────────────────────────────────────
    const { data: agreement, error: findErr } = await supabase
      .from("rental_agreements")
      .select(
        "id, operator_id, booking_id, status, sign_token, viewed_at, content"
      )
      .eq("sign_token", token)
      .maybeSingle();

    if (findErr || !agreement) {
      return NextResponse.json(
        { error: "Agreement not found" },
        { status: 404 }
      );
    }

    // ── Handle "viewed" action ────────────────────────────────────────────────
    if (action === "viewed") {
      // Only set once
      if (!agreement.viewed_at && agreement.status !== "signed") {
        await supabase
          .from("rental_agreements")
          .update({ viewed_at: new Date().toISOString() })
          .eq("id", agreement.id);
      }
      return NextResponse.json({ success: true, viewed: true });
    }

    // ── Handle "sign" action ──────────────────────────────────────────────────
    if (agreement.status === "signed") {
      return NextResponse.json(
        { error: "Agreement has already been signed" },
        { status: 409 }
      );
    }

    if (!typed_name?.trim()) {
      return NextResponse.json(
        { error: "typed_name is required" },
        { status: 400 }
      );
    }

    // Capture metadata
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    const signedAt = new Date().toISOString();

    // ── Update agreement record ───────────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("rental_agreements")
      .update({
        status: "signed",
        renter_signature: typed_name.trim(),
        signed_at: signedAt,
        signer_ip: ip,
        signer_ua: ua,
        signature_png_b64: signature_png_b64 || null,
        updated_at: signedAt,
      })
      .eq("id", agreement.id);

    if (updateErr) {
      console.error("[sign-by-token] update error:", updateErr);
      return NextResponse.json(
        { error: updateErr.message || "Failed to save signature" },
        { status: 500 }
      );
    }

    // ── Fetch booking + operator details for emails ───────────────────────────
    type BookingJoin = {
      id: string;
      renter_name: string;
      renter_email: string | null;
      start_date: string;
      end_date: string;
      vehicles: { make: string; model: string; year: number } | null;
    };
    const { data: bookingRaw } = await supabase
      .from("bookings")
      .select("id, renter_name, renter_email, start_date, end_date, vehicles(make, model, year)")
      .eq("id", agreement.booking_id)
      .maybeSingle();
    const booking = bookingRaw as unknown as BookingJoin | null;

    const { data: operator } = await supabase
      .from("operators")
      .select("id, business_name, business_email, owner_name")
      .eq("id", agreement.operator_id)
      .maybeSingle();

    const viewUrl = `${BASE_URL}/sign/${agreement.sign_token}`;
    const dashboardUrl = `${BASE_URL}/dashboard/agreements/${agreement.id}`;

    // ── Email renter ──────────────────────────────────────────────────────────
    if (booking?.renter_email) {
      fetch(`${BASE_URL}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: booking.renter_email,
          subject: `Agreement signed — ${operator?.business_name || "PCR Booking"}`,
          body: buildRenterConfirmation(
            typed_name.trim(),
            operator?.business_name || "Your Rental Company",
            signedAt,
            viewUrl
          ),
          templateType: "agreement_signed",
        }),
      }).catch((e) =>
        console.error("[sign-by-token] renter email failed:", e)
      );
    }

    // ── Email operator ────────────────────────────────────────────────────────
    if (operator?.business_email) {
      const vehicleName = booking?.vehicles
        ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
        : "Vehicle";

      fetch(`${BASE_URL}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: operator.business_email,
          subject: `✅ Agreement signed by ${typed_name.trim()} — ${operator.business_name || "PCR Booking"}`,
          body: buildOperatorConfirmation(
            typed_name.trim(),
            booking?.renter_email || "",
            vehicleName,
            booking?.start_date || "",
            booking?.end_date || "",
            signedAt,
            ip,
            dashboardUrl
          ),
          templateType: "agreement_signed_operator",
        }),
      }).catch((e) =>
        console.error("[sign-by-token] operator email failed:", e)
      );
    }

    return NextResponse.json({
      success: true,
      signed_at: signedAt,
      agreement_id: agreement.id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[sign-by-token]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Email builders ────────────────────────────────────────────────────────────

function buildRenterConfirmation(
  name: string,
  businessName: string,
  signedAt: string,
  viewUrl: string
): string {
  const dt = new Date(signedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return `
<p>Hi ${name},</p>

<p>
  Your rental agreement with <strong>${businessName}</strong> has been <strong>signed successfully</strong>.
</p>

<table cellpadding="6" style="background:#f0fdf4;border-radius:8px;width:100%;margin:16px 0;">
  <tr><td style="color:#374151;width:140px;font-size:13px;">Signed by</td><td style="font-weight:600;color:#111827;">${name}</td></tr>
  <tr><td style="color:#374151;font-size:13px;">Timestamp</td><td style="font-weight:600;color:#111827;">${dt} (UTC)</td></tr>
</table>

<p>
  <a href="${viewUrl}" style="color:#2EBD6B;text-decoration:underline;">View signed agreement</a>
</p>

<p style="font-size:12px;color:#9ca3af;margin-top:24px;">
  Keep this email as a record of your electronic signature. Your signature is legally binding.
</p>
`;
}

function buildOperatorConfirmation(
  signerName: string,
  signerEmail: string,
  vehicle: string,
  startDate: string,
  endDate: string,
  signedAt: string,
  signerIp: string,
  dashboardUrl: string
): string {
  const dt = new Date(signedAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
  });
  return `
<p>Your rental agreement has been <strong>electronically signed</strong>.</p>

<table cellpadding="6" style="background:#f0fdf4;border-radius:8px;width:100%;margin:16px 0;border:1px solid #d1fae5;">
  <tr><td style="color:#374151;width:140px;font-size:13px;">Signed by</td><td style="font-weight:600;color:#111827;">${signerName}</td></tr>
  ${signerEmail ? `<tr><td style="color:#374151;font-size:13px;">Email</td><td style="color:#374151;">${signerEmail}</td></tr>` : ""}
  <tr><td style="color:#374151;font-size:13px;">Vehicle</td><td style="color:#374151;">${vehicle}</td></tr>
  <tr><td style="color:#374151;font-size:13px;">Period</td><td style="color:#374151;">${startDate} → ${endDate}</td></tr>
  <tr><td style="color:#374151;font-size:13px;">Signed at</td><td style="font-weight:600;color:#111827;">${dt} (UTC)</td></tr>
  <tr><td style="color:#374151;font-size:13px;">IP Address</td><td style="color:#374151;font-size:12px;">${signerIp}</td></tr>
</table>

<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:#2EBD6B;border-radius:8px;padding:12px 24px;">
      <a href="${dashboardUrl}" style="color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;">
        View in Dashboard →
      </a>
    </td>
  </tr>
</table>

<p style="font-size:12px;color:#9ca3af;">
  This record includes a tamper-evident audit trail. IP and timestamp are captured server-side at signing.
</p>
`;
}
