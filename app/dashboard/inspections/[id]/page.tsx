"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  ClipboardCheck,
  Car,
  Gauge,
  Fuel,
  CalendarDays,
  ImagePlus,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  Inspection,
  InspectionChecklist,
  InspectionPhoto,
  Vehicle,
  Booking,
} from "@/lib/types";

const checklistLabels: Record<keyof InspectionChecklist, string> = {
  exterior_clean: "Exterior Clean",
  interior_clean: "Interior Clean",
  tires_ok: "Tires OK",
  lights_working: "Lights Working",
  brakes_ok: "Brakes OK",
  windshield_ok: "Windshield OK",
  mirrors_ok: "Mirrors OK",
  ac_working: "A/C Working",
  radio_working: "Radio Working",
  spare_tire: "Spare Tire Present",
  jack_present: "Jack Present",
  documentation_present: "Documentation Present",
};

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const typeColors: Record<string, string> = {
  pre_rental: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  post_rental: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

export default function InspectionDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [photos, setPhotos] = useState<InspectionPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: insp } = await supabase
        .from("inspections")
        .select("*")
        .eq("id", id)
        .single();

      if (!insp) {
        setLoading(false);
        return;
      }

      setInspection(insp as Inspection);

      const [vehicleRes, photosRes] = await Promise.all([
        supabase.from("vehicles").select("*").eq("id", insp.vehicle_id).single(),
        supabase
          .from("inspection_photos")
          .select("*")
          .eq("inspection_id", id)
          .order("created_at"),
      ]);

      if (vehicleRes.data) setVehicle(vehicleRes.data as Vehicle);
      if (photosRes.data) setPhotos(photosRes.data as InspectionPhoto[]);

      if (insp.booking_id) {
        const { data: b } = await supabase
          .from("bookings")
          .select("*")
          .eq("id", insp.booking_id)
          .single();
        if (b) setBooking(b as Booking);
      }

      setLoading(false);
    }
    load();
  }, [id, supabase]);

  async function markCompleted() {
    if (!inspection) return;
    setCompleting(true);
    await supabase
      .from("inspections")
      .update({ status: "completed" })
      .eq("id", inspection.id);
    setInspection({ ...inspection, status: "completed" });
    setCompleting(false);
  }

  async function createDamageClaim() {
    if (!inspection || !booking || !vehicle) return;
    router.push(
      `/dashboard/inspections?create_claim=true&booking_id=${booking.id}&vehicle_id=${vehicle.id}&inspection_id=${inspection.id}`
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading inspection...
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Inspection not found.
      </div>
    );
  }

  const checklist = inspection.checklist as InspectionChecklist;
  const failedItems = Object.entries(checklist).filter(
    ([, value]) => !value
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inspections">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Inspection Detail</h1>
          <p className="text-muted-foreground">
            {new Date(inspection.created_at).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={typeColors[inspection.type] || ""}>
            {inspection.type.replace("_", "-")}
          </Badge>
          <Badge
            variant="outline"
            className={statusColors[inspection.status] || ""}
          >
            {inspection.status}
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Vehicle Info */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="h-5 w-5" />
              Vehicle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vehicle ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vehicle</span>
                  <Link
                    href={`/dashboard/fleet/${vehicle.id}`}
                    className="font-medium hover:underline"
                  >
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </Link>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Plate</span>
                  <span className="font-medium">{vehicle.plate || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Color</span>
                  <span className="font-medium">{vehicle.color || "—"}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Vehicle info unavailable.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Booking & Readings */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Booking & Readings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {booking ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Renter</span>
                    <span className="font-medium">{booking.renter_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dates</span>
                    <span className="font-medium">
                      {new Date(booking.start_date).toLocaleDateString()} -{" "}
                      {new Date(booking.end_date).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking</span>
                  <span className="text-muted-foreground">No booking linked</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Gauge className="h-3.5 w-3.5" /> Mileage
                </span>
                <span className="font-medium">
                  {inspection.mileage
                    ? inspection.mileage.toLocaleString()
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Fuel className="h-3.5 w-3.5" /> Fuel Level
                </span>
                <span className="font-medium">
                  {inspection.fuel_level || "—"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Checklist */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Checklist
            {failedItems > 0 && (
              <Badge variant="outline" className="ml-2 bg-red-50 text-red-600">
                {failedItems} issue{failedItems !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(
              Object.entries(checklistLabels) as [
                keyof InspectionChecklist,
                string,
              ][]
            ).map(([key, label]) => (
              <div
                key={key}
                className={`flex items-center gap-3 rounded-lg border p-3 ${
                  checklist[key]
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                {checklist[key] ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                )}
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Inspection Photos ({photos.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No photos attached to this inspection.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="overflow-hidden rounded-lg border"
                >
                  <img
                    src={photo.url}
                    alt={photo.label}
                    className="aspect-video w-full object-cover"
                  />
                  <div className="p-2">
                    <p className="text-xs text-muted-foreground">
                      {photo.label}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      {inspection.notes && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{inspection.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {inspection.status === "pending" && (
          <Button
            className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
            onClick={markCompleted}
            disabled={completing}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {completing ? "Completing..." : "Mark as Completed"}
          </Button>
        )}
        {inspection.type === "post_rental" && booking && (
          <Button variant="outline" onClick={createDamageClaim}>
            <AlertTriangle className="mr-2 h-4 w-4" />
            Create Damage Claim
          </Button>
        )}
      </div>
    </div>
  );
}
