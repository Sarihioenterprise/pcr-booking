import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AddonSnapshot } from "@/lib/types";

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
      license_file_path, // Storage path from license upload
      selected_addon_ids = [], // Array of addon IDs selected by renter (client hint only)
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

    // ── Server-side add-on price computation ─────────────────────────────────
    // Never trust client totals. Re-fetch prices from DB and compute.
    let addonsSnapshot: AddonSnapshot[] = [];
    let addonsTotal = 0;

    const daysCount =
      start_date && end_date
        ? Math.max(
            1,
            Math.ceil(
              (new Date(end_date).getTime() - new Date(start_date).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 1;

    if (selected_addon_ids.length > 0 || true) {
      // Always fetch active add-ons for this operator to apply required ones even
      // if client somehow missed them.
      try {
        const { data: dbAddons, error: addonsErr } = await supabase
          .from("addons")
          .select("id, name, description, pricing_type, price, category, required")
          .eq("operator_id", operator_id)
          .eq("active", true);

        if (!addonsErr && dbAddons) {
          // Merge: include all required add-ons + those the client selected
          const effectiveIds = new Set([
            ...dbAddons.filter((a) => a.required).map((a) => a.id),
            ...(Array.isArray(selected_addon_ids) ? selected_addon_ids : []),
          ]);

          for (const addon of dbAddons) {
            if (!effectiveIds.has(addon.id)) continue;
            const amount =
              addon.pricing_type === "per_day"
                ? Number(addon.price) * daysCount
                : Number(addon.price);
            addonsSnapshot.push({
              id: addon.id,
              name: addon.name,
              description: addon.description,
              pricing_type: addon.pricing_type,
              price: Number(addon.price),
              category: addon.category,
              required: addon.required,
              days: addon.pricing_type === "per_day" ? daysCount : 1,
              amount,
            });
            addonsTotal += amount;
          }
        }
      } catch {
        // addons table may not exist yet (migration pending) — skip gracefully
        addonsSnapshot = [];
        addonsTotal = 0;
      }
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
            await supabase
              .from("renters")
              .update({ drivers_license_url: license_file_path })
              .eq("id", existingRenterId);
          }
        }

        if (!existingRenterId) {
          await supabase.from("renters").insert({
            operator_id,
            name,
            phone: phone || null,
            email: email || null,
            drivers_license_url: license_file_path,
          });
        }
      } catch (renterErr) {
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

    // Try inserting with all new columns (license_file_path, addons, addons_total)
    const { data: leadData, error } = await supabase
      .from("leads")
      .insert({
        ...baseLeadData,
        ...(license_file_path ? { license_file_path } : {}),
        ...(addonsSnapshot.length > 0
          ? { addons: addonsSnapshot, addons_total: addonsTotal }
          : {}),
      })
      .select("id");

    if (error) {
      // Columns may not exist yet (migration pending) — retry minimal insert
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

          // Build itemized add-ons table for operator email
          const addonsEmailTable =
            addonsSnapshot.length > 0
              ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
<thead><tr style="background:#f3f4f6">
<th style="text-align:left;padding:6px 10px;border:1px solid #e5e7eb">Add-on</th>
<th style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">Amount</th>
</tr></thead>
<tbody>
${addonsSnapshot
  .map(
    (a) =>
      `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${a.name}${a.pricing_type === "per_day" ? ` (${a.days} day${a.days !== 1 ? "s" : ""} × $${a.price.toFixed(2)}/day)` : " (flat)"}</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${a.amount.toFixed(2)}</td></tr>`
  )
  .join("")}
<tr style="font-weight:bold;background:#f9fafb">
<td style="padding:6px 10px;border:1px solid #e5e7eb">Add-ons Subtotal</td>
<td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${addonsTotal.toFixed(2)}</td>
</tr>
</tbody></table>`
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
${addonsEmailTable}
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

      // Build itemized breakdown for customer
      const customerAddonsTable =
        addonsSnapshot.length > 0
          ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
<thead><tr style="background:#f3f4f6">
<th style="text-align:left;padding:6px 10px;border:1px solid #e5e7eb">Item</th>
<th style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">Amount</th>
</tr></thead>
<tbody>
<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${vehicle_label || "Vehicle"}${datesNote ? ` — ${datesNote}` : ""}</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">TBD</td></tr>
${addonsSnapshot
  .map(
    (a) =>
      `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${a.name}${a.pricing_type === "per_day" ? ` (${a.days}×$${a.price.toFixed(2)}/day)` : " (flat)"}</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${a.amount.toFixed(2)}</td></tr>`
  )
  .join("")}
<tr style="font-weight:bold;background:#f9fafb">
<td style="padding:6px 10px;border:1px solid #e5e7eb">Add-ons Total</td>
<td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${addonsTotal.toFixed(2)}</td>
</tr>
</tbody></table>
<p style="font-size:12px;color:#6b7280">Final total will be confirmed by ${operatorName}.</p>`
          : "";

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
${customerAddonsTable}
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

    return NextResponse.json({
      success: true,
      addons_total: addonsTotal,
      addons_count: addonsSnapshot.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
