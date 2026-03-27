"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import type { Vehicle, Booking } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-muted text-muted-foreground border-border",
  maintenance: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

export default function VehicleDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (v) {
        setVehicle(v as Vehicle);
        const { data: b } = await supabase
          .from("bookings")
          .select("*")
          .eq("vehicle_id", id)
          .order("created_at", { ascending: false })
          .limit(10);
        setBookings((b as Booking[]) ?? []);
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function updateStatus(value: string | null) {
    if (!vehicle || !value) return;
    await supabase.from("vehicles").update({ status: value }).eq("id", vehicle.id);
    setVehicle({ ...vehicle, status: value as Vehicle["status"] });
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!vehicle) {
    return <div className="text-muted-foreground">Vehicle not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fleet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-muted-foreground">
            {vehicle.color} &middot; {vehicle.plate}
          </p>
        </div>
        <Badge variant="outline" className={statusColors[vehicle.status]}>
          {vehicle.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Details
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Daily Rate</p>
                <p className="font-semibold text-lg text-primary">
                  ${Number(vehicle.daily_rate).toFixed(0)}/day
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Year</p>
                <p className="font-semibold">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Color</p>
                <p className="font-semibold">{vehicle.color || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Plate</p>
                <p className="font-semibold">{vehicle.plate || "—"}</p>
              </div>
            </div>

            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">Status</p>
              <Select value={vehicle.status} onValueChange={updateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Booking History</CardTitle>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No bookings for this vehicle yet.
              </p>
            ) : (
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/dashboard/bookings/${booking.id}`}
                    className="block p-3 rounded-lg bg-secondary hover:bg-accent transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{booking.renter_name}</span>
                      <Badge variant="outline">{booking.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {booking.start_date} → {booking.end_date}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
