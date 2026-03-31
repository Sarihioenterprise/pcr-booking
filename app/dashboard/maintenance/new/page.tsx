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
import { ArrowLeft, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle } from "@/lib/types";

const maintenanceTypes = [
  "Oil Change",
  "Tire Rotation",
  "Brake Service",
  "Battery",
  "Transmission",
  "General Service",
  "Inspection",
  "Other",
];

export default function NewMaintenancePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [vehicleId, setVehicleId] = useState("");
  const [type, setType] = useState("Oil Change");
  const [description, setDescription] = useState("");
  const [vendor, setVendor] = useState("");
  const [cost, setCost] = useState("");
  const [dateDue, setDateDue] = useState("");
  const [mileageDue, setMileageDue] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    async function loadVehicles() {
      const { data } = await supabase
        .from("vehicles")
        .select("*")
        .order("make");
      if (data) setVehicles(data as Vehicle[]);
    }
    loadVehicles();
  }, [supabase]);

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
        .from("maintenance_records")
        .insert({
          vehicle_id: vehicleId,
          type,
          description: description || null,
          status: "scheduled",
          vendor: vendor || null,
          cost: cost ? parseFloat(cost) : null,
          date_due: dateDue || null,
          mileage_due: mileageDue ? parseInt(mileageDue, 10) : null,
          notes: notes || null,
        });

      if (insertError) throw insertError;
      router.push("/dashboard/maintenance");
    } catch (err: any) {
      setError(err.message || "Failed to create maintenance record");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/maintenance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Add Service Record</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="h-5 w-5" />
              Service Details
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
                <Label>Service Type *</Label>
                <Select
                  value={type}
                  onValueChange={(v) => v && setType(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {maintenanceTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the service"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="vendor">Vendor</Label>
                <Input
                  id="vendor"
                  placeholder="e.g. AutoZone, Jiffy Lube"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cost">Cost ($)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 150.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="date_due">Date Due</Label>
                <Input
                  id="date_due"
                  type="date"
                  value={dateDue}
                  onChange={(e) => setDateDue(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mileage_due">Mileage Due</Label>
              <Input
                id="mileage_due"
                type="number"
                placeholder="e.g. 30000"
                value={mileageDue}
                onChange={(e) => setMileageDue(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
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
            {loading ? "Creating..." : "Create Service Record"}
          </Button>
          <Link href="/dashboard/maintenance">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
