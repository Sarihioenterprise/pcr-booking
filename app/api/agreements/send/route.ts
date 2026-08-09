/**
 * POST /api/agreements/send
 * Generates an agreement from the operator's default template (if none exists),
 * assigns a sign_token, marks status='sent', and emails the renter a signing link.
 *
 * Body: { booking_id: string, resend?: boolean }
 * Auth: operator session required.
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("NEXT_REDIRECT") ||
      (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { booking_id, resend = false } = body;

    if (!booking_id) {
      return NextResponse.json(
        { error: "booking_id is required" },
        { status: 400 }
      );
    }

    // ── Fetch booking ────────────────────────────────────────────────────────
    type BookingRow = {
      id: string;
      renter_name: string;
      renter_email: string | null;
      start_date: string;
      end_date: string;
      daily_rate: number;
      total_price: number;
      deposit_amount: number | null;
      duration_days: number;
      vehicles: { make: string; model: string; year: number } | null;
    };

    const { data: booking, error: bkErr } = await supabase
      .from("bookings")
      .select(
        "id, renter_name, renter_email, start_date, end_date, daily_rate, total_price, deposit_amount, duration_days, vehicles(make, model, year)"
      )
      .eq("id", booking_id)
      .eq("operator_id", operator.id)
      .single();

    if (bkErr || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const typedBooking = booking as unknown as BookingRow;

    if (!typedBooking.renter_email) {
      return NextResponse.json(
        { error: "Renter has no email address on record" },
        { status: 400 }
      );
    }

    // ── Find or create agreement ─────────────────────────────────────────────
    let agreement: {
      id: string;
      sign_token: string | null;
      status: string;
      content: string;
    } | null = null;

    // Look for existing unsigned agreement for this booking
    if (!resend) {
      const { data: existing } = await supabase
        .from("rental_agreements")
        .select("id, sign_token, status, content")
        .eq("booking_id", booking_id)
        .in("status", ["draft", "sent"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      agreement = existing ?? null;
    } else {
      // Resend: find the most recent agreement (any non-signed status)
      const { data: existing } = await supabase
        .from("rental_agreements")
        .select("id, sign_token, status, content")
        .eq("booking_id", booking_id)
        .neq("status", "signed")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      agreement = existing ?? null;
    }

    // If no existing agreement, generate from default template
    if (!agreement) {
      const { data: template } = await supabase
        .from("agreement_templates")
        .select("id, content")
        .eq("operator_id", operator.id)
        .eq("is_default", true)
        .maybeSingle();

      const vehicleName = typedBooking.vehicles
        ? `${typedBooking.vehicles.year} ${typedBooking.vehicles.make} ${typedBooking.vehicles.model}`
        : "Vehicle";

      let content = template?.content || buildFallbackTemplate();

      // Merge fields
      const dailyRate = `$${Number(typedBooking.daily_rate).toFixed(2)}`;
      const total = `$${Number(typedBooking.total_price).toFixed(2)}`;
      const deposit = typedBooking.deposit_amount
        ? `$${Number(typedBooking.deposit_amount).toFixed(2)}`
        : "$0.00";

      content = content
        .replace(/\{\{renter_name\}\}/g, typedBooking.renter_name || "")
        .replace(/\{\{vehicle\}\}/g, vehicleName)
        .replace(/\{\{start_date\}\}/g, typedBooking.start_date)
        .replace(/\{\{end_date\}\}/g, typedBooking.end_date)
        .replace(/\{\{daily_rate\}\}/g, dailyRate)
        .replace(/\{\{total\}\}/g, total)
        .replace(/\{\{total_price\}\}/g, total)
        .replace(/\{\{deposit_amount\}\}/g, deposit)
        .replace(/\{\{business_name\}\}/g, operator.business_name || "Your Rental Company")
        .replace(/\{\{addons\}\}/g, ""); // TODO: populate add-ons when present

      const { data: created, error: createErr } = await supabase
        .from("rental_agreements")
        .insert({
          operator_id: operator.id,
          booking_id,
          template_id: template?.id ?? null,
          content,
          status: "draft",
        })
        .select("id, sign_token, status, content")
        .single();

      if (createErr || !created) {
        return NextResponse.json(
          { error: createErr?.message || "Failed to create agreement" },
          { status: 500 }
        );
      }
      agreement = created;
    }

    // ── Ensure sign_token is present (may be null on old rows) ───────────────
    if (!agreement.sign_token) {
      const { data: updated } = await supabase
        .from("rental_agreements")
        .update({ sign_token: crypto.randomUUID() })
        .eq("id", agreement.id)
        .select("id, sign_token, status, content")
        .single();
      if (updated) agreement = updated;
    }

    // ── Mark as sent ─────────────────────────────────────────────────────────
    await supabase
      .from("rental_agreements")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", agreement.id);

    // ── Send email to renter ─────────────────────────────────────────────────
    const signUrl = `${BASE_URL}/sign/${agreement.sign_token}`;
    const emailBody = buildRenterEmail(typedBooking.renter_name, signUrl, operator.business_name || "Your Rental Company", typedBooking.start_date, typedBooking.end_date);

    await fetch(`${BASE_URL}/api/email/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: typedBooking.renter_email,
        subject: `Please sign your rental agreement — ${operator.business_name || "PCR Booking"}`,
        body: emailBody,
        templateType: "agreement_sent",
      }),
    });

    return NextResponse.json({
      success: true,
      agreement_id: agreement.id,
      sign_token: agreement.sign_token,
      sign_url: signUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[agreements/send]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Fallback template if no default is set ───────────────────────────────────
function buildFallbackTemplate(): string {
  return `VEHICLE RENTAL AGREEMENT

This Vehicle Rental Agreement is entered into between:

RENTAL COMPANY: {{business_name}}
RENTER: {{renter_name}}

VEHICLE: {{vehicle}}
RENTAL PERIOD: {{start_date}} through {{end_date}}
DAILY RATE: {{daily_rate}}
TOTAL AMOUNT: {{total}}

By signing below, Renter agrees to return the vehicle in the same condition received,
to be responsible for all damages, and to adhere to all traffic laws during the rental period.
Renter confirms they hold valid automobile insurance.

⚠️ This is a minimal fallback template. Create a proper template in Dashboard > Agreements > Templates.

Renter: {{renter_name}}    Date: {{start_date}}`;
}

// ── Email body builder ───────────────────────────────────────────────────────
function buildRenterEmail(
  renterName: string,
  signUrl: string,
  businessName: string,
  startDate: string,
  endDate: string
): string {
  return `
<p>Hi ${renterName},</p>

<p>Your rental agreement with <strong>${businessName}</strong> is ready for your signature.</p>

<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr>
    <td style="background:#2EBD6B;border-radius:8px;padding:14px 28px;">
      <a href="${signUrl}" style="color:#ffffff;font-weight:700;font-size:16px;text-decoration:none;">
        ✍️ Sign Agreement
      </a>
    </td>
  </tr>
</table>

<p style="font-size:13px;color:#6b7280;">
  Or copy this link: <a href="${signUrl}" style="color:#2EBD6B;">${signUrl}</a>
</p>

<p style="margin-top:24px;font-size:13px;color:#374151;">
  <strong>Rental Period:</strong> ${startDate} → ${endDate}
</p>

<p style="font-size:13px;color:#6b7280;">
  This link is unique to you. Please do not share it. Your signature is legally binding.
  If you have questions, contact ${businessName} directly.
</p>
`;
}
