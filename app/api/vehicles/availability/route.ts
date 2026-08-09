/**
 * GET /api/vehicles/availability?vehicle_id=UUID&operator_id=UUID
 *
 * Returns booked date ranges for a specific vehicle.
 * Used by the public booking page to disable unavailable dates in the date picker.
 *
 * Considers bookings with status: confirmed, active, pending
 * (Not: inquiry, cancelled, completed)
 *
 * Returns: { bookedRanges: Array<{ start: string, end: string }> }
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BLOCKING_STATUSES = ["confirmed", "active", "pending"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const vehicleId = searchParams.get("vehicle_id");
  const operatorId = searchParams.get("operator_id");

  if (!vehicleId || !operatorId) {
    return NextResponse.json(
      { error: "vehicle_id and operator_id are required" },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("start_date, end_date, status")
      .eq("vehicle_id", vehicleId)
      .eq("operator_id", operatorId)
      .in("status", BLOCKING_STATUSES)
      .gte("end_date", new Date().toISOString().split("T")[0]); // only future/current bookings

    if (error) {
      console.error("Availability query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const bookedRanges = (bookings || []).map((b) => ({
      start: b.start_date,
      end: b.end_date,
    }));

    return NextResponse.json({
      vehicleId,
      bookedRanges,
      blockingStatuses: BLOCKING_STATUSES,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch availability";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
