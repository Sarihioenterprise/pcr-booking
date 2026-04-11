import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import OnboardingChecklist from "@/components/dashboard/onboarding-checklist";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  DollarSign,
  Car,
  Users,
  Clock,
  CalendarX2,
  Plus,
  CalendarPlus,
  Eye,
} from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function DashboardPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // 7 days from now
  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split("T")[0];

  // Today start for leads
  const todayStart = `${todayStr}T00:00:00`;
  const todayEnd = `${todayStr}T23:59:59`;

  // Run queries in parallel
  const [
    monthBookingsRes,
    activeRentalsRes,
    leadsRes,
    upcomingReturnsRes,
    recentBookingsRes,
    vehiclesRes,
  ] = await Promise.all([
    // Total bookings this month
    supabase
      .from("bookings")
      .select("id, total_price, status")
      .eq("operator_id", operator.id)
      .gte("start_date", monthStart)
      .lte("start_date", monthEnd),

    // Active rentals
    supabase
      .from("bookings")
      .select("id")
      .eq("operator_id", operator.id)
      .eq("status", "active"),

    // Leads today
    supabase
      .from("leads")
      .select("id")
      .eq("operator_id", operator.id)
      .gte("created_at", todayStart)
      .lte("created_at", todayEnd),

    // Upcoming returns (bookings ending in next 7 days)
    supabase
      .from("bookings")
      .select("id, renter_name, end_date, status, vehicle_id, vehicles(make, model, year)")
      .eq("operator_id", operator.id)
      .in("status", ["active", "confirmed"])
      .gte("end_date", todayStr)
      .lte("end_date", nextWeekStr)
      .order("end_date", { ascending: true }),

    // Recent bookings (last 5)
    supabase
      .from("bookings")
      .select("id, renter_name, start_date, end_date, duration_days, total_price, status, vehicle_id, vehicles(make, model, year)")
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(5),

    // Vehicle count
    supabase
      .from("vehicles")
      .select("id", { count: "exact" })
      .eq("operator_id", operator.id),
  ]);

  const monthBookings = monthBookingsRes.data || [];
  const totalBookingsThisMonth = monthBookings.length;
  const revenueThisMonth = monthBookings
    .filter((b) => ["completed", "active", "confirmed"].includes(b.status))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  const activeRentalsCount = activeRentalsRes.data?.length || 0;
  const leadsToday = leadsRes.data?.length || 0;
  const upcomingReturns = upcomingReturnsRes.data || [];
  const recentBookings = recentBookingsRes.data || [];
  const vehicleCount = vehiclesRes.count || 0;
  const hasVehicles = vehicleCount > 0;

  const stats = [
    {
      title: "Bookings This Month",
      value: String(totalBookingsThisMonth),
      icon: CalendarDays,
    },
    {
      title: "Revenue This Month",
      value: `$${revenueThisMonth.toLocaleString()}`,
      icon: DollarSign,
    },
    {
      title: "Active Rentals",
      value: String(activeRentalsCount),
      icon: Car,
    },
    {
      title: "Leads Today",
      value: String(leadsToday),
      icon: Users,
    },
    {
      title: "Upcoming Returns",
      value: String(upcomingReturns.length),
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Onboarding Checklist */}
      <OnboardingChecklist hasVehicles={hasVehicles} />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {stats.map((stat) => (
          <Card
            key={stat.title}
            className="border-0 bg-white shadow-sm ring-0"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-sm font-medium text-gray-500">
                {stat.title}
              </CardTitle>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                <stat.icon className="h-[18px] w-[18px] text-[#2EBD6B]" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tracking-tight text-gray-900">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/bookings/new">
          <Button className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
            <CalendarPlus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </Link>
        <Link href="/dashboard/fleet/new">
          <Button variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Add Vehicle
          </Button>
        </Link>
        <Link href="/dashboard/calendar">
          <Button variant="outline">
            <Eye className="h-4 w-4 mr-2" />
            View Calendar
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <CalendarDays className="h-5 w-5 text-[#2EBD6B]" />
              Recent Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentBookings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <CalendarX2 className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No bookings yet</p>
                <p className="mt-1 text-sm text-gray-500">
                  When you receive bookings, they will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border hover:border-[#2EBD6B]/30 transition-colors cursor-pointer mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{booking.renter_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.vehicles
                            ? `${(booking.vehicles as unknown as { year: number; make: string; model: string }).year} ${(booking.vehicles as unknown as { year: number; make: string; model: string }).make} ${(booking.vehicles as unknown as { year: number; make: string; model: string }).model}`
                            : "No vehicle"}
                          {" \u00B7 "}
                          {booking.start_date} &rarr; {booking.end_date}
                        </p>
                      </div>
                      <div className="text-right ml-3">
                        <Badge variant="outline" className={statusColors[booking.status] || ""}>
                          {booking.status}
                        </Badge>
                        <p className="text-sm font-bold mt-0.5">
                          ${Number(booking.total_price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Returns */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <Clock className="h-5 w-5 text-[#2EBD6B]" />
              Upcoming Returns (Next 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingReturns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 mb-4">
                  <Clock className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900">No upcoming returns</p>
                <p className="mt-1 text-sm text-gray-500">
                  Vehicles due for return will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingReturns.map((booking) => {
                  const endDate = new Date(booking.end_date + "T00:00:00");
                  const daysUntil = Math.ceil(
                    (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:border-[#2EBD6B]/30 transition-colors cursor-pointer mb-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{booking.renter_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {booking.vehicles
                              ? `${(booking.vehicles as unknown as { year: number; make: string; model: string }).year} ${(booking.vehicles as unknown as { year: number; make: string; model: string }).make} ${(booking.vehicles as unknown as { year: number; make: string; model: string }).model}`
                              : "No vehicle"}
                          </p>
                        </div>
                        <div className="text-right ml-3">
                          <p className="text-sm font-medium">{booking.end_date}</p>
                          <Badge
                            variant="outline"
                            className={
                              daysUntil <= 1
                                ? "bg-red-100 text-red-700 border-red-200"
                                : daysUntil <= 3
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-blue-100 text-blue-700 border-blue-200"
                            }
                          >
                            {daysUntil === 0
                              ? "Today"
                              : daysUntil === 1
                              ? "Tomorrow"
                              : `${daysUntil} days`}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
