"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Booking, Vehicle } from "@/lib/types";

const statusColors: Record<string, string> = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  confirmed: "bg-primary/10 text-primary border-primary/20",
  active: "bg-success/10 text-success border-success/20",
  completed: "bg-muted text-muted-foreground border-border",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function BookingDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: b } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single();

      if (b) {
        setBooking(b as Booking);
        if (b.vehicle_id) {
          const { data: v } = await supabase
            .from("vehicles")
            .select("*")
            .eq("id", b.vehicle_id)
            .single();
          setVehicle(v as Vehicle | null);
        }
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function updateStatus(value: string | null) {
    if (!booking || !value) return;
    await supabase.from("bookings").update({ status: value }).eq("id", booking.id);
    setBooking({ ...booking, status: value as Booking["status"] });
  }

  function handleStatusChange(val: Booking["status"] | null) {
    if (val) updateStatus(val);
  }

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!booking) return <div className="text-muted-foreground">Booking not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/bookings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{booking.renter_name}</h1>
          <p className="text-muted-foreground">Booking details</p>
        </div>
        <Badge variant="outline" className={statusColors[booking.status]}>
          {booking.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Renter Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{booking.renter_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{booking.renter_phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{booking.renter_email || "—"}</p>
            </div>
            {booking.notes && (
              <div>
                <p className="text-muted-foreground">Notes</p>
                <p className="font-medium">{booking.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Vehicle</p>
              <p className="font-medium">
                {vehicle
                  ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                  : "No vehicle assigned"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Start Date</p>
                <p className="font-medium">{booking.start_date}</p>
              </div>
              <div>
                <p className="text-muted-foreground">End Date</p>
                <p className="font-medium">{booking.end_date}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{booking.duration_days} days</p>
              </div>
              <div>
                <p className="text-muted-foreground">Daily Rate</p>
                <p className="font-medium">${Number(booking.daily_rate).toFixed(2)}</p>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground">Total Price</p>
              <p className="text-xl font-bold text-primary">
                ${Number(booking.total_price).toLocaleString()}
              </p>
            </div>
            <div className="pt-4 border-t border-border space-y-2">
              <p className="text-muted-foreground">Update Status</p>
              <Select value={booking.status} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
