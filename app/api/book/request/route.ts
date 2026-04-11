import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

    const supabase = await createClient();

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

    // Send confirmation SMS if we have a lead ID and phone number
    if (leadId && phone) {
      try {
        const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
        await fetch(`${baseUrl}/api/book/confirm-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        });
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
