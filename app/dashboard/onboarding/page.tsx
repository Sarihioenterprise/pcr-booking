"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { Car, CheckCircle2, Copy, Check, Upload, ImageIcon, X } from "lucide-react";
import type { Operator } from "@/lib/types";

type Step = 1 | 2 | 3;

export default function OnboardingWizardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState<Step>(1);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 1: Vehicle form
  const [vehicleForm, setVehicleForm] = useState({
    year: "",
    make: "",
    model: "",
    plate: "",
    daily_rate: "",
    weekly_rate: "",
    photo_url: "",
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [error, setError] = useState("");

  // Load operator info
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) setOperator(data);
    }
    load();
  }, [supabase]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPhotoPreview(objectUrl);
    setPhotoUploading(true);

    try {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("vehicle-photos")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("vehicle-photos")
        .getPublicUrl(data.path);

      setVehicleForm((prev) => ({ ...prev, photo_url: publicUrl }));
    } catch {
      setVehicleForm((prev) => ({ ...prev, photo_url: objectUrl }));
    } finally {
      setPhotoUploading(false);
    }
  }

  function clearPhoto() {
    setPhotoPreview(null);
    setVehicleForm((prev) => ({ ...prev, photo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleAddVehicle(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!operator) throw new Error("Operator not found");

      const { error: insertError } = await supabase.from("vehicles").insert({
        operator_id: operator.id,
        make: vehicleForm.make,
        model: vehicleForm.model,
        year: parseInt(vehicleForm.year, 10),
        plate: vehicleForm.plate || null,
        daily_rate: parseFloat(vehicleForm.daily_rate),
        weekly_rate: vehicleForm.weekly_rate ? parseFloat(vehicleForm.weekly_rate) : null,
        category: "sedan",
        photo_url: vehicleForm.photo_url || null,
        status: "active",
        minimum_rental_days: 1,
        mileage: 0,
        fuel_level: "full",
      });

      if (insertError) throw insertError;
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    const link = `${process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com"}/rent/${operator?.booking_slug}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!operator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F8F9FC]">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] py-12 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        {/* Step Indicator */}
        <div className="mb-10">
          <div className="flex items-center justify-between gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center flex-1">
                <div
                  className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                    step >= s
                      ? "bg-[#2EBD6B] text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {step > s ? <CheckCircle2 className="h-5 w-5" /> : s}
                </div>
                {s < 3 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-all ${
                      step > s ? "bg-[#2EBD6B]" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            Step {step} of 3
          </div>
        </div>

        {/* Step 1: Add Vehicle */}
        {step === 1 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Add your first vehicle</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddVehicle} className="space-y-6">
                {/* Vehicle Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="year">Year *</Label>
                    <Input
                      id="year"
                      type="number"
                      placeholder="e.g. 2024"
                      value={vehicleForm.year}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="make">Make *</Label>
                    <Input
                      id="make"
                      placeholder="e.g. Toyota"
                      value={vehicleForm.make}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model">Model *</Label>
                    <Input
                      id="model"
                      placeholder="e.g. Camry"
                      value={vehicleForm.model}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="plate">License Plate</Label>
                    <Input
                      id="plate"
                      placeholder="e.g. ABC-1234"
                      value={vehicleForm.plate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Pricing */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="daily_rate">Daily Rate ($) *</Label>
                    <Input
                      id="daily_rate"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 65"
                      value={vehicleForm.daily_rate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, daily_rate: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="weekly_rate">Weekly Rate ($)</Label>
                    <Input
                      id="weekly_rate"
                      type="number"
                      step="0.01"
                      placeholder="e.g. 400"
                      value={vehicleForm.weekly_rate}
                      onChange={(e) => setVehicleForm({ ...vehicleForm, weekly_rate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Photo Upload */}
                <div className="space-y-2">
                  <Label>Vehicle Photo (optional)</Label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  {photoPreview ? (
                    <div className="relative w-full h-40 rounded-lg overflow-hidden border border-gray-200 bg-gray-50">
                      <img
                        src={photoPreview}
                        alt="Vehicle preview"
                        className="w-full h-full object-cover"
                      />
                      {photoUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-center hover:border-[#2EBD6B] hover:bg-[#2EBD6B]/5 transition-colors"
                    >
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                      <p className="text-sm font-medium text-gray-700">Click to upload a photo</p>
                    </button>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                  size="lg"
                >
                  {loading ? "Saving..." : "Save & Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Booking Page Preview */}
        {step === 2 && (
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Set up your booking page</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Your Direct Booking Link</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Share this link on Facebook Marketplace, WhatsApp, or SMS. Customers can book directly without visiting your website.
                </p>
                <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-sm break-all">
                  {`${process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com"}/rent/${operator.booking_slug}`}
                </div>
                <Button
                  onClick={handleCopyLink}
                  className="mt-3 bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </>
                  )}
                </Button>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Embed Code (optional)</h3>
                <p className="text-sm text-gray-600 mb-4">
                  If you have a website, paste this code to embed the booking form:
                </p>
                <div className="relative bg-gray-50 p-4 rounded-lg border border-gray-200 font-mono text-xs overflow-x-auto">
                  {`<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com"}/widget.js" data-operator="${operator.id}"><\/script>`}
                </div>
              </div>

              <Button
                onClick={() => setStep(3)}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                size="lg"
              >
                Looks Good!
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="h-20 w-20 rounded-full bg-[#2EBD6B]/10 flex items-center justify-center">
                  <CheckCircle2 className="h-12 w-12 text-[#2EBD6B]" />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're ready to take bookings!</h2>
              <p className="text-gray-600 mb-8">
                Your first vehicle is added and your booking page is live.
              </p>

              <div className="bg-gray-50 rounded-lg p-6 mb-8 text-left">
                <h3 className="font-semibold text-gray-900 mb-4">Next steps:</h3>
                <ol className="space-y-3 text-sm text-gray-700">
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#2EBD6B] flex-shrink-0">1.</span>
                    <span>Share your booking link on Facebook Marketplace and WhatsApp</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#2EBD6B] flex-shrink-0">2.</span>
                    <span>Add more vehicles to your fleet in the Fleet section</span>
                  </li>
                  <li className="flex gap-3">
                    <span className="font-semibold text-[#2EBD6B] flex-shrink-0">3.</span>
                    <span>Set up payment reminders in Settings to recover late payments</span>
                  </li>
                </ol>
              </div>

              <Button
                onClick={() => router.push("/dashboard")}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                size="lg"
              >
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
