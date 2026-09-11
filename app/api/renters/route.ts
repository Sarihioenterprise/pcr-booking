import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { upsertRenter } from "@/lib/upsert-renter";

/**
 * POST /api/renters
 * Find-or-create a renter for the current operator, backfilling any supplied details.
 * Called by the booking wizard's Customer step to persist email/phone before booking creation.
 */
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

  try {
    const body = await request.json();
    const {
      renter_id: existingRenterId,
      name, email, phone, drivers_license_number,
      date_of_birth, drivers_license_expiry,
      address, city, state, zip, notes,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const supabase = createAdminClient();

    let renterId: string | null;

    if (existingRenterId) {
      // Direct update — caller already knows which renter to update (e.g. wizard email correction)
      const updatePayload: Record<string, unknown> = { name };
      if (email !== undefined) updatePayload.email = email || null;
      if (phone !== undefined) updatePayload.phone = phone || null;
      if (drivers_license_number !== undefined) updatePayload.drivers_license_number = drivers_license_number || null;
      const { error: updErr } = await supabase
        .from("renters")
        .update(updatePayload)
        .eq("id", existingRenterId)
        .eq("operator_id", operator.id);
      if (updErr) {
        return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
      renterId = existingRenterId;
    } else {
      renterId = await upsertRenter(supabase, {
        operatorId: operator.id,
        name,
        email: email || null,
        phone: phone || null,
        city: city || null,
        driversLicenseNumber: drivers_license_number || null,
      });
    }

    if (!renterId) {
      return NextResponse.json({ error: "Failed to upsert renter" }, { status: 500 });
    }

    // Apply supplemental fields that upsertRenter doesn't handle
    const patch: Record<string, unknown> = {};
    if (date_of_birth) patch.date_of_birth = date_of_birth;
    if (drivers_license_expiry) patch.drivers_license_expiry = drivers_license_expiry;
    if (address) patch.address = address;
    if (state) patch.state = state;
    if (zip) patch.zip = zip;
    if (notes) patch.notes = notes;
    if (Object.keys(patch).length > 0) {
      await supabase.from("renters").update(patch).eq("id", renterId);
    }

    // Return full renter row so the wizard can use the id
    const { data: renter } = await supabase
      .from("renters")
      .select("id, name, email, phone")
      .eq("id", renterId)
      .single();

    return NextResponse.json({ renter: renter ?? { id: renterId } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/renters]", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
