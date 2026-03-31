import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";

export async function GET(request: NextRequest) {
  try {
    const operator = await getOperator();
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const startDate = searchParams.get("start") || "2020-01-01";
    const endDate = searchParams.get("end") || new Date().toISOString().split("T")[0];

    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("*, vehicles(make, model, year)")
      .eq("operator_id", operator.id)
      .gte("start_date", startDate)
      .lte("start_date", endDate)
      .order("start_date", { ascending: false });

    if (error) {
      console.error("Failed to fetch bookings for export:", error);
      return NextResponse.json(
        { error: "Failed to export data" },
        { status: 500 }
      );
    }

    // Build CSV
    const headers = [
      "Booking ID",
      "Renter",
      "Vehicle",
      "Start Date",
      "End Date",
      "Duration (Days)",
      "Daily Rate",
      "Total",
      "Status",
    ];

    const rows = (bookings || []).map((b) => {
      const vehicle = b.vehicles
        ? `${b.vehicles.year} ${b.vehicles.make} ${b.vehicles.model}`
        : "N/A";
      return [
        b.id,
        `"${(b.renter_name || "").replace(/"/g, '""')}"`,
        `"${vehicle.replace(/"/g, '""')}"`,
        b.start_date,
        b.end_date,
        b.duration_days,
        b.daily_rate,
        b.total_price,
        b.status,
      ].join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="pcr-bookings-export-${startDate}-to-${endDate}.csv"`,
      },
    });
  } catch (err) {
    console.error("Export error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
