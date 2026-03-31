"use client";

import { useState, useEffect } from "react";
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
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Car, DollarSign, Gauge, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Location } from "@/lib/types";

export default function NewVehiclePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [error, setError] = useState("");

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
    async function loadLocations() {
      const { data } = await supabase
        .from("locations")
        .select("*")
        .order("name");
      if (data) setLocations(data as Location[]);
    }
    loadLocations();
  }, [supabase]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleSelect(field: string) {
    return (val: string | null) => {
      if (val) setForm((prev) => ({ ...prev, [field]: val }));
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase.from("vehicles").insert({
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
              <Label htmlFor="photo_url">Photo URL</Label>
              <Input
                id="photo_url"
                name="photo_url"
                type="url"
                placeholder="https://example.com/photo.jpg"
                value={form.photo_url}
                onChange={handleChange}
              />
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
    </div>
  );
}
