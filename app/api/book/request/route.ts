import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Public endpoint — uses service role to bypass RLS on the leads table
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      operator_id,
      vehicle_id,
      vehicle_label,
      name,
      phone,
      email,
      start_date,
      end_date,
      license_file_path, // NEW: storage path from license upload
    } = body;

    if (!operator_id || !name || !phone) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // ── Availability / double-booking check (server-side enforcement) ────────
    if (vehicle_id && start_date && end_date) {
      const { data: conflicting } = await supabase
        .from("bookings")
        .select("id, start_date, end_date, status")
        .eq("vehicle_id", vehicle_id)
        .eq("operator_id", operator_id)
        .in("status", ["confirmed", "active", "pending"])
        .or(
          // Overlap: existing.start < requested.end AND existing.end > requested.start
          `and(start_date.lt.${end_date},end_date.gt.${start_date})`
        );

      if (conflicting && conflicting.length > 0) {
        return NextResponse.json(
          {
            error: "Those dates are not available for this vehicle. Please choose different dates.",
            conflictingBookings: conflicting.length,
          },
          { status: 409 }
        );
      }
    }

    // ── Blacklist check ──────────────────────────────────────────────────────
    try {
      const orParts = [
        email ? `email.eq.${email}` : null,
        phone ? `phone.eq.${phone}` : null,
      ].filter(Boolean);

      if (orParts.length > 0) {
        const { data: blacklistedRenter } = await supabase
          .from("blacklisted_renters")
          .select("id")
          .eq("operator_id", operator_id)
          .or(orParts.join(","))
          .maybeSingle();

        if (blacklistedRenter) {
          return NextResponse.json(
            { error: "Unable to process booking request." },
            { status: 400 }
          );
        }
      }
    } catch {
      // Table may not exist - silently skip
    }

    const datesNote = start_date && end_date
      ? `${start_date} to ${end_date}`
      : start_date || "";

    // ── Upsert renter record with license URL ────────────────────────────────
    if (license_file_path) {
      try {
        const orParts = [
          email ? `email.eq.${email}` : null,
          phone ? `phone.eq.${phone}` : null,
        ].filter(Boolean);

        let existingRenterId: string | null = null;

        if (orParts.length > 0) {
          const { data: existingRenter } = await supabase
            .from("renters")
            .select("id")
            .eq("operator_id", operator_id)
            .or(orParts.join(","))
            .maybeSingle();

          if (existingRenter) {
            existingRenterId = existingRenter.id;
            // Update existing renter's license URL
            await supabase
              .from("renters")
              .update({ drivers_license_url: license_file_path })
              .eq("id", existingRenterId);
          }
        }

        if (!existingRenterId) {
          // Create new renter with license
          await supabase.from("renters").insert({
            operator_id,
            name,
            phone: phone || null,
            email: email || null,
            drivers_license_url: license_file_path,
          });
        }
      } catch (renterErr) {
        // Non-fatal — renter upsert failure doesn't block the lead creation
        console.error("Renter upsert error (non-fatal):", renterErr);
      }
    }

    // ── Insert lead record ───────────────────────────────────────────────────
    let leadId: string | null = null;

    const baseLeadData = {
      operator_id,
      name,
      phone: phone || null,
      email: email || null,
      dates_requested: vehicle_label ? `${vehicle_label} | ${datesNote}` : datesNote,
      stage: "new",
      source: "booking_widget",
    };

    // Try inserting with license_file_path column (available after migration 016)
    const { data: leadData, error } = await supabase
      .from("leads")
      .insert({
        ...baseLeadData,
        // Conditionally include license_file_path — column exists post-migration
        ...(license_file_path ? { license_file_path } : {}),
      })
      .select("id");

    if (error) {
      // Column may not exist yet (migration pending) — retry without it
      const { data: simpleLead, error: err2 } = await supabase
        .from("leads")
        .insert({
          operator_id,
          name,
          phone: phone || null,
          email: email || null,
          stage: "new",
          source: "booking_widget",
        })
        .select("id");

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

    // ── Fetch operator for notifications ─────────────────────────────────────
    let operatorName = "the rental company";
    try {
      const { data: op } = await supabase
        .from("operators")
        .select("business_name, business_email")
        .eq("id", operator_id)
        .single();
      if (op) {
        operatorName = op.business_name;

        if (op.business_email) {
          const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
          const licenseNote = license_file_path
            ? "<p><strong>✅ Driver's license uploaded</strong> — visible in your leads dashboard.</p>"
            : "";
          fetch(`${baseUrl}/api/email/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: op.business_email,
              subject: `New Booking Request: ${name}`,
              body: `<p>A new booking request has been submitted via your booking page.</p>
<p><strong>Name:</strong> ${name}</p>
<p><strong>Phone:</strong> ${phone}</p>
${email ? `<p><strong>Email:</strong> ${email}</p>` : ""}
${vehicle_label ? `<p><strong>Vehicle:</strong> ${vehicle_label}</p>` : ""}
${datesNote ? `<p><strong>Dates:</strong> ${datesNote}</p>` : ""}
${licenseNote}
<p><a href="https://pcrbooking.com/dashboard/leads">View leads &rarr;</a></p>`,
              templateType: "operator_lead_notification",
            }),
          }).catch(() => {});
        }
      }
    } catch {
      // Non-fatal
    }

    // ── Customer confirmation email ───────────────────────────────────────────
    if (email) {
      const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: email,
          subject: "Booking Request Received",
          body: `<p>Hi ${name},</p>
<p>Your booking request with <strong>${operatorName}</strong> has been received!</p>
${vehicle_label ? `<p><strong>Vehicle:</strong> ${vehicle_label}</p>` : ""}
<p><strong>Requested dates:</strong> ${datesNote || "To be confirmed"}</p>
${license_file_path ? "<p>✅ Your driver's license has been submitted successfully.</p>" : ""}
<p>${operatorName} will contact you shortly to confirm your reservation.</p>
<p>Thank you!</p>`,
          templateType: "customer_booking_confirmation",
        }),
      }).catch(() => {});
    }

    // ── Confirmation SMS ──────────────────────────────────────────────────────
    if (leadId && phone) {
      try {
        const baseUrl = request.headers.get("origin") || "https://pcrbooking.com";
        fetch(`${baseUrl}/api/book/confirm-sms`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId }),
        }).catch(() => {});
      } catch {
        // Non-fatal
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
