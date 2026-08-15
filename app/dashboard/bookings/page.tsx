import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays, ShieldCheck } from "lucide-react";

const statusColors: Record<string, string> = {
  inquiry: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function BookingsPage() {
  const operator = await getOperator();
  const supabase = createAdminClient();

  // Use !left to prevent PostgREST inner-join from silently dropping bookings
  // whose vehicle_id is NULL. Omit renters(...) embed entirely — there is no FK
  // from bookings.renter_id to renters.id so PostgREST returns null for the whole
  // query when that embed is present. drivers_license_url is already a column on
  // the bookings table (migration 002) so we don't need the renter join.
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("*, vehicles!left(make, model, year)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  if (bookingsError) {
    console.error("Bookings query error:", bookingsError);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bookings</h1>
          <p className="text-muted-foreground">
            {bookings?.length ?? 0} total bookings
          </p>
        </div>
        <Link href="/dashboard/bookings/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        </Link>
      </div>

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No bookings yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first booking or share your booking page
            </p>
            <Link href="/dashboard/bookings/new">
              <Button>Create Booking</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => {
            // License on file: check booking-level drivers_license_url
            // (renter join removed — no FK; booking col added in migration 002)
            const licenseOnFile = !!booking.drivers_license_url;

            return (
              <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
                <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-3">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{booking.renter_name}</h3>
                          {licenseOnFile && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 shrink-0"
                            >
                              <ShieldCheck className="h-3 w-3 mr-1" />
                              License on file
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {booking.vehicles
                            ? `${(booking.vehicles as { year: number; make: string; model: string }).year} ${(booking.vehicles as { year: number; make: string; model: string }).make} ${(booking.vehicles as { year: number; make: string; model: string }).model}`
                            : "No vehicle assigned"}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {booking.start_date} → {booking.end_date} &middot;{" "}
                          {booking.duration_days} days
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <Badge
                          variant="outline"
                          className={statusColors[booking.status]}
                        >
                          {booking.status}
                        </Badge>
                        <p className="text-lg font-bold mt-1">
                          ${Number(booking.total_price).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
