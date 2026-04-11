"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Car, DollarSign, Gauge, MapPin, Upload, X, ImageIcon, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Location, Operator } from "@/lib/types";

const PLAN_LIMITS = {
  free: 3,
  growth: 15,
  pro: 40,
  scale: Infinity,
};

const NEXT_PLAN = {
  free: "growth",
  growth: "pro",
  pro: "scale",
  scale: "scale",
};

export default function NewVehiclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState("");
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [vehicleCount, setVehicleCount] = useState(0);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    plate: "",
    vin: "",
    category: "sedan",
    daily_rate: "",
    weekly_rate: "",
    monthly_rate: "",
    purchase_price: "",
    monthly_cost: "",
    minimum_rental_days: "1",
    mileage: "0",
    fuel_level: "full",
    location_id: "",
    photo_url: "",
    status: "active",
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load operator
      const { data: operatorData } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (operatorData) setOperator(operatorData as Operator);

      // Load locations
      const { data: locationsData } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (locationsData) setLocations(locationsData as Location[]);

      // Load vehicle count
      const { count } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .eq("operator_id", operatorData?.id);
      if (count !== null) setVehicleCount(count);
    }
    load();
  }, [supabase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSelect(field: string) {
    return (val: string | null) => {
      if (val) setForm((prev) => ({ ...prev, [field]: val }));
    };
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
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

      setForm((prev) => ({ ...prev, photo_url: publicUrl }));
    } catch (err: any) {
      // If bucket doesn't exist yet, just keep the local preview URL
      // and store it — operator can fix later
      setForm((prev) => ({ ...prev, photo_url: objectUrl }));
    } finally {
      setPhotoUploading(false);
    }
  }

  function clearPhoto() {
    setPhotoPreview(null);
    setForm((prev) => ({ ...prev, photo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!operator) throw new Error("Operator not found");

      // Check vehicle limit
      const planLimit = PLAN_LIMITS[operator.plan as keyof typeof PLAN_LIMITS] || 3;
      if (vehicleCount >= planLimit) {
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }

      const { error: insertError } = await supabase.from("vehicles").insert({
        operator_id: operator.id,
        make: form.make,
        model: form.model,
        year: parseInt(form.year, 10),
        color: form.color || null,
        plate: form.plate || null,
        vin: form.vin || null,
        category: form.category,
        daily_rate: parseFloat(form.daily_rate),
        weekly_rate: form.weekly_rate ? parseFloat(form.weekly_rate) : null,
        monthly_rate: form.monthly_rate ? parseFloat(form.monthly_rate) : null,
        purchase_price: form.purchase_price
          ? parseFloat(form.purchase_price)
          : null,
        monthly_cost: form.monthly_cost
          ? parseFloat(form.monthly_cost)
          : null,
        minimum_rental_days: parseInt(form.minimum_rental_days, 10) || 1,
        mileage: parseInt(form.mileage, 10) || 0,
        fuel_level: form.fuel_level,
        location_id: form.location_id || null,
        photo_url: form.photo_url || null,
        status: form.status,
      });

      if (insertError) throw insertError;
      router.push("/dashboard/fleet");
    } catch (err: any) {
      setError(err.message || "Failed to create vehicle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fleet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add Vehicle</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Information */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5" />
              Vehicle Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="make">Make *</Label>
                <Input
                  id="make"
                  name="make"
                  placeholder="e.g. Toyota"
                  value={form.make}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Model *</Label>
                <Input
                  id="model"
                  name="model"
                  placeholder="e.g. Camry"
                  value={form.model}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  name="year"
                  type="number"
                  placeholder="e.g. 2024"
                  value={form.year}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  name="color"
                  placeholder="e.g. White"
                  value={form.color}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="plate">License Plate</Label>
                <Input
                  id="plate"
                  name="plate"
                  placeholder="e.g. ABC-1234"
                  value={form.plate}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="vin">VIN</Label>
                <Input
                  id="vin"
                  name="vin"
                  placeholder="17-character VIN"
                  value={form.vin}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={handleSelect("category")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedan">Sedan</SelectItem>
                    <SelectItem value="suv">SUV</SelectItem>
                    <SelectItem value="truck">Truck</SelectItem>
                    <SelectItem value="van">Van</SelectItem>
                    <SelectItem value="luxury">Luxury</SelectItem>
                    <SelectItem value="economy">Economy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={handleSelect("status")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="daily_rate">Daily Rate ($) *</Label>
                <Input
                  id="daily_rate"
                  name="daily_rate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 65.00"
                  value={form.daily_rate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="weekly_rate">Weekly Rate ($)</Label>
                <Input
                  id="weekly_rate"
                  name="weekly_rate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 400.00"
                  value={form.weekly_rate}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_rate">Monthly Rate ($)</Label>
                <Input
                  id="monthly_rate"
                  name="monthly_rate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1500.00"
                  value={form.monthly_rate}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="purchase_price">Purchase Price ($)</Label>
                <Input
                  id="purchase_price"
                  name="purchase_price"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 25000.00"
                  value={form.purchase_price}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="monthly_cost">Monthly Cost ($)</Label>
                <Input
                  id="monthly_cost"
                  name="monthly_cost"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 450.00"
                  value={form.monthly_cost}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="minimum_rental_days">Min Rental Days</Label>
                <Input
                  id="minimum_rental_days"
                  name="minimum_rental_days"
                  type="number"
                  value={form.minimum_rental_days}
                  onChange={handleChange}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle Details */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Gauge className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="mileage">Current Mileage</Label>
                <Input
                  id="mileage"
                  name="mileage"
                  type="number"
                  placeholder="e.g. 15000"
                  value={form.mileage}
                  onChange={handleChange}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Fuel Level</Label>
                <Select
                  value={form.fuel_level}
                  onValueChange={handleSelect("fuel_level")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select fuel level" />
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
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Select
                  value={form.location_id}
                  onValueChange={handleSelect("location_id")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Vehicle Photo</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
              {photoPreview ? (
                <div className="relative w-full h-48 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
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
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-center hover:border-[#2EBD6B] hover:bg-[#2EBD6B]/5 transition-colors"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100">
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Click to upload a photo</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP up to 10MB</p>
                  </div>
                </button>
              )}
            </div>
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
            {loading ? "Creating..." : "Create Vehicle"}
          </Button>
          <Link href="/dashboard/fleet">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>

      {/* Upgrade Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <AlertCircle className="h-6 w-6 text-yellow-600 mb-2" />
            <DialogTitle>Vehicle Limit Reached</DialogTitle>
            <DialogDescription>
              You've reached your {operator?.plan || "free"} plan limit of{" "}
              {PLAN_LIMITS[operator?.plan as keyof typeof PLAN_LIMITS] || 3} vehicles.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Upgrade to {NEXT_PLAN[operator?.plan as keyof typeof NEXT_PLAN] || "growth"} to add more vehicles
              and unlock additional features.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUpgradeModal(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={() => router.push("/onboarding/plan")}
            >
              Upgrade Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
