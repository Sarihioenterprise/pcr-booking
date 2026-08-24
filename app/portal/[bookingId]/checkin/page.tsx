"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Car,
  CalendarDays,
  CheckCircle2,
  RotateCcw,
  Camera,
  User,
  FileText,
  MapPin,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────
interface BookingData {
  id: string;
  renter_name: string;
  renter_email: string;
  license_number: string | null;
  start_date: string;
  end_date: string;
  duration_days: number;
  total_price: number;
  pickup_location: string | null;
  pickup_instructions: string | null;
  status: string;
  vehicles?: {
    id: string;
    make: string;
    model: string;
    year: number;
    color: string | null;
    plate: string | null;
    photo_url: string | null;
  } | null;
  rental_agreements?: Array<{
    id: string;
    content: string;
    status: string;
  }> | null;
}

const ZONES = ["Front", "Driver Side", "Rear", "Passenger Side"] as const;
type Zone = (typeof ZONES)[number];

const ZONE_ICONS: Record<Zone, string> = {
  Front: "🚗",
  "Driver Side": "🚙",
  Rear: "🔙",
  "Passenger Side": "🚙",
};

// ─── Step indicators ────────────────────────────────────────────────────────
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all ${
            i < current
              ? "bg-[#2EBD6B] w-8"
              : i === current
              ? "bg-[#2EBD6B] w-8"
              : "bg-gray-200 w-4"
          }`}
        />
      ))}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function SelfCheckInPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0=confirm, 1=sign, 2=condition, 3=done
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Step 1 – Renter Info
  const [renterName, setRenterName] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");

  // Step 2 – Signature
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [typedSig, setTypedSig] = useState("");
  const [canvasEmpty, setCanvasEmpty] = useState(true);
  const [agreed, setAgreed] = useState(false);

  // Step 3 – Vehicle Condition
  const [photos, setPhotos] = useState<Partial<Record<Zone, File>>>({});
  const [previews, setPreviews] = useState<Partial<Record<Zone, string>>>({});
  const [conditionNotes, setConditionNotes] = useState("");

  // ── Load booking ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const url = `/api/portal/${bookingId}${token ? `?token=${token}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data: BookingData = await res.json();
        setBooking(data);
        setRenterName(data.renter_name ?? "");
        setLicenseNumber(data.license_number ?? "");
      } else {
        setError("Unable to load booking. Please check your link.");
      }
      setLoading(false);
    }
    load();
  }, [bookingId, token]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function handlePhotoChange(zone: Zone, file: File) {
    setPhotos((prev) => ({ ...prev, [zone]: file }));
    const url = URL.createObjectURL(file);
    setPreviews((prev) => ({ ...prev, [zone]: url }));
  }

  // ── Step handlers ─────────────────────────────────────────────────────────
  function handleConfirmInfo() {
    if (!renterName.trim()) {
      setError("Please confirm your name.");
      return;
    }
    setError("");
    setStep(1);
  }

  async function handleSign() {
    if (!typedSig.trim() || !agreed) {
      setError("Please type your name and accept the terms.");
      return;
    }
    setError("");

    // Sign the agreement
    setSubmitting(true);
    let signaturePng = "";
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      signaturePng = sigPadRef.current.getTrimmedCanvas().toDataURL("image/png");
    }

    const signRes = await fetch(
      `/api/portal/${bookingId}/agreement/sign${token ? `?token=${token}` : ""}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          renter_signature: typedSig.trim(),
          signature_png_b64: signaturePng || undefined,
        }),
      }
    );

    setSubmitting(false);
    if (!signRes.ok) {
      // Agreement might not exist yet – allow through anyway
      console.warn("Agreement sign skipped:", await signRes.text());
    }
    setStep(2);
  }

  async function handleComplete() {
    setSubmitting(true);
    setError("");

    // Build multipart form with zone photos
    const formData = new FormData();
    formData.append("renter_name", renterName);
    formData.append("license_number", licenseNumber);
    formData.append("condition_notes", conditionNotes);
    if (token) formData.append("token", token);

    for (const zone of ZONES) {
      const file = photos[zone];
      if (file) {
        formData.append(`photo_${zone.replace(/ /g, "_")}`, file);
      }
    }

    const res = await fetch(`/api/portal/${bookingId}/checkin`, {
      method: "POST",
      body: formData,
    });

    setSubmitting(false);
    if (res.ok) {
      setStep(3);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Check-in failed. Please try again.");
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-[#2EBD6B] border-t-transparent rounded-full mx-auto mb-3" />
          Loading your check-in...
        </div>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">Booking Not Found</h3>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const vehicle = booking?.vehicles;
  const agreement = Array.isArray(booking?.rental_agreements)
    ? booking?.rental_agreements[0]
    : booking?.rental_agreements;

  // ── Step 3: Confirmed ─────────────────────────────────────────────────────
  if (step === 3) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're Checked In!</h2>
            <p className="text-muted-foreground mb-4">
              Enjoy your rental,{" "}
              <span className="font-semibold text-gray-900">{renterName}</span>!
            </p>
            {vehicle && (
              <div className="mt-2 p-4 bg-gray-50 rounded-xl text-sm text-gray-700 w-full">
                <p className="font-semibold">
                  {vehicle.year} {vehicle.make} {vehicle.model}
                </p>
                {vehicle.plate && (
                  <p className="text-muted-foreground">Plate: {vehicle.plate}</p>
                )}
                {booking?.pickup_instructions && (
                  <p className="mt-2 text-gray-600">{booking.pickup_instructions}</p>
                )}
              </div>
            )}
            <p className="mt-6 text-xs text-muted-foreground">
              Your rental runs {formatDate(booking!.start_date)} →{" "}
              {formatDate(booking!.end_date)} · {booking!.duration_days} days
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold">Self Check-In</h1>
        <p className="text-muted-foreground mt-1">
          Complete your check-in to start your rental
        </p>
      </div>

      <StepIndicator current={step} total={4} />

      {/* ── Booking Summary Card ────────────────────────────────────────── */}
      {booking && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start gap-4">
              <div className="h-14 w-14 rounded-xl bg-[#2EBD6B]/10 flex items-center justify-center flex-shrink-0">
                <Car className="h-7 w-7 text-[#2EBD6B]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">
                  {vehicle
                    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                    : "Vehicle"}
                </p>
                {vehicle?.color && (
                  <p className="text-sm text-muted-foreground">{vehicle.color}</p>
                )}
                <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                  </span>
                  {booking.pickup_location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {booking.pickup_location}
                    </span>
                  )}
                </div>
              </div>
              <Badge
                variant="outline"
                className="capitalize bg-blue-50 text-blue-700 border-blue-200 shrink-0"
              >
                {booking.duration_days}d rental
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 0: Confirm Info ─────────────────────────────────────────── */}
      {step === 0 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-[#2EBD6B]" />
              Step 1 — Confirm Your Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="renter-name">Full Name *</Label>
              <Input
                id="renter-name"
                value={renterName}
                onChange={(e) => setRenterName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="license">Driver's License Number</Label>
              <Input
                id="license"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="e.g. D1234567"
              />
            </div>

            {booking?.pickup_instructions && (
              <div className="p-4 bg-green-50 border border-green-100 rounded-lg">
                <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  Pickup Instructions
                </p>
                <p className="text-sm text-green-700">
                  {booking.pickup_instructions}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}

            <Button
              className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={handleConfirmInfo}
            >
              Confirm & Continue →
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 1: Sign Agreement ──────────────────────────────────────── */}
      {step === 1 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#2EBD6B]" />
              Step 2 — Rental Terms
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {agreement?.content ? (
              <pre className="text-sm bg-slate-50 rounded-lg p-4 whitespace-pre-wrap font-sans leading-relaxed max-h-60 overflow-y-auto border">
                {agreement.content}
              </pre>
            ) : (
              <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 leading-relaxed">
                <p className="font-semibold mb-2">Standard Rental Terms</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Return the vehicle by {formatDate(booking!.end_date)}</li>
                  <li>Fill tank to the level it was received</li>
                  <li>Report any accidents or damage immediately</li>
                  <li>No smoking in the vehicle</li>
                  <li>Renter is responsible for traffic violations</li>
                </ul>
              </div>
            )}

            {/* Typed signature */}
            <div className="space-y-1.5">
              <Label htmlFor="typed-sig">Type your full name as signature *</Label>
              <Input
                id="typed-sig"
                placeholder={booking?.renter_name}
                value={typedSig}
                onChange={(e) => setTypedSig(e.target.value)}
                className="text-lg"
              />
              {typedSig && (
                <div className="rounded-lg border bg-slate-50 p-3 mt-1">
                  <p className="text-xs text-muted-foreground mb-1">Preview</p>
                  <p
                    className="text-xl text-slate-700 italic"
                    style={{ fontFamily: "cursive" }}
                  >
                    {typedSig}
                  </p>
                </div>
              )}
            </div>

            {/* Canvas signature */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Draw Signature (Optional)</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    sigPadRef.current?.clear();
                    setCanvasEmpty(true);
                  }}
                  className="text-slate-500 gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Clear
                </Button>
              </div>
              <div className="relative rounded-xl border-2 border-dashed border-slate-200 bg-white overflow-hidden touch-none">
                {canvasEmpty && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-slate-400 text-sm">Sign here ✍️</p>
                  </div>
                )}
                <SignatureCanvas
                  ref={sigPadRef}
                  penColor="#1e293b"
                  canvasProps={{
                    className: "w-full",
                    style: { height: 140, touchAction: "none" },
                  }}
                  onEnd={() => setCanvasEmpty(sigPadRef.current?.isEmpty() ?? true)}
                  backgroundColor="rgb(255,255,255)"
                />
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="agree" className="text-sm font-normal leading-snug">
                I confirm I have read and agree to all rental terms. I understand
                my typed name constitutes a legally binding electronic signature.
              </Label>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1">
                ← Back
              </Button>
              <Button
                className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                onClick={handleSign}
                disabled={submitting || !typedSig.trim() || !agreed}
              >
                {submitting ? "Signing..." : "Sign & Continue →"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STEP 2: Vehicle Condition ──────────────────────────────────── */}
      {step === 2 && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-[#2EBD6B]" />
              Step 3 — Vehicle Condition
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Upload photos of the vehicle before driving. This protects you from
              pre-existing damage claims.
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              {ZONES.map((zone) => {
                const preview = previews[zone];
                return (
                  <label
                    key={zone}
                    className="relative cursor-pointer block rounded-xl border-2 border-dashed border-gray-200 hover:border-[#2EBD6B] transition-colors overflow-hidden"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handlePhotoChange(zone, f);
                      }}
                    />
                    {preview ? (
                      <>
                        <img
                          src={preview}
                          alt={zone}
                          className="w-full aspect-video object-cover"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs py-1.5 text-center font-medium">
                          ✅ {zone}
                        </div>
                      </>
                    ) : (
                      <div className="aspect-video flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                        <span className="text-2xl">{ZONE_ICONS[zone]}</span>
                        <Camera className="h-5 w-5" />
                        <span className="text-xs font-medium">{zone}</span>
                      </div>
                    )}
                  </label>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="condition-notes">
                Condition Notes{" "}
                <span className="text-muted-foreground">(Optional)</span>
              </Label>
              <textarea
                id="condition-notes"
                rows={3}
                value={conditionNotes}
                onChange={(e) => setConditionNotes(e.target.value)}
                placeholder="Note any pre-existing scratches, dents, or damage…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {error}
              </p>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                ← Back
              </Button>
              <Button
                className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                onClick={handleComplete}
                disabled={submitting}
              >
                {submitting ? "Checking in…" : "Complete Check-In ✓"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
