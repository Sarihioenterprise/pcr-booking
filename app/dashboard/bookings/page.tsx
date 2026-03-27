import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, CalendarDays } from "lucide-react";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  confirmed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default async function BookingsPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, vehicles(make, model, year)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

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
              Create your first booking or share your widget
            </p>
            <Link href="/dashboard/bookings/new">
              <Button>Create Booking</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking) => (
            <Link key={booking.id} href={`/dashboard/bookings/${booking.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer mb-3">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{booking.renter_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {booking.vehicles
                          ? `${booking.vehicles.year} ${booking.vehicles.make} ${booking.vehicles.model}`
                          : "No vehicle assigned"}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {booking.start_date} → {booking.end_date} &middot;{" "}
                        {booking.duration_days} days
                      </p>
                    </div>
                    <div className="text-right">
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
          ))}
        </div>
      )}
    </div>
  );
}
