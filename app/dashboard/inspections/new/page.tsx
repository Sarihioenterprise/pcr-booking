"use client";

import { useState, useEffect } from "react";
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
import {
  ArrowLeft,
  ClipboardCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle, Booking, InspectionChecklist } from "@/lib/types";

const checklistItems: { key: keyof InspectionChecklist; label: string }[] = [
  { key: "exterior_clean", label: "Exterior Clean" },
  { key: "interior_clean", label: "Interior Clean" },
  { key: "tires_ok", label: "Tires OK" },
  { key: "lights_working", label: "Lights Working" },
  { key: "brakes_ok", label: "Brakes OK" },
  { key: "windshield_ok", label: "Windshield OK" },
  { key: "mirrors_ok", label: "Mirrors OK" },
  { key: "ac_working", label: "A/C Working" },
  { key: "radio_working", label: "Radio Working" },
  { key: "spare_tire", label: "Spare Tire Present" },
  { key: "jack_present", label: "Jack Present" },
  { key: "documentation_present", label: "Documentation Present" },
];

const defaultChecklist: InspectionChecklist = {
  exterior_clean: true,
  interior_clean: true,
  tires_ok: true,
  lights_working: true,
  brakes_ok: true,
  windshield_ok: true,
  mirrors_ok: true,
  ac_working: true,
  radio_working: true,
  spare_tire: true,
  jack_present: true,
  documentation_present: true,
};

export default function NewInspectionPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [type, setType] = useState<"pre_rental" | "post_rental">("pre_rental");
  const [mileage, setMileage] = useState("");
  const [fuelLevel, setFuelLevel] = useState("full");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] =
    useState<InspectionChecklist>(defaultChecklist);

  useEffect(() => {
    async function loadData() {
      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .order("make");
      if (v) setVehicles(v as Vehicle[]);

      const { data: b } = await supabase
        .from("bookings")
        .select("*")
        .in("status", ["confirmed", "active"])
        .order("created_at", { ascending: false });
      if (b) setBookings(b as Booking[]);
    }
    loadData();
  }, [supabase]);

  function toggleChecklist(key: keyof InspectionChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) {
      setError("Please select a vehicle.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("inspections")
        .insert({
          vehicle_id: vehicleId,
          booking_id: bookingId || null,
          type,
          status: "pending",
          mileage: mileage ? parseInt(mileage, 10) : null,
          fuel_level: fuelLevel,
          notes: notes || null,
          checklist,
        });

      if (insertError) throw insertError;
      router.push("/dashboard/inspections");
    } catch (err: any) {
      setError(err.message || "Failed to create inspection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inspections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">New Inspection</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5" />
              Inspection Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Vehicle *</Label>
                <Select
                  value={vehicleId}
                  onValueChange={(v) => v && setVehicleId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} ({v.plate || "No plate"})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Booking (optional)</Label>
                <Select
                  value={bookingId}
                  onValueChange={(v) => v && setBookingId(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.renter_name} ({b.start_date} - {b.end_date})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Type *</Label>
                <Select
                  value={type}
                  onValueChange={(v) =>
                    v && setType(v as "pre_rental" | "post_rental")
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_rental">Pre-Rental</SelectItem>
                    <SelectItem value="post_rental">Post-Rental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  type="number"
                  placeholder="e.g. 25000"
                  value={mileage}
                  onChange={(e) => setMileage(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Fuel Level</Label>
                <Select
                  value={fuelLevel}
                  onValueChange={(v) => v && setFuelLevel(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full</SelectItem>
                    <SelectItem value="3/4">3/4</SelectItem>
                    <SelectItem value="1/2">1/2</SelectItem>
                    <SelectItem value="1/4">1/4</SelectItem>
                    <SelectItem value="empty">Empty</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Inspection Checklist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {checklistItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => toggleChecklist(item.key)}
                  className={`flex items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                    checklist[item.key]
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-red-200 bg-red-50"
                  }`}
                >
                  {checklist[item.key] ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                  )}
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Any additional notes about the vehicle condition..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Error & Actions */}
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
          >
            {loading ? "Creating..." : "Create Inspection"}
          </Button>
          <Link href="/dashboard/inspections">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
