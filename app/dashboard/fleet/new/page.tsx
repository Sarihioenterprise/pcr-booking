"use client";

import { useState } from "react";
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
import { createClient } from "@/lib/supabase/client";

export default function NewVehiclePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    make: "",
    model: "",
    year: "",
    color: "",
    license_plate: "",
    daily_rate: "",
    photo_url: "",
    status: "active",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from("vehicles").insert({
        make: form.make,
        model: form.model,
        year: parseInt(form.year, 10),
        color: form.color,
        license_plate: form.license_plate,
        daily_rate: parseFloat(form.daily_rate),
        photo_url: form.photo_url || null,
        status: form.status,
      });

      if (error) throw error;
      router.push("/dashboard/fleet");
    } catch (err) {
      console.error("Failed to create vehicle:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC] p-6">
      <div className="mx-auto max-w-2xl">
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-xl">Add Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="make">Make</Label>
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
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    name="model"
                    placeholder="e.g. Camry"
                    value={form.model}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="year">Year</Label>
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
                <div className="space-y-1.5">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    placeholder="e.g. White"
                    value={form.color}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="license_plate">License Plate</Label>
                  <Input
                    id="license_plate"
                    name="license_plate"
                    placeholder="e.g. ABC-1234"
                    value={form.license_plate}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="daily_rate">Daily Rate ($)</Label>
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

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val: string | null) => {
                    if (val) setForm((prev) => ({ ...prev, status: val }));
                  }}
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

              <div className="flex gap-3 pt-2">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
