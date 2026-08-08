import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — uses service role to bypass RLS on the leads table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operator_id, vehicle_id, vehicle_label, name, phone, email, start_date, end_date } = body;

    if (!operator_id || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if renter is blacklisted
    try {
      const { data: blacklistedRenter } = await supabase
        .from("blacklisted_renters")
        .select("id")
        .eq("operator_id", operator_id)
        .or(`email.eq.${email},phone.eq.${phone}`)
        .maybeSingle();

      if (blacklistedRenter) {
        return NextResponse.json(
          { error: "Unable to process booking request." },
          { status: 400 }
        );
      }
    } catch {
      // Table may not exist - silently skip this check
    }

    const datesNote = start_date && end_date
      ? `${start_date} to ${end_date}`
      : start_date || "";

    // Insert as a lead
    const { data: leadData, error } = await supabase.from("leads").insert({
      operator_id,
      name,
      phone: phone || null,
      email: email || null,
      dates_requested: vehicle_label ? `${vehicle_label} | ${datesNote}` : datesNote,
      stage: "new",
    }).select("id");

    let leadId: string | null = null;

    if (error) {
      // If the leads table has strict constraints, try a simpler insert
      const { data: simpleLead, error: err2 } = await supabase.from("leads").insert({
        operator_id,
        name,
        phone: phone || null,
        email: email || null,
        stage: "new",
        source: "booking_widget",
      }).select("id");

      if (err2) {
        return NextResponse.json({ error: err2.message }, { status: 500 });
      }

      if (simpleLead && simpleLead.length > 0) {
        leadId = simpleLead[0].id;
      }
    } else {
      if (leadData && leadData.length > 0) {
        leadId = leadData[0].id;
      }
    }

    // Fetch operator name for notifications
    let operatorName = "the rental company";
    try {
      const { data: op } = await supabase
        .from("operators")
        .select("business_name, business_email")
        .eq("id", operator_id)
        .single();
      if (op) {
        operatorName = op.business_name;

        // Notify operator by email (fire-and-forget)
        if (op.business_email) {
          const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
          fetch(`${baseUrl}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: op.business_email,
              subject: `New Booking Request: ${name}`,
              body: `<p>A new booking request has been submitted via your booking page.</p><p><strong>Name:</strong> ${name}</p><p><strong>Phone:</strong> ${phone}</p>${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}${vehicle_label ? `<p><strong>Vehicle:</strong> ${vehicle_label}</p>` : ""}${datesNote ? `<p><strong>Dates:</strong> ${datesNote}</p>` : ""}<p><a href="https://pcrbooking.com/dashboard/leads">View leads &rarr;</a></p>`,
              templateType: "operator_lead_notification",
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // Non-fatal
    }

    // Send customer confirmation email (fire-and-forget)
    if (email) {
      const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Booking Request Received",
          body: `<p>Hi ${name},</p><p>Your booking request with <strong>${operatorName}</strong> has been received!</p>${vehicle_label ? `<p><strong>Vehicle:</strong> ${vehicle_label}</p>` : ""}<p><strong>Requested dates:</strong> ${datesNote || "To be confirmed"}</p><p>${operatorName} will contact you shortly to confirm your reservation.</p><p>Thank you!</p>`,
          templateType: "customer_booking_confirmation",
        }),
      }).catch(() => {});
    }

    // Send confirmation SMS if we have a lead ID and phone number
    if (leadId && phone) {
      try {
        const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
        fetch(`${baseUrl}/api/book/confirm-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        }).catch((err) => console.error("SMS confirmation failed:", err));
      } catch (err) {
        // SMS failure doesn't break the booking - log but continue
        console.error("SMS confirmation failed:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
