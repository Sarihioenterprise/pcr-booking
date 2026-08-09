"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Camera,
  X,
  Loader2,
  Gauge,
  Fuel,
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

const FUEL_OPTIONS = [
  { value: "full", label: "Full (F)" },
  { value: "3/4", label: "3/4" },
  { value: "1/2", label: "1/2" },
  { value: "1/4", label: "1/4" },
  { value: "empty", label: "Empty (E)" },
];

interface PhotoEntry {
  file: File;
  preview: string;
  uploading: boolean;
  path: string | null;
  error: string | null;
}

export default function NewInspectionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [type, setType] = useState<"pre_rental" | "post_rental">("pre_rental");
  const [odometer, setOdometer] = useState("");
  const [fuelLevel, setFuelLevel] = useState("full");
  const [notes, setNotes] = useState("");
  const [checklist, setChecklist] = useState<InspectionChecklist>(defaultChecklist);
  const [photos, setPhotos] = useState<PhotoEntry[]>([]);
  const [operatorId, setOperatorId] = useState<string | null>(null);

  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get operator id for photo upload
      const { data: op } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (op) setOperatorId(op.id);

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

    // Pre-fill booking_id and type from query params (linked from booking detail)
    const qBookingId = searchParams.get("booking_id");
    const qType = searchParams.get("type");
    const qVehicleId = searchParams.get("vehicle_id");
    if (qBookingId) setBookingId(qBookingId);
    if (qType === "pre_rental" || qType === "post_rental") setType(qType);
    if (qVehicleId) setVehicleId(qVehicleId);
  }, [supabase, searchParams]);

  function toggleChecklist(key: keyof InspectionChecklist) {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newEntries: PhotoEntry[] = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      uploading: true,
      path: null,
      error: null,
    }));

    setPhotos((prev) => [...prev, ...newEntries]);

    // Upload each photo
    for (const entry of newEntries) {
      const fd = new FormData();
      fd.append("file", entry.file);
      if (operatorId) fd.append("operator_id", operatorId);

      try {
        const res = await fetch("/api/inspections/upload", {
          method: "POST",
          body: fd,
        });
        const data = await res.json();
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === entry.preview
              ? {
                  ...p,
                  uploading: false,
                  path: data.path || null,
                  error: data.error || (res.ok ? null : "Upload failed"),
                }
              : p
          )
        );
      } catch {
        setPhotos((prev) =>
          prev.map((p) =>
            p.preview === entry.preview
              ? { ...p, uploading: false, error: "Network error" }
              : p
          )
        );
      }
    }

    // Reset file input so same file can be re-selected
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  function removePhoto(preview: string) {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.preview === preview);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter((p) => p.preview !== preview);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vehicleId) {
      setError("Please select a vehicle.");
      return;
    }

    const uploadingCount = photos.filter((p) => p.uploading).length;
    if (uploadingCount > 0) {
      setError("Please wait for all photos to finish uploading.");
      return;
    }

    setLoading(true);
    setError("");

    const photoPaths = photos
      .filter((p) => p.path && !p.error)
      .map((p) => p.path as string);

    try {
      const { error: insertError } = await supabase.from("inspections").insert({
        vehicle_id: vehicleId,
        booking_id: bookingId || null,
        type,
        status: "pending",
        mileage: odometer ? parseInt(odometer, 10) : null,
        fuel_level: fuelLevel,
        notes: notes || null,
        checklist,
        ...(photoPaths.length > 0 ? { photo_paths: photoPaths } : {}),
      });

      if (insertError) {
        // Graceful fallback: photo_paths column may not exist yet
        if (insertError.message?.includes("photo_paths")) {
          const { error: err2 } = await supabase.from("inspections").insert({
            vehicle_id: vehicleId,
            booking_id: bookingId || null,
            type,
            status: "pending",
            mileage: odometer ? parseInt(odometer, 10) : null,
            fuel_level: fuelLevel,
            notes: notes || null,
            checklist,
          });
          if (err2) throw err2;
        } else {
          throw insertError;
        }
      }

      // Redirect back to booking if came from there
      if (bookingId) {
        router.push(`/dashboard/bookings/${bookingId}?tab=inspections`);
      } else {
        router.push("/dashboard/inspections");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create inspection";
      setError(msg);
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
        <div>
          <h1 className="text-2xl font-bold">New Inspection</h1>
          <p className="text-sm text-muted-foreground">
            Record vehicle condition, odometer, fuel level, and photos
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardCheck className="h-5 w-5 text-[#2EBD6B]" />
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
                  onValueChange={(v) => v && setBookingId(v === "_none" ? "" : v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Link to booking" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">— None —</SelectItem>
                    {bookings.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.renter_name} ({b.start_date} – {b.end_date})
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
                  onValueChange={(v) => v && setType(v as "pre_rental" | "post_rental")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_rental">Pickup (Pre-Rental)</SelectItem>
                    <SelectItem value="post_rental">Return (Post-Rental)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="odometer" className="flex items-center gap-1.5">
                  <Gauge className="h-4 w-4 text-gray-400" />
                  Odometer Reading
                </Label>
                <Input
                  id="odometer"
                  type="number"
                  placeholder="e.g. 25,000 miles"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  min="0"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Fuel className="h-4 w-4 text-gray-400" />
                  Fuel Level
                </Label>
                <Select value={fuelLevel} onValueChange={(v) => v && setFuelLevel(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photo Upload */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Camera className="h-5 w-5 text-[#2EBD6B]" />
              Damage Photos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Take photos of the vehicle condition. Photos are stored privately and accessible only to you.
            </p>

            {/* Photo Grid */}
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {photos.map((photo) => (
                  <div
                    key={photo.preview}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <img
                      src={photo.preview}
                      alt="Inspection photo"
                      className="h-full w-full object-cover"
                    />
                    {photo.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                    {photo.error && (
                      <div className="absolute inset-0 flex items-center justify-center bg-red-900/60">
                        <span className="text-xs text-white text-center px-1">{photo.error}</span>
                      </div>
                    )}
                    {!photo.uploading && (
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.preview)}
                        className="absolute top-1 right-1 rounded-full bg-black/60 p-0.5 hover:bg-black/80 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-white" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload button — mobile-friendly: capture="environment" for camera */}
            <div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                multiple
                onChange={handlePhotoSelect}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer gap-2"
                  onClick={() => photoInputRef.current?.click()}
                >
                  <Camera className="h-4 w-4" />
                  {photos.length === 0 ? "Add Photos" : "Add More Photos"}
                </Button>
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                On mobile: opens camera. On desktop: file picker. JPEG/PNG/WebP, max 15 MB each.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Checklist */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-lg">Condition Checklist</CardTitle>
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
              placeholder="Any additional notes about vehicle condition, damage details, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={loading || photos.some((p) => p.uploading)}
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
