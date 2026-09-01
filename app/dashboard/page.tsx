import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { LeadSourcesWidget } from "@/components/dashboard/lead-sources-widget";
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
  ExternalLink,
  Ban,
  Wrench,
  AlertTriangle,
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
  const supabase = createAdminClient();

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  // Revenue trend — last 6 months
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().split("T")[0];

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
    noShowsRes,
    overdueMaintenanceRes,
    revenueTrendRes,
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

    // Leads today + this month by source (for Lead Sources Widget)
    supabase
      .from("leads")
      .select("id, source, created_at")
      .eq("operator_id", operator.id)
      .gte("created_at", `${monthStart}T00:00:00`),

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

    // No-shows this month
    supabase
      .from("bookings")
      .select("id", { count: "exact" })
      .eq("operator_id", operator.id)
      .eq("is_no_show", true)
      .gte("no_show_at", `${monthStart}T00:00:00`),

    // Vehicles needing service (overdue maintenance)
    supabase
      .from("maintenance_records")
      .select("vehicle_id, type, date_due, vehicles(id, make, model, year, plate)")
      .eq("operator_id", operator.id)
      .neq("status", "completed")
      .not("date_due", "is", null)
      .lt("date_due", todayStr),

    // Revenue trend — last 6 months raw bookings
    supabase
      .from("bookings")
      .select("start_date, total_price, status")
      .eq("operator_id", operator.id)
      .gte("start_date", sixMonthsAgo)
      .neq("status", "cancelled"),
  ]);

  // Vehicles needing service - deduplicate by vehicle
  type OverdueMaintRow = {
    vehicle_id: string;
    type: string;
    date_due: string;
    vehicles: { id: string; make: string; model: string; year: number; plate: string | null } | null;
  };
  const overdueMaintenanceRaw = (overdueMaintenanceRes.data ?? []) as unknown as OverdueMaintRow[];
  const vehiclesNeedingServiceMap = new Map<string, { vehicle: OverdueMaintRow["vehicles"]; services: string[] }>();
  for (const row of overdueMaintenanceRaw) {
    if (!row.vehicle_id || !row.vehicles) continue;
    const existing = vehiclesNeedingServiceMap.get(row.vehicle_id);
    if (existing) {
      existing.services.push(row.type);
    } else {
      vehiclesNeedingServiceMap.set(row.vehicle_id, { vehicle: row.vehicles, services: [row.type] });
    }
  }
  const vehiclesNeedingService = Array.from(vehiclesNeedingServiceMap.values());

  // Build 6-month revenue trend
  const revenueTrendRaw = revenueTrendRes.data || [];
  const revenueChartData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ms = d.toISOString().split("T")[0];
    const me = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short" });
    const revenue = revenueTrendRaw
      .filter((b) => b.start_date >= ms && b.start_date <= me)
      .reduce((sum, b) => sum + (b.total_price || 0), 0);
    return { month: label, revenue };
  });

  const monthBookings = monthBookingsRes.data || [];
  const totalBookingsThisMonth = monthBookings.length;
  const revenueThisMonth = monthBookings
    .filter((b) => ["completed", "active", "confirmed"].includes(b.status))
    .reduce((sum, b) => sum + (b.total_price || 0), 0);
  const activeRentalsCount = activeRentalsRes.data?.length || 0;
  const leadsThisMonth = leadsRes.data || [];

  // Lead sources breakdown for this month
  const bookingWidgetLeads = leadsThisMonth.filter((l) => l.source === "booking_widget").length;
  const pcrLeadsLeads = leadsThisMonth.filter((l) => l.source === "pcr_leads").length;
  const otherLeads = leadsThisMonth.filter(
    (l) => l.source !== "booking_widget" && l.source !== "pcr_leads"
  ).length;
  const leadsToday = leadsThisMonth.filter(
    (l) => l.created_at >= todayStart && l.created_at <= todayEnd
  ).length;

  const upcomingReturns = upcomingReturnsRes.data || [];
  const recentBookings = recentBookingsRes.data || [];
  const vehicleCount = vehiclesRes.count || 0;
  const hasVehicles = vehicleCount > 0;
  const noShowCount = noShowsRes.count || 0;

  const stats = [
    {
      title: "Month Revenue",
      value: `$${revenueThisMonth.toLocaleString()}`,
      icon: DollarSign,
      href: undefined,
    },
    {
      title: "Active Rentals",
      value: String(activeRentalsCount),
      icon: Car,
      href: "/dashboard/bookings?filter=active",
    },
    {
      title: "Fleet Size",
      value: String(vehicleCount),
      icon: CalendarDays,
      href: "/dashboard/fleet",
    },
    {
      title: "Leads Today",
      value: String(leadsToday),
      icon: Users,
      href: undefined,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Stripe not connected OR setup incomplete — payments are hard-blocked until charges_enabled */}
      {!operator.charges_enabled && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100">
            <DollarSign className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              {operator.stripe_account_id
                ? '⚠️ Stripe setup incomplete'
                : 'Connect Stripe to accept payments'}
            </p>
            <p className="text-sm text-amber-800">
              {operator.stripe_account_id
                ? "Pick up where you left off — renters can't pay or authorize deposits until setup is complete."
                : "Renters can't pay you or authorize deposits until your Stripe account is connected. Payments go directly to your bank — we never hold your money."}
            </p>
          </div>
          <Link
            href="/api/stripe/connect"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            {operator.stripe_account_id ? 'Resume Setup' : 'Connect Stripe'}
          </Link>
        </div>
      )}

      {/* First-vehicle hero — shown until they add at least one vehicle */}
      {!hasVehicles && (
        <div className="rounded-2xl bg-gradient-to-br from-[#2EBD6B]/10 to-[#2EBD6B]/5 border border-[#2EBD6B]/20 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-[#2EBD6B]/15 flex items-center justify-center">
              <Car className="h-9 w-9 text-[#2EBD6B]" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Add your first vehicle to get started</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Once your fleet is in, your booking page goes live and renters can start booking directly — no calls, no back-and-forth.
          </p>
          <Link
            href="/dashboard/onboarding"
            className="inline-flex items-center gap-2 rounded-xl bg-[#2EBD6B] px-6 py-3 text-base font-semibold text-white hover:bg-[#1a9952] transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Your First Vehicle
          </Link>
        </div>
      )}

      {/* Revenue Trend Chart */}
      <Card className="border-0 shadow-md ring-0" style={{ backgroundColor: "#0c0c1c" }}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-400 uppercase tracking-widest">
            Revenue Trend — Last 6 Months
          </CardTitle>
          <p className="text-3xl font-bold text-white mt-1">
            ${revenueThisMonth.toLocaleString()}
            <span className="text-base font-normal text-gray-400 ml-2">this month</span>
          </p>
        </CardHeader>
        <CardContent className="pt-2">
          <RevenueChart data={revenueChartData} />
        </CardContent>
      </Card>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const card = (
            <Card
              key={stat.title}
              className="border-0 shadow-md ring-0 hover:shadow-lg transition-all"
              style={{ backgroundColor: "#0c0c1c" }}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-1">
                <CardTitle className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {stat.title}
                </CardTitle>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#2EBD6B]/15 ring-1 ring-[#2EBD6B]/30">
                  <stat.icon className="h-4 w-4 text-[#2EBD6B]" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold tracking-tight text-[#2EBD6B]">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          );
          return stat.href ? (
            <Link key={stat.title} href={stat.href}>{card}</Link>
          ) : (
            <div key={stat.title}>{card}</div>
          );
        })}
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
        {operator.booking_slug && (
          <a
            href={`/book/${operator.booking_slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="border-[#2EBD6B] text-[#2EBD6B] hover:bg-[#2EBD6B]/5">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Booking Page
            </Button>
          </a>
        )}
      </div>

      {/* Lead Sources Widget */}
      <LeadSourcesWidget
        bookingWidgetCount={bookingWidgetLeads}
        pcrLeadsCount={pcrLeadsLeads}
        otherCount={otherLeads}
        pcrConversions={0}
      />

      {/* Website Upsell Banner */}
      <div className="relative rounded-xl overflow-hidden border border-blue-500/40 bg-[#0a1020]">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 pl-6">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/30">
            <ExternalLink className="h-5 w-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-white leading-snug">
              Get a Professional Website — $997
            </h3>
            <p className="mt-1 text-sm text-gray-300 leading-relaxed">
              We&apos;ll build your complete business website with all your pages, vehicles, and branding — live in 24–72 hours. You focus on the fleet.
            </p>
          </div>
          <div className="shrink-0">
            <Link href="/dashboard/website">
              <button className="inline-flex items-center justify-center rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2 transition-colors">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Vehicles Needing Service */}
      {vehiclesNeedingService.length > 0 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Vehicles Needing Service ({vehiclesNeedingService.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {vehiclesNeedingService.map(({ vehicle, services }) => (
                <Link
                  key={vehicle?.id}
                  href={`/dashboard/fleet/${vehicle?.id}/maintenance`}
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border border-red-100 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center">
                        <Wrench className="h-4 w-4 text-red-500" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-900">
                          {vehicle?.year} {vehicle?.make} {vehicle?.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {vehicle?.plate || "No plate"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {services.slice(0, 2).map((svc) => (
                        <Badge
                          key={svc}
                          variant="outline"
                          className="ml-1 bg-red-50 text-red-600 border-red-200 text-[10px]"
                        >
                          {svc}
                        </Badge>
                      ))}
                      {services.length > 2 && (
                        <Badge
                          variant="outline"
                          className="ml-1 bg-red-50 text-red-600 border-red-200 text-[10px]"
                        >
                          +{services.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
