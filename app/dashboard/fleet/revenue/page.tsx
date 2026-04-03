import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, TrendingUp, Car, DollarSign, BarChart3, Trophy } from "lucide-react";

function utilizationColor(pct: number) {
  if (pct >= 70) return "text-emerald-600";
  if (pct >= 40) return "text-amber-500";
  return "text-red-500";
}

function utilizationBg(pct: number) {
  if (pct >= 70) return "bg-emerald-500/10 text-emerald-700 border-emerald-200";
  if (pct >= 40) return "bg-amber-500/10 text-amber-700 border-amber-200";
  return "bg-red-500/10 text-red-700 border-red-200";
}

export default async function RevenueByVehiclePage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const [{ data: vehicles }, { data: bookings }] = await Promise.all([
    supabase
      .from("vehicles")
      .select("id, make, model, year, plate, photo_url, daily_rate, status")
      .eq("operator_id", operator.id),
    supabase
      .from("bookings")
      .select("id, vehicle_id, total_price, duration_days, daily_rate, status, start_date, end_date")
      .eq("operator_id", operator.id)
      .not("status", "eq", "cancelled"),
  ]);

  const vehicleList = vehicles ?? [];
  const bookingList = bookings ?? [];

  // Days in dataset window (last 90 days or all time)
  const windowDays = 90;

  const vehicleStats = vehicleList.map((v) => {
    const vBookings = bookingList.filter((b) => b.vehicle_id === v.id);
    const totalRevenue = vBookings.reduce((s, b) => s + (b.total_price || 0), 0);
    const numBookings = vBookings.length;
    const daysRented = vBookings.reduce((s, b) => s + (b.duration_days || 0), 0);
    const daysIdle = Math.max(0, windowDays - daysRented);
    const utilization = Math.round((daysRented / windowDays) * 100);
    const avgDailyRate =
      daysRented > 0
        ? totalRevenue / daysRented
        : Number(v.daily_rate) || 0;

    return {
      id: v.id,
      label: `${v.year} ${v.make} ${v.model}`,
      plate: v.plate,
      photo_url: v.photo_url,
      totalRevenue,
      numBookings,
      daysRented,
      daysIdle,
      utilization,
      avgDailyRate,
    };
  });

  vehicleStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

  const totalFleetRevenue = vehicleStats.reduce((s, v) => s + v.totalRevenue, 0);
  const avgUtilization =
    vehicleStats.length > 0
      ? Math.round(vehicleStats.reduce((s, v) => s + v.utilization, 0) / vehicleStats.length)
      : 0;
  const bestVehicle = vehicleStats[0] ?? null;
  const mostIdle = [...vehicleStats].sort((a, b) => a.utilization - b.utilization)[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/fleet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Fleet
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-[#2EBD6B]" />
              Revenue by Vehicle
            </h1>
            <p className="text-muted-foreground text-sm">Last {windowDays} days performance</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Fleet Revenue</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <DollarSign className="h-4 w-4 text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900">${totalFleetRevenue.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Avg Utilization</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <TrendingUp className="h-4 w-4 text-[#2EBD6B]" />
            </div>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${utilizationColor(avgUtilization)}`}>{avgUtilization}%</div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Best Performer</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <Trophy className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-gray-900 leading-tight">
              {bestVehicle ? bestVehicle.label : "—"}
            </div>
            {bestVehicle && (
              <p className="text-xs text-muted-foreground mt-0.5">${bestVehicle.totalRevenue.toLocaleString()} revenue</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-gray-500">Most Idle</CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10">
              <Car className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-gray-900 leading-tight">
              {mostIdle ? mostIdle.label : "—"}
            </div>
            {mostIdle && (
              <p className="text-xs text-muted-foreground mt-0.5">{mostIdle.utilization}% utilized</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Table */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Per-Vehicle Performance</CardTitle>
        </CardHeader>
        <CardContent>
          {vehicleStats.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">No vehicle data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Vehicle</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Revenue</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Bookings</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Avg/Day</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Days Rented</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Days Idle</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicleStats.map((v, idx) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Link href={`/dashboard/fleet/${v.id}`} className="font-semibold text-gray-900 hover:text-[#2EBD6B] transition-colors">
                            {v.label}
                          </Link>
                          {idx === 0 && v.totalRevenue > 0 && (
                            <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs px-1.5 py-0">
                              <Trophy className="h-2.5 w-2.5 mr-0.5 inline" />
                              Best
                            </Badge>
                          )}
                          {v.plate && (
                            <span className="text-xs text-muted-foreground">{v.plate}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 text-right font-semibold text-[#2EBD6B]">
                        ${v.totalRevenue.toLocaleString()}
                      </td>
                      <td className="py-3 text-right text-muted-foreground">{v.numBookings}</td>
                      <td className="py-3 text-right text-muted-foreground">${v.avgDailyRate.toFixed(0)}</td>
                      <td className="py-3 text-right text-muted-foreground">{v.daysRented}</td>
                      <td className="py-3 text-right text-muted-foreground">{v.daysIdle}</td>
                      <td className="py-3 text-right">
                        <Badge variant="outline" className={`${utilizationBg(v.utilization)} text-xs`}>
                          {v.utilization}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
