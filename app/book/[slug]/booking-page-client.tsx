"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Car, CheckCircle2, Calendar, Phone, Mail, User, Upload,
  AlertCircle, Shield, FileText, X, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  daily_rate: number;
  weekly_rate: number | null;
  monthly_rate: number | null;
  category: string;
  photo_url: string | null;
  photos?: { url: string; is_primary: boolean }[];
}

const SCALE_PLAN = "scale";

interface Operator {
  id: string;
  business_name: string;
  logo_url: string | null;
  brand_color: string;
  plan?: string;
  brand_logo_url?: string | null;
  brand_primary_color?: string | null;
  brand_company_name?: string | null;
}

interface Props {
  operator: Operator;
  vehicles: Vehicle[];
  slug: string;
}

interface BookingForm {
  name: string;
  phone: string;
  email: string;
  email_error: string;
  start_date: string;
  end_date: string;
}

const emptyForm: BookingForm = {
  name: "",
  phone: "",
  email: "",
  email_error: "",
  start_date: "",
  end_date: "",
};

interface BookedRange {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
}

/** Returns true if the given YYYY-MM-DD string falls within any booked range */
function isDateBooked(date: string, bookedRanges: BookedRange[]): boolean {
  for (const range of bookedRanges) {
    if (date >= range.start && date <= range.end) return true;
  }
  return false;
}

/** Returns true if the date range [start, end] overlaps with any booked range */
function rangeOverlapsBooked(start: string, end: string, bookedRanges: BookedRange[]): boolean {
  for (const range of bookedRanges) {
    // Overlap: start < range.end AND end > range.start
    if (start < range.end && end > range.start) return true;
  }
  return false;
}

/** Format a date as YYYY-MM-DD */
function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

/** Today's date as YYYY-MM-DD */
function today(): string {
  return toDateStr(new Date());
}

export function BookingPageClient({ operator, vehicles, slug }: Props) {
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<BookingForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  // License upload state
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const [licensePath, setLicensePath] = useState<string | null>(null);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Availability state per vehicle
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);

  // White label
  const isScale = operator.plan === SCALE_PLAN;
  const accent = (isScale && operator.brand_primary_color) || operator.brand_color || "#2EBD6B";
  const displayName = (isScale && operator.brand_company_name) || operator.business_name;
  const displayLogo = (isScale && operator.brand_logo_url) || operator.logo_url;

  // Fetch availability when a vehicle is selected
  const fetchAvailability = useCallback(async (vehicleId: string) => {
    setAvailabilityLoading(true);
    setBookedRanges([]);
    try {
      const res = await fetch(
        `/api/vehicles/availability?vehicle_id=${vehicleId}&operator_id=${operator.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setBookedRanges(data.bookedRanges || []);
      }
    } catch {
      // Non-fatal — availability checking is best-effort on client side
    } finally {
      setAvailabilityLoading(false);
    }
  }, [operator.id]);

  // When vehicle selected: fetch availability + reset form
  function handleSelectVehicle(v: Vehicle) {
    setSelectedVehicle(v);
    setForm(emptyForm);
    setLicenseFile(null);
    setLicensePreview(null);
    setLicensePath(null);
    setLicenseError("");
    setSubmitted(false);
    setError("");
    fetchAvailability(v.id);
  }

  function handleEmailBlur() {
    const email = form.email;
    if (!email) {
      setForm((prev) => ({ ...prev, email_error: "" }));
      return;
    }
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    setForm((prev) => ({
      ...prev,
      email_error: valid ? "" : "Please enter a valid email address",
    }));
  }

  // Handle license file selection + upload
  async function handleLicenseChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLicenseFile(file);
    setLicenseError("");
    setLicensePath(null);

    // Preview for images
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setLicensePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setLicensePreview(null);
    }

    // Upload immediately to storage
    setLicenseUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("operator_id", operator.id);

      const res = await fetch("/api/license/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setLicenseError(data.error || "Upload failed. Please try again.");
        setLicensePath(null);
      } else {
        setLicensePath(data.path);
      }
    } catch {
      setLicenseError("Upload failed. Please check your connection and try again.");
    } finally {
      setLicenseUploading(false);
    }
  }

  function removeLicense() {
    setLicenseFile(null);
    setLicensePreview(null);
    setLicensePath(null);
    setLicenseError("");
    if (licenseInputRef.current) licenseInputRef.current.value = "";
  }

  // Date validation helpers
  const dateConflict = form.start_date && form.end_date
    ? rangeOverlapsBooked(form.start_date, form.end_date, bookedRanges)
    : false;

  const daysCount = form.start_date && form.end_date
    ? Math.max(1, Math.ceil((new Date(form.end_date).getTime() - new Date(form.start_date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const estimatedTotal = selectedVehicle && daysCount > 0
    ? selectedVehicle.daily_rate * daysCount
    : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVehicle) return;

    // Email validation
    if (form.email) {
      const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
      if (!valid) {
        setForm((prev) => ({ ...prev, email_error: "Please enter a valid email address" }));
        return;
      }
    }

    // License required
    if (!licensePath) {
      if (licenseUploading) {
        setError("Please wait for the license upload to complete.");
        return;
      }
      setError("Driver's license is required to submit a booking request.");
      return;
    }

    // Date conflict check (client-side)
    if (dateConflict) {
      setError("The selected dates are not available. Please choose different dates.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/book/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          operator_id: operator.id,
          vehicle_id: selectedVehicle.id,
          vehicle_label: `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`,
          name: form.name,
          phone: form.phone,
          email: form.email || null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          license_file_path: licensePath,
          slug,
        }),
      });

      if (res.ok) {
        setSubmitted(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to submit request. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function getVehiclePhoto(v: Vehicle) {
    const primary = v.photos?.find((p) => p.is_primary);
    return primary?.url || v.photos?.[0]?.url || v.photo_url;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]" style={{ "--brand-primary": accent } as React.CSSProperties}>
      <style>{`:root { --brand-primary: ${accent}; }`}</style>

      {/* Header */}
      <header className="bg-white border-b shadow-sm">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center gap-3">
          {displayLogo ? (
            <img src={displayLogo} alt={displayName} className="h-10 w-auto object-contain" />
          ) : (
            <div
              className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: accent }}
            >
              {displayName[0]}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-sm text-gray-500">Available Vehicles</p>
          </div>
        </div>
      </header>

      {/* Vehicles */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        {vehicles.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Car className="mx-auto h-12 w-12 mb-4 text-gray-300" />
            <p className="text-lg font-medium">No vehicles available right now.</p>
            <p className="text-sm mt-1">Please check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v) => {
              const photo = getVehiclePhoto(v);
              return (
                <div key={v.id} className="bg-white rounded-xl shadow-sm border-0 overflow-hidden hover:shadow-md transition-shadow">
                  {photo ? (
                    <div className="aspect-video w-full overflow-hidden bg-gray-100">
                      <img src={photo} alt={`${v.make} ${v.model}`} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-video w-full flex items-center justify-center bg-gray-50">
                      <Car className="h-12 w-12 text-gray-300" />
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {v.year} {v.make} {v.model}
                      </h3>
                      {v.category && (
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {v.category}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                      <span>
                        <span className="font-bold text-gray-900">${Number(v.daily_rate).toFixed(0)}</span>/day
                      </span>
                      {v.weekly_rate && (
                        <span>
                          <span className="font-bold text-gray-900">${Number(v.weekly_rate).toFixed(0)}</span>/week
                        </span>
                      )}
                    </div>
                    <Button
                      className="w-full text-white font-semibold"
                      style={{ backgroundColor: accent }}
                      onClick={() => handleSelectVehicle(v)}
                    >
                      Request to Book
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking Request Dialog */}
      <Dialog
        open={!!selectedVehicle && !submitted}
        onOpenChange={(o) => { if (!o) setSelectedVehicle(null); }}
      >
        <DialogContent className="sm:max-w-lg max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request to Book</DialogTitle>
            <DialogDescription>
              {selectedVehicle && (
                <>
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model}
                  {" — "}<span className="font-medium">${Number(selectedVehicle.daily_rate).toFixed(0)}/day</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {availabilityLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-500 py-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking availability...
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="req-name">
                <User className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="req-name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="John Doe"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="req-phone">
                <Phone className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <Input
                id="req-phone"
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="req-email">
                <Mail className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                Email Address
              </Label>
              <Input
                id="req-email"
                type="text"
                inputMode="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value, email_error: "" })}
                onBlur={handleEmailBlur}
                placeholder="john@example.com"
                className={form.email_error ? "border-red-400" : ""}
              />
              {form.email_error && (
                <p className="text-xs text-red-500">{form.email_error}</p>
              )}
            </div>

            {/* Dates */}
            <div className="space-y-1.5">
              <Label>
                <Calendar className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                Rental Dates
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">Start Date</p>
                  <Input
                    type="date"
                    value={form.start_date}
                    min={today()}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className={dateConflict ? "border-red-400" : ""}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500">End Date</p>
                  <Input
                    type="date"
                    value={form.end_date}
                    min={form.start_date || today()}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className={dateConflict ? "border-red-400" : ""}
                  />
                </div>
              </div>

              {/* Availability conflict warning */}
              {dateConflict && (
                <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>These dates overlap with an existing booking. Please choose different dates.</span>
                </div>
              )}

              {/* Booked ranges hint */}
              {bookedRanges.length > 0 && !dateConflict && (
                <p className="text-xs text-amber-600">
                  ⚠️ Some dates for this vehicle are unavailable. The form will alert you if your selection conflicts.
                </p>
              )}

              {/* Pricing preview */}
              {selectedVehicle && daysCount > 0 && !dateConflict && (
                <div className="rounded-lg bg-gray-50 border border-gray-100 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">{daysCount} day{daysCount !== 1 ? "s" : ""} × ${Number(selectedVehicle.daily_rate).toFixed(0)}/day</span>
                    <span className="font-bold text-gray-900" style={{ color: accent }}>
                      ${estimatedTotal.toFixed(2)} est.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Driver's License Upload */}
            <div className="space-y-1.5">
              <Label>
                <Shield className="h-3.5 w-3.5 inline mr-1 opacity-60" />
                Driver's License <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-400">(required to approve your rental)</span>
              </Label>

              {!licenseFile ? (
                <label className="flex flex-col items-center justify-center w-full border-2 border-dashed border-gray-200 rounded-xl py-6 px-4 cursor-pointer hover:border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm font-medium text-gray-700">Upload front of license</span>
                  <span className="text-xs text-gray-400 mt-1">JPEG, PNG, PDF • Max 10 MB</span>
                  <span className="text-xs text-gray-400">Tap to browse or use camera</span>
                  <input
                    ref={licenseInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    capture="environment"
                    className="sr-only"
                    onChange={handleLicenseChange}
                  />
                </label>
              ) : (
                <div className="relative rounded-xl border border-gray-200 bg-gray-50 p-3">
                  {licenseUploading ? (
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span>Uploading license...</span>
                    </div>
                  ) : licensePath ? (
                    <div className="flex items-center gap-3">
                      {licensePreview ? (
                        <img
                          src={licensePreview}
                          alt="License preview"
                          className="h-16 w-24 object-cover rounded-lg border border-gray-200"
                        />
                      ) : (
                        <div className="h-16 w-16 bg-green-50 rounded-lg flex items-center justify-center border border-green-200">
                          <FileText className="h-8 w-8 text-green-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{licenseFile.name}</p>
                        <p className="text-xs text-green-600 flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3 w-3" />
                          Uploaded successfully
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeLicense}
                        className="text-gray-400 hover:text-gray-600 shrink-0"
                        aria-label="Remove license"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ) : null}

                  {licenseError && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{licenseError}</span>
                    </div>
                  )}
                </div>
              )}

              {licenseError && !licenseFile && (
                <p className="text-xs text-red-500">{licenseError}</p>
              )}
            </div>

            {/* Form error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSelectedVehicle(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || licenseUploading || dateConflict}
                className="text-white"
                style={{ backgroundColor: accent }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : "Submit Request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog
        open={submitted}
        onOpenChange={(o) => { if (!o) { setSubmitted(false); setSelectedVehicle(null); } }}
      >
        <DialogContent className="sm:max-w-md text-center">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Request Submitted!</h2>
              <p className="text-gray-600">
                Your request has been submitted! <strong>{displayName}</strong> will contact you shortly to confirm your reservation.
              </p>
            </div>
            <Button
              onClick={() => { setSubmitted(false); setSelectedVehicle(null); }}
              className="text-white mt-2"
              style={{ backgroundColor: accent }}
            >
              Browse More Vehicles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
