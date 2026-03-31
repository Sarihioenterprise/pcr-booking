"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ArrowLeft, Wrench, Car, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MaintenanceRecord, Vehicle } from "@/lib/types";

const statusColors: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
};

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

export default function MaintenanceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  // Edit form state
  const [editType, setEditType] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVendor, setEditVendor] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editDateDue, setEditDateDue] = useState("");
  const [editDatePerformed, setEditDatePerformed] = useState("");
  const [editMileageDue, setEditMileageDue] = useState("");
  const [editMileageAtService, setEditMileageAtService] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    async function load() {
      const { data: rec } = await supabase
        .from("maintenance_records")
        .select("*")
        .eq("id", id)
        .single();

      if (!rec) {
        setLoading(false);
        return;
      }

      const typed = rec as MaintenanceRecord;
      setRecord(typed);
      populateEditForm(typed);

      const { data: v } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", typed.vehicle_id)
        .single();
      if (v) setVehicle(v as Vehicle);

      setLoading(false);
    }
    load();
  }, [id, supabase]);

  function populateEditForm(rec: MaintenanceRecord) {
    setEditType(rec.type);
    setEditDescription(rec.description || "");
    setEditVendor(rec.vendor || "");
    setEditCost(rec.cost ? String(rec.cost) : "");
    setEditStatus(rec.status);
    setEditDateDue(rec.date_due || "");
    setEditDatePerformed(rec.date_performed || "");
    setEditMileageDue(rec.mileage_due ? String(rec.mileage_due) : "");
    setEditMileageAtService(
      rec.mileage_at_service ? String(rec.mileage_at_service) : ""
    );
    setEditNotes(rec.notes || "");
  }

  async function handleSave() {
    if (!record) return;
    setSaving(true);

    const updates = {
      type: editType,
      description: editDescription || null,
      vendor: editVendor || null,
      cost: editCost ? parseFloat(editCost) : null,
      status: editStatus,
      date_due: editDateDue || null,
      date_performed: editDatePerformed || null,
      mileage_due: editMileageDue ? parseInt(editMileageDue, 10) : null,
      mileage_at_service: editMileageAtService
        ? parseInt(editMileageAtService, 10)
        : null,
      notes: editNotes || null,
    };

    const { error } = await supabase
      .from("maintenance_records")
      .update(updates)
      .eq("id", record.id);

    if (!error) {
      setRecord({ ...record, ...updates } as MaintenanceRecord);
      setEditing(false);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Maintenance record not found.
      </div>
    );
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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{record.type}</h1>
          <p className="text-muted-foreground">
            {vehicle
              ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
              : "Vehicle"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={statusColors[record.status] || ""}
        >
          {record.status.replace("_", " ")}
        </Badge>
        {!editing && (
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
        )}
      </div>

      {editing ? (
        /* Edit Mode */
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Edit Service Record
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Service Type</Label>
                <Select
                  value={editType}
                  onValueChange={(v) => v && setEditType(v)}
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
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  value={editStatus}
                  onValueChange={(v) => v && setEditStatus(v)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Input
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input
                  value={editVendor}
                  onChange={(e) => setEditVendor(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Date Due</Label>
                <Input
                  type="date"
                  value={editDateDue}
                  onChange={(e) => setEditDateDue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Date Performed</Label>
                <Input
                  type="date"
                  value={editDatePerformed}
                  onChange={(e) => setEditDatePerformed(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage Due</Label>
                <Input
                  type="number"
                  value={editMileageDue}
                  onChange={(e) => setEditMileageDue(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Mileage at Service</Label>
                <Input
                  type="number"
                  value={editMileageAtService}
                  onChange={(e) => setEditMileageAtService(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                onClick={handleSave}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  populateEditForm(record);
                  setEditing(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span className="font-medium">{record.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="font-medium">
                    {record.description || "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Vendor</span>
                  <span className="font-medium">{record.vendor || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Cost</span>
                  <span className="font-medium">
                    {record.cost
                      ? `$${Number(record.cost).toFixed(2)}`
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Schedule & Mileage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Due</span>
                  <span className="font-medium">
                    {record.date_due
                      ? new Date(record.date_due).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date Performed</span>
                  <span className="font-medium">
                    {record.date_performed
                      ? new Date(record.date_performed).toLocaleDateString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mileage Due</span>
                  <span className="font-medium">
                    {record.mileage_due
                      ? record.mileage_due.toLocaleString()
                      : "—"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Mileage at Service
                  </span>
                  <span className="font-medium">
                    {record.mileage_at_service
                      ? record.mileage_at_service.toLocaleString()
                      : "—"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {record.notes && (
            <Card className="border-0 bg-white shadow-sm ring-0 md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm">{record.notes}</p>
              </CardContent>
            </Card>
          )}

          {vehicle && (
            <Card className="border-0 bg-white shadow-sm ring-0 md:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  Vehicle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle.plate || "No plate"} &middot;{" "}
                      {vehicle.mileage?.toLocaleString() ?? 0} mi
                    </p>
                  </div>
                  <Link href={`/dashboard/fleet/${vehicle.id}`}>
                    <Button variant="outline" size="sm">
                      View Vehicle
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
