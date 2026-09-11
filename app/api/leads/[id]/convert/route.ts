import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { createNotification } from "@/lib/create-notification";
import { upsertRenter } from "@/lib/upsert-renter";

/** Parse "Vehicle Label | YYYY-MM-DD to YYYY-MM-DD" → { start, end } */
function parseDatesRequested(datesRequested: string | null): { start: string | null; end: string | null } {
  if (!datesRequested) return { start: null, end: null };
  const normalized = datesRequested.includes("|")
    ? datesRequested.split("|")[1].trim()
    : datesRequested.trim();
  const match = normalized.match(/(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/);
  if (match) return { start: match[1], end: match[2] };
  return { start: null, end: null };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operator = await getOperator();
    // Use admin client so we can write bookings/renters without RLS blocking
    const supabase = createAdminClient();
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    // Fetch the lead
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .eq("operator_id", operator.id)
      .single();

    if (fetchError || !lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // ── Renter: reuse existing record if present, else find-or-create ────────
    // lead.renter_id is set when the lead came from the public booking widget
    // (migration 024). For older leads without it, upsertRenter deduplicates.
    let renterId: string | null = lead.renter_id || null;

    if (!renterId) {
      renterId = await upsertRenter(supabase, {
        operatorId: operator.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
      });
    }

    if (!renterId) {
      return NextResponse.json(
        { error: "Failed to create or find renter record" },
        { status: 500 }
      );
    }

    // ── Dates: prefer body override, then parse from lead.dates_requested ────
    const parsed = parseDatesRequested(lead.dates_requested);
    const startDate = body.start_date || parsed.start || new Date().toISOString().split("T")[0];
    const durationDays = lead.duration_days || 7;
    const endDate =
      body.end_date ||
      parsed.end ||
      new Date(new Date(startDate).getTime() + durationDays * 86400000)
        .toISOString()
        .split("T")[0];

    const actualDuration = Math.max(
      1,
      Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000
      )
    );

    // ── Add-ons: carry over from lead (migration 018 adds addons JSONB column) ─
    const leadAddons = Array.isArray(lead.addons) && lead.addons.length > 0
      ? lead.addons
      : null;
    const leadAddonsTotal = typeof lead.addons_total === "number" ? lead.addons_total : 0;

    // ── Vehicle + price ───────────────────────────────────────────────────────
    let vehicleId: string | null = body.vehicle_id || null;
    let dailyRate = body.daily_rate || 0;
    let totalPrice = body.total_price || 0;

    // If no vehicle_id in request, try to resolve from the label stored in dates_requested
    // Format: "2022 Kia Forte | 2026-10-01 to 2026-10-08" — label is before the pipe
    if (!vehicleId && lead.dates_requested && lead.dates_requested.includes("|")) {
      const vehicleLabel = lead.dates_requested.split("|")[0].trim();
      if (vehicleLabel) {
        const { data: fleetVehicles } = await supabase
          .from("vehicles")
          .select("id, daily_rate, weekly_rate, monthly_rate, year, make, model")
          .eq("operator_id", operator.id);

        if (fleetVehicles) {
          const match = fleetVehicles.find((v) => {
            const label = `${v.year} ${v.make} ${v.model}`.toLowerCase();
            return label === vehicleLabel.toLowerCase();
          });
          if (match) vehicleId = match.id;
        }
      }
    }

    if (vehicleId && !totalPrice) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate")
        .eq("id", vehicleId)
        .eq("operator_id", operator.id)
        .single();

      if (vehicle) {
        let effectiveRate = vehicle.daily_rate || 0;
        if (actualDuration >= 30 && vehicle.monthly_rate) {
          effectiveRate = vehicle.monthly_rate / 30;
        } else if (actualDuration >= 7 && vehicle.weekly_rate) {
          effectiveRate = vehicle.weekly_rate / 7;
        }
        dailyRate = effectiveRate;
        totalPrice = effectiveRate * actualDuration + leadAddonsTotal;
      }
    }

    // Fallback: use lead's estimated_value when no vehicle rate is available
    if (!totalPrice && lead.estimated_value) {
      totalPrice = lead.estimated_value;
    }

    // ── Create booking ────────────────────────────────────────────────────────
    const bookingInsert: Record<string, unknown> = {
      operator_id: operator.id,
      renter_id: renterId,
      renter_name: lead.name,
      renter_phone: lead.phone || null,
      renter_email: lead.email || null,
      start_date: startDate,
      end_date: endDate,
      duration_days: actualDuration,
      daily_rate: dailyRate,
      total_price: totalPrice,
      tax_amount: 0,
      discount_amount: 0,
      deposit_amount: operator.deposit_amount || 0,
      status: "inquiry",
      vehicle_id: vehicleId,
      notes: `Converted from lead. Original dates requested: ${lead.dates_requested || "N/A"}`,
    };

    if (leadAddons) {
      bookingInsert.addons = leadAddons;
      bookingInsert.addons_total = leadAddonsTotal;
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingInsert)
      .select("*")
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: "Failed to create booking: " + bookingError.message },
        { status: 500 }
      );
    }

    // Update lead status to converted
    const now = new Date().toISOString();
    await supabase
      .from("leads")
      .update({
        followup_status: "converted",
        stage: "hot_lead",
        last_followup_at: now,
        next_followup_at: null,
        updated_at: now,
      })
      .eq("id", id);

    // Create notification
    await createNotification(
      operator.id,
      "new_booking",
      "Lead Converted",
      `${lead.name} has been converted to a booking.`,
      `/dashboard/bookings/${booking.id}`
    );

    return NextResponse.json({
      success: true,
      renter_id: renterId,
      booking_id: booking.id,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
