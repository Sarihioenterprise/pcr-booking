import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Car,
  Calendar,
  DollarSign,
  FileText,
  LogOut,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  MapPin,
  Phone,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { verifyRenterToken, RENTER_SESSION_COOKIE } from "@/lib/renter-portal-jwt";
import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string | null;
  photo_url: string | null;
}

interface Operator {
  id: string;
  business_name: string;
  booking_slug: string;
}

interface Booking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  daily_rate: number;
  total_price: number;
  tax_amount: number | null;
  discount_amount: number | null;
  addons_total: number | null;
  deposit_amount: number | null;
  deposit_status: string | null;
  duration_days: number;
  created_at: string;
  pickup_location: string | null;
  pickup_time: string | null;
  return_time: string | null;
  vehicles: Vehicle | null;
  operators: Operator | null;
}

interface Renter {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  state: string | null;
  created_at: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtCurrency(amount: number | null | undefined) {
  if (amount == null) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const ACTIVE_STATUSES = new Set(["confirmed", "active"]);
const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-600",
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  active: "bg-emerald-100 text-emerald-700",
  completed: "bg-slate-100 text-slate-500",
  cancelled: "bg-red-100 text-red-600",
};

function StatusIcon({ status }: { status: string }) {
  if (status === "active") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === "confirmed") return <Clock className="h-3.5 w-3.5" />;
  if (status === "cancelled") return <XCircle className="h-3.5 w-3.5" />;
  if (status === "completed") return <CheckCircle2 className="h-3.5 w-3.5" />;
  return <AlertCircle className="h-3.5 w-3.5" />;
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default async function RenterDashboard() {
  // Auth check
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(RENTER_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    redirect("/renter-portal/login");
  }

  const payload = await verifyRenterToken(sessionToken);
  if (!payload || payload.type !== "session") {
    redirect("/renter-portal/login?error=invalid_token");
  }

  // Fetch data server-side
  const supabase = createAdminClient();

  const [{ data: renter }, { data: bookings }] = await Promise.all([
    supabase
      .from("renters")
      .select("id, name, email, phone, city, state, created_at")
      .eq("id", payload.sub)
      .single(),
    supabase
      .from("bookings")
      .select(`
        id, status, start_date, end_date, daily_rate, total_price,
        tax_amount, discount_amount, addons_total, deposit_amount, deposit_status,
        duration_days, created_at, pickup_location, pickup_time, return_time,
        vehicles ( id, make, model, year, color, photo_url ),
        operators ( id, business_name, booking_slug )
      `)
      .eq("renter_id", payload.sub)
      .order("created_at", { ascending: false }),
  ]);

  if (!renter) {
    redirect("/renter-portal/login");
  }

  const allBookings = (bookings ?? []) as unknown as Booking[];
  const activeBooking = allBookings.find((b) => ACTIVE_STATUSES.has(b.status)) ?? null;
  const pastBookings = allBookings.filter((b) => !ACTIVE_STATUSES.has(b.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-emerald-600" />
            <span className="font-semibold text-gray-900">My Rentals</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{renter.email}</span>
            <Link href="/api/renter-portal/logout">
              <Button variant="outline" size="sm" className="gap-1.5 text-gray-600">
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hi, {(renter as Renter).name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">Here&apos;s your rental account overview.</p>
        </div>

        {/* Active Booking */}
        {activeBooking ? (
          <ActiveBookingCard booking={activeBooking} />
        ) : (
          <Card className="border-dashed border-gray-200 bg-gray-50/50">
            <CardContent className="py-8 text-center">
              <Car className="h-8 w-8 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No active rental right now.</p>
            </CardContent>
          </Card>
        )}

        {/* Booking History */}
        <div>
          <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            Booking History
          </h2>

          {allBookings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-400">No bookings yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {allBookings.map((booking) => (
                <BookingRow key={booking.id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Account Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <User className="h-4 w-4 text-gray-400" />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Name</span>
              <span className="text-gray-800 font-medium">{(renter as Renter).name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Email</span>
              <span className="text-gray-800">{renter.email}</span>
            </div>
            {(renter as Renter).phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Phone</span>
                <span className="text-gray-800">{(renter as Renter).phone}</span>
              </div>
            )}
            {(renter as Renter).city && (
              <div className="flex justify-between">
                <span className="text-gray-500">Location</span>
                <span className="text-gray-800">
                  {[(renter as Renter).city, (renter as Renter).state].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Member since</span>
              <span className="text-gray-800">{fmt((renter as Renter).created_at)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Questions?{" "}
          {activeBooking?.operators?.booking_slug ? (
            <Link
              href={`/book/${activeBooking.operators.booking_slug}`}
              className="text-emerald-600 hover:underline"
            >
              Contact your rental company
            </Link>
          ) : (
            <span>Contact your rental company.</span>
          )}
        </p>
      </main>
    </div>
  );
}

// ─── Active Booking Card ──────────────────────────────────────────────────

function ActiveBookingCard({ booking }: { booking: Booking }) {
  const v = booking.vehicles;
  const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : "Vehicle";

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4" />
            {booking.status === "active" ? "Active Rental" : "Upcoming Rental"}
          </CardTitle>
          <Badge
            className={`text-xs font-medium capitalize ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600"}`}
          >
            <StatusIcon status={booking.status} />
            <span className="ml-1">{booking.status}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle */}
        <div className="flex items-center gap-3">
          {v?.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={v.photo_url}
              alt={vehicleName}
              className="h-16 w-24 object-cover rounded-lg border border-gray-200"
            />
          ) : (
            <div className="h-16 w-24 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
              <Car className="h-6 w-6 text-gray-300" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-base">{vehicleName}</p>
            {v?.color && (
              <p className="text-sm text-gray-500">{v.color}</p>
            )}
            {booking.operators?.business_name && (
              <p className="text-xs text-gray-400 mt-0.5">{booking.operators.business_name}</p>
            )}
          </div>
        </div>

        <Separator className="bg-emerald-100" />

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Pickup</p>
              <p className="font-medium text-gray-800">{fmt(booking.start_date)}</p>
              {booking.pickup_time && (
                <p className="text-xs text-gray-400">{booking.pickup_time}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-gray-500 text-xs">Return</p>
              <p className="font-medium text-gray-800">{fmt(booking.end_date)}</p>
              {booking.return_time && (
                <p className="text-xs text-gray-400">{booking.return_time}</p>
              )}
            </div>
          </div>
        </div>

        {booking.pickup_location && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-gray-600">{booking.pickup_location}</p>
          </div>
        )}

        <Separator className="bg-emerald-100" />

        {/* Pricing */}
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>{fmtCurrency(booking.daily_rate)}/day × {booking.duration_days} days</span>
            <span>{fmtCurrency(booking.daily_rate * booking.duration_days)}</span>
          </div>
          {(booking.addons_total ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Add-ons</span>
              <span>{fmtCurrency(booking.addons_total)}</span>
            </div>
          )}
          {(booking.tax_amount ?? 0) > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Tax</span>
              <span>{fmtCurrency(booking.tax_amount)}</span>
            </div>
          )}
          {(booking.discount_amount ?? 0) > 0 && (
            <div className="flex justify-between text-emerald-600">
              <span>Discount</span>
              <span>-{fmtCurrency(booking.discount_amount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold text-gray-900">
            <span>Total</span>
            <span>{fmtCurrency(booking.total_price)}</span>
          </div>
        </div>

        {/* Invoice link */}
        <div className="flex gap-2 pt-1">
          <Link href={`/renter-portal/invoice/${booking.id}`} target="_blank" className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-gray-600">
              <FileText className="h-3.5 w-3.5" />
              View Invoice
            </Button>
          </Link>
          <Link href={`/portal/${booking.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-gray-600">
              <Car className="h-3.5 w-3.5" />
              Booking Portal
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Booking Row (History) ────────────────────────────────────────────────

function BookingRow({ booking }: { booking: Booking }) {
  const v = booking.vehicles;
  const vehicleName = v ? `${v.year} ${v.make} ${v.model}` : "Vehicle";

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="py-4 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {v?.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={v.photo_url}
                alt={vehicleName}
                className="h-12 w-16 object-cover rounded-md border border-gray-200 shrink-0"
              />
            ) : (
              <div className="h-12 w-16 bg-gray-100 rounded-md border border-gray-200 flex items-center justify-center shrink-0">
                <Car className="h-5 w-5 text-gray-300" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-medium text-gray-900 text-sm truncate">{vehicleName}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {fmt(booking.start_date)} – {fmt(booking.end_date)}
              </p>
              {booking.operators?.business_name && (
                <p className="text-xs text-gray-400 mt-0.5">{booking.operators.business_name}</p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <Badge
              className={`text-xs font-medium capitalize mb-1 ${STATUS_COLORS[booking.status] ?? "bg-gray-100 text-gray-600"}`}
            >
              {booking.status}
            </Badge>
            <p className="text-sm font-semibold text-gray-800">
              {fmtCurrency(booking.total_price)}
            </p>
          </div>
        </div>

        <div className="flex gap-2 mt-3">
          <Link href={`/renter-portal/invoice/${booking.id}`} target="_blank">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-gray-700 gap-1">
              <FileText className="h-3 w-3" />
              Invoice
            </Button>
          </Link>
          <Link href={`/portal/${booking.id}`}>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-gray-700 gap-1">
              <DollarSign className="h-3 w-3" />
              Details
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
