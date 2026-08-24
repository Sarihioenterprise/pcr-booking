import { NextRequest, NextResponse } from "next/server";
import { getOperator } from "@/lib/get-operator";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/reports?report=fleet_utilization|revenue|no_shows|top_renters|booking_source
//               &start=YYYY-MM-DD&end=YYYY-MM-DD
export async function GET(request: NextRequest) {
  let operator;
  try {
    operator = await getOperator();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("NEXT_REDIRECT") || (err as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    throw err;
  }

  const { searchParams } = new URL(request.url);
  const report = searchParams.get("report") || "revenue";
  const start = searchParams.get("start") || "";
  const end = searchParams.get("end") || "";

  const supabase = createAdminClient();

  // ─── Fleet Utilization ─────────────────────────────────────────────────────
  if (report === "fleet_utilization") {
    const [vehiclesRes, bookingsRes] = await Promise.all([
      supabase
        .from("vehicles")
        .select("id, make, model, year, status")
        .eq("operator_id", operator.id),
      supabase
        .from("bookings")
        .select("vehicle_id, start_date, end_date, status, duration_days")
        .eq("operator_id", operator.id)
        .in("status", ["active", "completed", "confirmed"])
        .gte("start_date", start)
        .lte("end_date", end),
    ]);

    const vehicles = vehiclesRes.data || [];
    const bookings = bookingsRes.data || [];

    const startDate = new Date(start + "T00:00:00");
    const endDate = new Date(end + "T23:59:59");
    const totalDays = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    const utilization = vehicles.map((v) => {
      const vBookings = bookings.filter((b) => b.vehicle_id === v.id);
      // Count overlapping days in the range
      let rentedDays = 0;
      for (const b of vBookings) {
        const bs = new Date(b.start_date + "T00:00:00");
        const be = new Date(b.end_date + "T23:59:59");
        const overlapStart = Math.max(bs.getTime(), startDate.getTime());
        const overlapEnd = Math.min(be.getTime(), endDate.getTime());
        if (overlapEnd > overlapStart) {
          rentedDays += Math.ceil((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24));
        }
      }
      const pct = Math.min(100, Math.round((rentedDays / totalDays) * 100));
      return {
        id: v.id,
        label: `${v.year} ${v.make} ${v.model}`,
        status: v.status,
        rented_days: rentedDays,
        total_days: totalDays,
        utilization_pct: pct,
      };
    });

    const avgUtilization =
      utilization.length > 0
        ? Math.round(
            utilization.reduce((sum, u) => sum + u.utilization_pct, 0) / utilization.length
          )
        : 0;

    return NextResponse.json({ vehicles: utilization, avg_utilization: avgUtilization, period_days: totalDays });
  }

  // ─── Revenue Report ─────────────────────────────────────────────────────────
  if (report === "revenue") {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, total_price, start_date, end_date, status, duration_days, vehicle_id, vehicles(make, model, year)")
      .eq("operator_id", operator.id)
      .in("status", ["active", "completed", "confirmed"])
      .gte("start_date", start)
      .lte("start_date", end)
      .order("start_date", { ascending: true });

    const list = bookings || [];
    const totalRevenue = list.reduce((s, b) => s + (Number(b.total_price) || 0), 0);
    const avgRevenue = list.length > 0 ? totalRevenue / list.length : 0;

    // Weekly buckets
    const weeklyMap: Record<string, number> = {};
    for (const b of list) {
      const d = new Date(b.start_date + "T00:00:00");
      // Get Monday of that week
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().split("T")[0];
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + (Number(b.total_price) || 0);
    }

    // By vehicle type label
    const vehicleRevMap: Record<string, number> = {};
    for (const b of list) {
      const v = b.vehicles as unknown as { year: number; make: string; model: string } | null;
      const label = v ? `${v.make}` : "Unknown";
      vehicleRevMap[label] = (vehicleRevMap[label] || 0) + (Number(b.total_price) || 0);
    }

    const weeklyRevenue = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, revenue]) => ({ week, revenue }));

    const byVehicleMake = Object.entries(vehicleRevMap)
      .sort(([, a], [, b]) => b - a)
      .map(([make, revenue]) => ({ make, revenue }));

    return NextResponse.json({
      total_revenue: totalRevenue,
      total_bookings: list.length,
      avg_revenue_per_booking: avgRevenue,
      weekly_revenue: weeklyRevenue,
      by_vehicle_make: byVehicleMake,
    });
  }

  // ─── No-Show Report ─────────────────────────────────────────────────────────
  if (report === "no_shows") {
    const [noShowsRes, totalRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, renter_name, start_date, total_price, no_show_at")
        .eq("operator_id", operator.id)
        .eq("is_no_show", true)
        .gte("start_date", start)
        .lte("start_date", end)
        .order("start_date", { ascending: false }),
      supabase
        .from("bookings")
        .select("id", { count: "exact" })
        .eq("operator_id", operator.id)
        .gte("start_date", start)
        .lte("start_date", end),
    ]);

    const noShows = noShowsRes.data || [];
    const totalBookings = totalRes.count || 0;
    const noShowRate =
      totalBookings > 0 ? Math.round((noShows.length / totalBookings) * 100) : 0;
    const estimatedLoss = noShows.reduce((s, b) => s + (Number(b.total_price) || 0), 0);

    // Weekly buckets
    const weeklyMap: Record<string, number> = {};
    for (const b of noShows) {
      const d = new Date(b.start_date + "T00:00:00");
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d.setDate(diff));
      const weekKey = monday.toISOString().split("T")[0];
      weeklyMap[weekKey] = (weeklyMap[weekKey] || 0) + 1;
    }

    const weeklyNoShows = Object.entries(weeklyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, count]) => ({ week, count }));

    return NextResponse.json({
      no_show_count: noShows.length,
      total_bookings: totalBookings,
      no_show_rate: noShowRate,
      estimated_loss: estimatedLoss,
      weekly_no_shows: weeklyNoShows,
      recent: noShows.slice(0, 20),
    });
  }

  // ─── Top Renters ─────────────────────────────────────────────────────────────
  if (report === "top_renters") {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("renter_id, renter_name, renter_email, total_price, start_date, status")
      .eq("operator_id", operator.id)
      .gte("start_date", start)
      .lte("start_date", end)
      .in("status", ["active", "completed", "confirmed"]);

    const list = bookings || [];

    // Aggregate by renter
    const renterMap: Record<
      string,
      { name: string; email: string | null; total_spend: number; booking_count: number; last_rental: string }
    > = {};
    for (const b of list) {
      const key = b.renter_id || b.renter_name;
      if (!renterMap[key]) {
        renterMap[key] = {
          name: b.renter_name,
          email: b.renter_email,
          total_spend: 0,
          booking_count: 0,
          last_rental: b.start_date,
        };
      }
      renterMap[key].total_spend += Number(b.total_price) || 0;
      renterMap[key].booking_count += 1;
      if (b.start_date > renterMap[key].last_rental) {
        renterMap[key].last_rental = b.start_date;
      }
    }

    const topRenters = Object.values(renterMap)
      .sort((a, b) => b.total_spend - a.total_spend)
      .slice(0, 25);

    return NextResponse.json({ top_renters: topRenters });
  }

  // ─── Booking Source ─────────────────────────────────────────────────────────
  if (report === "booking_source") {
    const [bookingsRes, leadsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("id, status, created_at")
        .eq("operator_id", operator.id)
        .gte("start_date", start)
        .lte("start_date", end),
      supabase
        .from("leads")
        .select("id, source, status, created_at")
        .eq("operator_id", operator.id)
        .gte("created_at", `${start}T00:00:00`)
        .lte("created_at", `${end}T23:59:59`),
    ]);

    const bookings = bookingsRes.data || [];
    const leads = leadsRes.data || [];

    // Heuristic source breakdown
    const widgetLeads = leads.filter((l) => l.source === "booking_widget").length;
    const pcrLeads = leads.filter((l) => l.source === "pcr_leads").length;
    const otherLeads = leads.filter(
      (l) => l.source !== "booking_widget" && l.source !== "pcr_leads"
    ).length;

    const sourceBreakdown = [
      { source: "Booking Widget", count: widgetLeads, pct: 0 },
      { source: "PCR Leads", count: pcrLeads, pct: 0 },
      { source: "Direct / Walk-in", count: Math.max(0, bookings.length - widgetLeads - pcrLeads), pct: 0 },
      { source: "Other Lead Source", count: otherLeads, pct: 0 },
    ];

    const totalLeadCount = sourceBreakdown.reduce((s, x) => s + x.count, 0);
    if (totalLeadCount > 0) {
      for (const s of sourceBreakdown) {
        s.pct = Math.round((s.count / totalLeadCount) * 100);
      }
    }

    return NextResponse.json({
      total_bookings: bookings.length,
      total_leads: leads.length,
      source_breakdown: sourceBreakdown,
    });
  }

  return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
}
