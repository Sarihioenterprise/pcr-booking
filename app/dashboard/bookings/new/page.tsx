"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";

const placeholderVehicles = [
  { id: "1", label: "Toyota Camry 2024", dailyRate: 65 },
  { id: "2", label: "Honda Civic 2023", dailyRate: 55 },
  { id: "3", label: "Nissan Altima 2024", dailyRate: 60 },
];

export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    renter_name: "",
    renter_phone: "",
    renter_email: "",
    vehicle_id: "",
    start_date: "",
    end_date: "",
    daily_rate: "",
    notes: "",
  });

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleVehicleChange(vehicleId: string | null) {
    if (!vehicleId) return;
    const vehicle = placeholderVehicles.find((v) => v.id === vehicleId);
    setForm((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      daily_rate: vehicle ? String(vehicle.dailyRate) : prev.daily_rate,
    }));
  }

  const { duration, totalPrice } = useMemo(() => {
    if (!form.start_date || !form.end_date || !form.daily_rate) {
      return { duration: 0, totalPrice: 0 };
    }
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    return {
      duration: days,
      totalPrice: days * parseFloat(form.daily_rate || "0"),
    };
  }, [form.start_date, form.end_date, form.daily_rate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("bookings").insert({
        renter_name: form.renter_name,
        renter_phone: form.renter_phone,
        renter_email: form.renter_email,
        vehicle_id: form.vehicle_id,
        start_date: form.start_date,
        end_date: form.end_date,
        daily_rate: parseFloat(form.daily_rate),
        duration,
        total_price: totalPrice,
        notes: form.notes || null,
        status: "pending",
      });

      if (error) throw error;
      router.push("/dashboard/bookings");
    } catch (err) {
      console.error("Failed to create booking:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6">
      <div className="mx-auto max-w-2xl">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Create Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Renter Info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="renter_name">Renter Name</Label>
                  <Input
                    id="renter_name"
                    name="renter_name"
                    placeholder="Full name"
                    value={form.renter_name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="renter_phone">Phone</Label>
                  <Input
                    id="renter_phone"
                    name="renter_phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={form.renter_phone}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="renter_email">Email</Label>
                <Input
                  id="renter_email"
                  name="renter_email"
                  type="email"
                  placeholder="renter@example.com"
                  value={form.renter_email}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Vehicle */}
              <div className="space-y-1.5">
                <Label>Vehicle</Label>
                <Select
                  value={form.vehicle_id}
                  onValueChange={handleVehicleChange}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {placeholderVehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.label} — ${v.dailyRate}/day
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Dates */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    name="start_date"
                    type="date"
                    value={form.start_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    name="end_date"
                    type="date"
                    value={form.end_date}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {/* Rate */}
              <div className="space-y-1.5">
                <Label htmlFor="daily_rate">Daily Rate ($)</Label>
                <Input
                  id="daily_rate"
                  name="daily_rate"
                  type="number"
                  step="0.01"
                  placeholder="65.00"
                  value={form.daily_rate}
                  onChange={handleChange}
                  required
                />
              </div>

              {/* Duration / Total */}
              {duration > 0 && (
                <div className="rounded-lg border border-[#E5E7EB] bg-[#F8F9FC] p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Duration</span>
                    <span className="font-medium text-gray-900">
                      {duration} {duration === 1 ? "day" : "days"}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-gray-500">Total Price</span>
                    <span className="font-semibold text-[#2EBD6B]">
                      ${totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Any additional notes..."
                  value={form.notes}
                  onChange={handleChange}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                >
                  {loading ? "Creating..." : "Create Booking"}
                </Button>
                <Link href="/dashboard/bookings">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
