import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { resolveOperatorEmail } from "@/lib/notify-email";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotification } from "@/lib/create-notification";

export async function POST(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    // Let Next.js redirect errors propagate (unauthenticated)
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  try {
    const body = await request.json();

    const {
      vehicle_id,
      renter_name,
      renter_phone,
      renter_email,
      drivers_license,
      start_date,
      end_date,
      status = "inquiry",
      notes,
      pickup_instructions,
      selected_addon_ids = [],
      // Wizard extra fields (new in 026_booking_wizard_fields.sql)
      pickup_location,
      pickup_time,
      return_time,
      renter_dob,
      renter_license_state,
      renter_license_expiry,
      renter_license_photo_path,
      renter_id: body_renter_id,
    } = body;

    if (!renter_name || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required fields: renter_name, start_date, end_date" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Calculate duration
    const start = new Date(start_date);
    const end = new Date(end_date);
    const diffMs = end.getTime() - start.getTime();
    const duration_days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    // Look up vehicle rate if vehicle_id provided
    let daily_rate = 0;
    let total_price = 0;

    if (vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate")
        .eq("id", vehicle_id)
        .eq("operator_id", operator.id)
        .single();

      if (vehicle) {
        let effectiveRate = vehicle.daily_rate;
        if (duration_days >= 30 && vehicle.monthly_rate) {
          effectiveRate = vehicle.monthly_rate / 30;
        } else if (duration_days >= 7 && vehicle.weekly_rate) {
          effectiveRate = vehicle.weekly_rate / 7;
        }
        daily_rate = effectiveRate;
        total_price = effectiveRate * duration_days;
      }
    }

    // Upsert renter record
    // If caller (wizard) already has a renter_id, use it directly
    let renter_id: string | null = body_renter_id || null;
    if (renter_name && !renter_id) {
      const orParts = [
        renter_email ? `email.eq.${renter_email}` : null,
        renter_phone ? `phone.eq.${renter_phone}` : null,
      ].filter(Boolean);

      if (orParts.length > 0) {
        const { data: existingRenter } = await supabase
          .from("renters")
          .select("id")
          .eq("operator_id", operator.id)
          .or(orParts.join(","))
          .maybeSingle();

        if (existingRenter) {
          renter_id = existingRenter.id;
        }
      }

      if (!renter_id) {
        const { data: newRenter } = await supabase
          .from("renters")
          .insert({
            operator_id: operator.id,
            name: renter_name,
            email: renter_email || null,
            phone: renter_phone || null,
            drivers_license_number: drivers_license || null,
          })
          .select("id")
          .single();
        if (newRenter) renter_id = newRenter.id;
      }
    }

    // ── Server-side add-on computation ─────────────────────────────────────
    let addonsSnapshot: Array<{
      id: string; name: string; description: string | null;
      pricing_type: string; price: number; category: string;
      required: boolean; days: number; amount: number;
    }> = [];
    let addonsTotal = 0;

    if (Array.isArray(selected_addon_ids) && selected_addon_ids.length > 0) {
      try {
        const { data: dbAddons } = await supabase
          .from("addons")
          .select("id, name, description, pricing_type, price, category, required")
          .eq("operator_id", operator.id)
          .eq("active", true);

        if (dbAddons) {
          const effectiveIds = new Set([
            ...dbAddons.filter((a) => a.required).map((a) => a.id),
            ...selected_addon_ids,
          ]);
          for (const addon of dbAddons) {
            if (!effectiveIds.has(addon.id)) continue;
            const amount =
              addon.pricing_type === "per_day"
                ? Number(addon.price) * duration_days
                : Number(addon.price);
            addonsSnapshot.push({
              id: addon.id,
              name: addon.name,
              description: addon.description,
              pricing_type: addon.pricing_type,
              price: Number(addon.price),
              category: addon.category,
              required: addon.required,
              days: addon.pricing_type === "per_day" ? duration_days : 1,
              amount,
            });
            addonsTotal += amount;
          }
        }
      } catch {
        // addons table may not exist yet — skip gracefully
      }
    }

    const total_with_addons = total_price + addonsTotal;

    // ── Core booking fields (always safe to insert) ──────────────────────────
    const coreInsert = {
      operator_id: operator.id,
      vehicle_id: vehicle_id || null,
      renter_id,
      renter_name,
      renter_phone: renter_phone || null,
      renter_email: renter_email || null,
      start_date,
      end_date,
      duration_days,
      daily_rate,
      total_price: total_with_addons,
      tax_amount: 0,
      discount_amount: 0,
      deposit_amount: operator.deposit_amount || 0,
      deposit_status: "none",
      status,
      notes: notes || null,
      pickup_instructions: pickup_instructions || operator.default_pickup_instructions || null,
      ...(addonsSnapshot.length > 0 ? { addons: addonsSnapshot, addons_total: addonsTotal } : {}),
    };

    // ── Optional wizard fields (026 migration) — included only if present ────
    // If the migration hasn't been applied, these columns don't exist and their
    // inclusion would cause a 42703 (undefined column) error. We use a two-pass
    // insert: try with wizard fields, fall back to core-only if columns missing.
    const wizardExtras = {
      ...(pickup_location ? { pickup_location } : {}),
      ...(pickup_time ? { pickup_time } : {}),
      ...(return_time ? { return_time } : {}),
      ...(renter_dob ? { renter_dob } : {}),
      ...(renter_license_state ? { renter_license_state } : {}),
      ...(renter_license_expiry ? { renter_license_expiry } : {}),
      ...(renter_license_photo_path ? { renter_license_photo_path } : {}),
    };

    const hasWizardExtras = Object.keys(wizardExtras).length > 0;

    // First attempt: with wizard extras
    let { data: booking, error } = await supabase
      .from("bookings")
      .insert(hasWizardExtras ? { ...coreInsert, ...wizardExtras } : coreInsert)
      .select()
      .single();

    // Retry without wizard extras if column-not-found (migration 026 not applied)
    if (error && hasWizardExtras && (error.code === "42703" || error.message?.includes("column"))) {
      console.warn("[bookings] Wizard columns missing — retrying without them. Apply migration 026.");
      const retry = await supabase
        .from("bookings")
        .insert(coreInsert)
        .select()
        .single();
      booking = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error("Booking insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Create in-app notification
    try {
      await createNotification(
        operator.id,
        "new_booking",
        "New Booking Created",
        `Booking for ${renter_name} (${status})`,
        `/dashboard/bookings/${booking.id}`
      );
    } catch {
      // Non-fatal
    }

    // Fire confirmation email (fire-and-forget)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";

    // Build itemized add-ons rows for email
    const addonsRows = addonsSnapshot
      .map(
        (a) =>
          `<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">${a.name}${
            a.pricing_type === "per_day" ? ` (${a.days} day${a.days !== 1 ? "s" : ""} × $${a.price.toFixed(2)}/day)` : " (flat)"
          }</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${a.amount.toFixed(2)}</td></tr>`
      )
      .join("");

    const addonsTableHtml =
      addonsSnapshot.length > 0
        ? `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:14px">
<thead><tr style="background:#f3f4f6">
<th style="text-align:left;padding:6px 10px;border:1px solid #e5e7eb">Item</th>
<th style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">Amount</th>
</tr></thead>
<tbody>
<tr><td style="padding:6px 10px;border:1px solid #e5e7eb">Vehicle rental (${duration_days} day${duration_days !== 1 ? "s" : ""})</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${total_price.toFixed(2)}</td></tr>
${addonsRows}
<tr style="font-weight:bold;background:#f9fafb"><td style="padding:6px 10px;border:1px solid #e5e7eb">Total</td><td style="text-align:right;padding:6px 10px;border:1px solid #e5e7eb">$${total_with_addons.toFixed(2)}</td></tr>
</tbody></table>`
        : "";

    if (renter_email) {
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: renter_email,
          subject: "Booking Confirmation",
          body: `<p>Hi ${renter_name},</p><p>Your booking has been created and is currently <strong>${status}</strong>.</p><p><strong>Dates:</strong> ${start_date} to ${end_date} (${duration_days} day${duration_days !== 1 ? "s" : ""})</p>${addonsTableHtml}${addonsSnapshot.length === 0 && total_with_addons > 0 ? `<p>Estimated total: <strong>$${total_with_addons.toFixed(2)}</strong></p>` : ""}<p>We will be in touch shortly to confirm your reservation.</p><p>Thank you!</p>`,
          templateType: "booking_confirmation",
        }),
      }).catch(() => {});
    }

    // Notify operator
    const operatorNotifyEmail = await resolveOperatorEmail(operator);
    if (operatorNotifyEmail) {
      fetch(`${baseUrl}/api/email/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: operatorNotifyEmail,
          subject: `New Booking: ${renter_name}`,
          body: `<p>A new booking has been created for <strong>${renter_name}</strong>.</p><p>Dates: ${start_date} to ${end_date} (${duration_days} day${duration_days !== 1 ? "s" : ""})</p><p>Status: ${status}</p>${addonsTableHtml}${addonsSnapshot.length === 0 && total_with_addons > 0 ? `<p>Total: $${total_with_addons.toFixed(2)}</p>` : ""}<p><a href="${baseUrl}/dashboard/bookings/${booking.id}" style="display:inline-block;background:#2EBD6B;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;margin-right:8px;">View Booking →</a>${renter_email ? `<a href="${baseUrl}/dashboard/bookings/${booking.id}" style="display:inline-block;background:#f3f4f6;color:#374151;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">Send Agreement for Signature →</a><p style="font-size:12px;color:#9ca3af;margin-top:8px;">Tip: Open the booking → Agreement tab → &quot;Send for Signature&quot; to email the renter their signing link.</p>` : ""}</p>`,
          templateType: "operator_notification",
        }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, booking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("Create booking error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
