"use client";

import { useState, useRef } from "react";
import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, ChevronLeft, ChevronRight, Upload, X, CheckCircle } from "lucide-react";

interface Step4Props {
  onNext: () => void;
  onBack: () => void;
  operatorId: string;
}

export function Step4CustomerInfo({ onNext, onBack, operatorId }: Step4Props) {
  const { state, dispatch } = useWizard();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [licensePreview, setLicensePreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    first_name: state.first_name,
    last_name: state.last_name,
    phone: state.phone,
    email: state.email,
    dob: state.dob,
    license_number: state.license_number,
    license_expiry: state.license_expiry,
    license_state: state.license_state,
  });

  function upd(field: keyof typeof form, val: string) {
    setForm((prev) => ({ ...prev, [field]: val }));
  }

  async function handleLicenseUpload(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("operator_id", operatorId);
      const res = await fetch("/api/license/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      dispatch({
        type: "SET_CUSTOMER",
        payload: { ...state, ...form, license_photo_path: data.path, renter_id: state.renter_id },
      });
      // Preview
      const reader = new FileReader();
      reader.onload = (e) => setLicensePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "License upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleNext() {
    setError("");

    // Validate
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First and last name are required.");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Please provide at least a phone number or email.");
      return;
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setSaving(true);
    try {
      // Upsert renter
      const renterRes = await fetch("/api/renters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${form.first_name.trim()} ${form.last_name.trim()}`,
          email: form.email || null,
          phone: form.phone || null,
          drivers_license_number: form.license_number || null,
          date_of_birth: form.dob || null,
        }),
      });

      let renter_id = state.renter_id;
      if (renterRes.ok) {
        const renterData = await renterRes.json();
        renter_id = renterData.renter?.id ?? renterData.id ?? null;
      }
      // Non-fatal if renter API doesn't exist yet — still continue

      dispatch({
        type: "SET_CUSTOMER",
        payload: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          phone: form.phone,
          email: form.email,
          dob: form.dob,
          license_number: form.license_number,
          license_expiry: form.license_expiry,
          license_state: form.license_state,
          license_photo_path: state.license_photo_path,
          renter_id,
        },
      });

      onNext();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <User className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Customer Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Name */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.first_name}
              onChange={(e) => upd("first_name", e.target.value)}
              placeholder="Jane"
              className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.last_name}
              onChange={(e) => upd("last_name", e.target.value)}
              placeholder="Smith"
              className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
            />
          </div>
        </div>

        {/* Contact */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => upd("phone", e.target.value)}
              placeholder="+1 (555) 000-0000"
              className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => upd("email", e.target.value)}
              placeholder="jane@example.com"
              className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
            />
          </div>
        </div>

        {/* DOB */}
        <div className="space-y-1.5">
          <Label>Date of Birth</Label>
          <Input
            type="date"
            value={form.dob}
            onChange={(e) => upd("dob", e.target.value)}
            className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B] max-w-xs"
          />
        </div>

        {/* License */}
        <div className="rounded-xl border border-gray-100 bg-[#F8F9FC] p-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Driver&apos;s License
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>License #</Label>
              <Input
                value={form.license_number}
                onChange={(e) => upd("license_number", e.target.value)}
                placeholder="DL-1234567"
                className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Expiry Date</Label>
              <Input
                type="date"
                value={form.license_expiry}
                onChange={(e) => upd("license_expiry", e.target.value)}
                className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B]"
              />
            </div>
            <div className="space-y-1.5">
              <Label>State</Label>
              <Input
                value={form.license_state}
                onChange={(e) => upd("license_state", e.target.value)}
                placeholder="FL"
                maxLength={2}
                className="border-gray-200 bg-white focus-visible:ring-[#2EBD6B] uppercase"
              />
            </div>
          </div>

          {/* License photo upload */}
          <div className="space-y-2">
            <Label>License Photo (Front)</Label>
            {state.license_photo_path ? (
              <div className="flex items-center gap-3">
                {licensePreview && (
                  <img
                    src={licensePreview}
                    alt="License"
                    className="h-16 w-24 rounded-lg object-cover border border-gray-200"
                  />
                )}
                <div className="flex items-center gap-2 text-sm text-[#2EBD6B]">
                  <CheckCircle className="h-4 w-4" />
                  <span>License uploaded</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    dispatch({
                      type: "SET_CUSTOMER",
                      payload: { ...state, ...form, license_photo_path: null, renter_id: state.renter_id },
                    });
                    setLicensePreview(null);
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 hover:border-[#2EBD6B] hover:text-[#2EBD6B] transition-colors"
              >
                {uploading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2EBD6B] border-t-transparent" />
                    Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Upload front of license
                  </>
                )}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLicenseUpload(file);
              }}
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={saving}
            className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Saving…
              </span>
            ) : (
              <>
                Continue — Signature <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
