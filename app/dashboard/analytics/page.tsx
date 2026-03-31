import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DollarSign,
  CalendarDays,
  Clock,
  Car,
  TrendingDown,
  BarChart3,
} from "lucide-react";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];
  const thisYearStart = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];

  // Total bookings this year
  const { data: allBookings } = await supabase
    .from("bookings")
    .select("id, start_date, end_date, duration_days, daily_rate, total_price, status, vehicle_id, renter_name, created_at")
    .eq("operator_id", operator.id)
    .gte("start_date", thisYearStart)
    .order("start_date", { ascending: true });

  // Vehicles for top performers
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, make, model, year")
    .eq("operator_id", operator.id);

  const bookings = allBookings || [];
  const vehicleMap = new Map((vehicles || []).map((v) => [v.id, v]));

  // This month's bookings
  const thisMonthBookings = bookings.filter(
    (b) => b.start_date >= thisMonthStart && b.start_date <= thisMonthEnd
  );

  // Revenue calculations (completed + active)
  const revenueStatuses = ["completed", "active", "confirmed"];
  const totalRevenue = bookings
    .filter((b) => revenueStatuses.includes(b.status))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  const thisMonthRevenue = thisMonthBookings
    .filter((b) => revenueStatuses.includes(b.status))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);

  // Avg rental duration
  const completedBookings = bookings.filter((b) => b.status !== "cancelled");
  const avgDuration = completedBookings.length > 0
    ? Math.round(completedBookings.reduce((sum, b) => sum + (b.duration_days || 0), 0) / completedBookings.length)
    : 0;

  // Fleet utilization
  const totalVehicles = vehicles?.length || 1;
  const activeRentals = bookings.filter((b) => b.status === "active").length;
  const fleetUtilization = Math.round((activeRentals / totalVehicles) * 100);

  // Cancellation rate
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;
  const cancellationRate = bookings.length > 0
    ? ((cancelledCount / bookings.length) * 100).toFixed(1)
    : "0.0";

  // Revenue by month (last 12 months)
  const revenueByMonth: { month: string; revenue: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().split("T")[0];
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const monthRevenue = bookings
      .filter((b) => b.start_date >= monthStart && b.start_date <= monthEnd && revenueStatuses.includes(b.status))
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
    revenueByMonth.push({ month: monthLabel, revenue: monthRevenue });
  }

  // Bookings by month
  const bookingsByMonth: { month: string; count: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStart = d.toISOString().split("T")[0];
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const monthLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    const count = bookings.filter((b) => b.start_date >= monthStart && b.start_date <= monthEnd).length;
    bookingsByMonth.push({ month: monthLabel, count });
  }

  // Top performing vehicles
  const vehicleRevenue: Record<string, { revenue: number; bookings: number }> = {};
  bookings.filter((b) => revenueStatuses.includes(b.status) && b.vehicle_id).forEach((b) => {
    if (!vehicleRevenue[b.vehicle_id]) vehicleRevenue[b.vehicle_id] = { revenue: 0, bookings: 0 };
    vehicleRevenue[b.vehicle_id].revenue += b.total_price || 0;
    vehicleRevenue[b.vehicle_id].bookings += 1;
  });
  const topVehicles = Object.entries(vehicleRevenue)
    .map(([id, data]) => {
      const v = vehicleMap.get(id);
      return {
        id,
        label: v ? `${v.year} ${v.make} ${v.model}` : id,
        revenue: data.revenue,
        bookings: data.bookings,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Revenue by renter
  const renterRevenue: Record<string, { revenue: number; bookings: number }> = {};
  bookings.filter((b) => revenueStatuses.includes(b.status)).forEach((b) => {
    const name = b.renter_name || "Unknown";
    if (!renterRevenue[name]) renterRevenue[name] = { revenue: 0, bookings: 0 };
    renterRevenue[name].revenue += b.total_price || 0;
    renterRevenue[name].bookings += 1;
  });
  const topRenters = Object.entries(renterRevenue)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-[#2EBD6B]" />
            Analytics
          </h1>
          <p className="text-muted-foreground">
            Business performance overview
          </p>
        </div>
        <AnalyticsClient operatorId={operator.id} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Total Revenue</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <DollarSign className="h-[18px] w-[18px] text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              ${totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month: ${thisMonthRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Total Bookings</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <CalendarDays className="h-[18px] w-[18px] text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              {bookings.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month: {thisMonthBookings.length}</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Rental Duration</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <Clock className="h-[18px] w-[18px] text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              {avgDuration} days
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Fleet Utilization</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <Car className="h-[18px] w-[18px] text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              {fleetUtilization}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{activeRentals} of {totalVehicles} vehicles active</p>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Cancellation Rate</CardTitle>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10">
              <TrendingDown className="h-[18px] w-[18px] text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tracking-tight text-gray-900">
              {cancellationRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">{cancelledCount} cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="text-base">Revenue by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-48">
            {(() => {
              const maxRevenue = Math.max(...revenueByMonth.map((r) => r.revenue), 1);
              return revenueByMonth.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.revenue > 0 ? `$${(item.revenue / 1000).toFixed(1)}k` : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-[#2EBD6B] transition-all duration-300 min-h-[2px]"
                    style={{ height: `${Math.max((item.revenue / maxRevenue) * 160, 2)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{item.month}</span>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Bookings Chart */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="text-base">Bookings by Month</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-1 h-48">
            {(() => {
              const maxCount = Math.max(...bookingsByMonth.map((b) => b.count), 1);
              return bookingsByMonth.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {item.count > 0 ? item.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-blue-500 transition-all duration-300 min-h-[2px]"
                    style={{ height: `${Math.max((item.count / maxCount) * 160, 2)}px` }}
                  />
                  <span className="text-[10px] text-muted-foreground">{item.month}</span>
                </div>
              ));
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Top Vehicles & Top Renters */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Top Performing Vehicles</CardTitle>
          </CardHeader>
          <CardContent>
            {topVehicles.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Vehicle</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Revenue</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVehicles.map((v) => (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{v.label}</td>
                        <td className="py-2.5 text-right text-[#2EBD6B] font-semibold">${v.revenue.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{v.bookings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No vehicle data yet</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Revenue by Renter</CardTitle>
          </CardHeader>
          <CardContent>
            {topRenters.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-2 font-medium text-muted-foreground">Renter</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Revenue</th>
                      <th className="pb-2 font-medium text-muted-foreground text-right">Bookings</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topRenters.map((r) => (
                      <tr key={r.name} className="border-b last:border-0">
                        <td className="py-2.5 font-medium">{r.name}</td>
                        <td className="py-2.5 text-right text-[#2EBD6B] font-semibold">${r.revenue.toLocaleString()}</td>
                        <td className="py-2.5 text-right text-muted-foreground">{r.bookings}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No renter data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
