"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ArrowLeft,
  Plus,
  Wrench,
  AlertTriangle,
  Pencil,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Vehicle } from "@/lib/types";

// ── Types ───────────────────────────────────────────────────────────────────
interface MaintenanceRecord {
  id: string;
  type: string;
  description: string | null;
  status: string;
  cost: number | null;
  date_performed: string | null;
  date_due: string | null;
  mileage_at_service: number | null;
  mileage_due: number | null;
  vendor: string | null;
  notes: string | null;
  created_at: string;
  is_overdue?: boolean;
}

type ServiceType =
  | "Oil Change"
  | "Tire Rotation"
  | "Brake Service"
  | "Inspection"
  | "Battery"
  | "Transmission"
  | "General Service"
  | "Custom";

const SERVICE_TYPES: ServiceType[] = [
  "Oil Change",
  "Tire Rotation",
  "Brake Service",
  "Inspection",
  "Battery",
  "Transmission",
  "General Service",
  "Custom",
];

const statusColors: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
};

// ── Empty form defaults ─────────────────────────────────────────────────────
const emptyForm = {
  service_type: "Oil Change" as ServiceType,
  date: "",
  odometer: "",
  cost: "",
  vendor: "",
  notes: "",
  next_service_date: "",
  next_service_odometer: "",
};

// ─────────────────────────────────────────────────────────────────────────────
export default function VehicleMaintenancePage() {
  const { id: vehicleId } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<MaintenanceRecord | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // Delete confirm
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Load data ──────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: v } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();
    if (v) setVehicle(v as Vehicle);

    const res = await fetch(`/api/fleet/${vehicleId}/maintenance`);
    if (res.ok) {
      const data = await res.json();
      setRecords(data);
    }
    setLoading(false);
  }, [vehicleId, supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Open add dialog ────────────────────────────────────────────────────────
  function openAdd() {
    setEditRecord(null);
    setForm(emptyForm);
    setFormError("");
    setDialogOpen(true);
  }

  // ── Open edit dialog ───────────────────────────────────────────────────────
  function openEdit(record: MaintenanceRecord) {
    setEditRecord(record);
    setForm({
      service_type: (record.type as ServiceType) || "Oil Change",
      date: record.date_performed ?? "",
      odometer: record.mileage_at_service ? String(record.mileage_at_service) : "",
      cost: record.cost ? String(record.cost) : "",
      vendor: record.vendor ?? "",
      notes: record.notes ?? "",
      next_service_date: record.date_due ?? "",
      next_service_odometer: record.mileage_due ? String(record.mileage_due) : "",
    });
    setFormError("");
    setDialogOpen(true);
  }

  // ── Save (add or edit) ─────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.service_type) {
      setFormError("Service type is required.");
      return;
    }
    setSaving(true);
    setFormError("");

    const payload = {
      service_type: form.service_type,
      date: form.date || null,
      odometer: form.odometer || null,
      cost: form.cost || null,
      vendor: form.vendor || null,
      notes: form.notes || null,
      next_service_date: form.next_service_date || null,
      next_service_odometer: form.next_service_odometer || null,
    };

    let res: Response;
    if (editRecord) {
      res = await fetch(`/api/fleet/${vehicleId}/maintenance/${editRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch(`/api/fleet/${vehicleId}/maintenance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    setSaving(false);
    if (res.ok) {
      setDialogOpen(false);
      await loadData();
    } else {
      const data = await res.json().catch(() => ({}));
      setFormError(data.error ?? "Failed to save record.");
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    setDeleting(true);
    await fetch(`/api/fleet/${vehicleId}/maintenance/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    setDeleteId(null);
    await loadData();
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const overdueRecords = records.filter((r) => r.is_overdue);
  const totalCost = records
    .filter((r) => r.status === "completed")
    .reduce((sum, r) => sum + (r.cost ?? 0), 0);

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading maintenance records…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/fleet/${vehicleId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Maintenance Log</h1>
          {vehicle && (
            <p className="text-muted-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model} ·{" "}
              {vehicle.plate || "No plate"}
            </p>
          )}
        </div>
        <Button
          className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
          onClick={openAdd}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Service
        </Button>
      </div>

      {/* ── Overdue Alert ───────────────────────────────────────────────── */}
      {overdueRecords.length > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
          <div>
            <p className="font-semibold text-red-800">
              {overdueRecords.length} overdue service
              {overdueRecords.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-red-600">
              {overdueRecords.map((r) => r.type).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total Records</p>
            <p className="text-2xl font-bold">{records.length}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p
              className={`text-2xl font-bold ${
                overdueRecords.length > 0 ? "text-red-600" : ""
              }`}
            >
              {overdueRecords.length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total Cost</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Records Table ───────────────────────────────────────────────── */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Service History ({records.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="font-medium text-gray-700">No service records yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Add the first service record to start tracking maintenance.
              </p>
              <Button
                className="mt-4 bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                onClick={openAdd}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Odometer</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Next Service</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => {
                  const isOverdue = record.is_overdue;
                  return (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">
                        {record.type}
                        {record.notes && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {record.notes}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {record.date_performed
                          ? new Date(record.date_performed).toLocaleDateString()
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {record.mileage_at_service
                          ? `${record.mileage_at_service.toLocaleString()} mi`
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {record.cost ? `$${Number(record.cost).toFixed(2)}` : "—"}
                      </TableCell>
                      <TableCell>
                        {record.date_due ? (
                          <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                            {new Date(record.date_due).toLocaleDateString()}
                            {isOverdue && (
                              <Badge
                                variant="outline"
                                className="ml-1.5 text-[10px] bg-red-50 text-red-600 border-red-200"
                              >
                                Overdue
                              </Badge>
                            )}
                          </span>
                        ) : record.mileage_due ? (
                          `${record.mileage_due.toLocaleString()} mi`
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell>{record.vendor || "—"}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={statusColors[record.status] || ""}
                        >
                          {record.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(record)}
                          >
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(record.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Add / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editRecord ? "Edit Service Record" : "Add Service Record"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Service Type *</Label>
              <Select
                value={form.service_type}
                onValueChange={(v) =>
                  v && setForm((f) => ({ ...f, service_type: v as ServiceType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date Performed</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Odometer (mi)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 35000"
                  value={form.odometer}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, odometer: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Cost ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 89.99"
                  value={form.cost}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cost: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Vendor</Label>
                <Input
                  placeholder="e.g. Jiffy Lube"
                  value={form.vendor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vendor: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5 border-t pt-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Next Service Due
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input
                    type="date"
                    value={form.next_service_date}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        next_service_date: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Odometer (mi)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 38000"
                    value={form.next_service_odometer}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        next_service_odometer: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <textarea
                rows={3}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Any notes about this service…"
                value={form.notes}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notes: e.target.value }))
                }
              />
            </div>

            {formError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">
                {formError}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : editRecord ? "Save Changes" : "Add Record"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ──────────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Service Record?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This action cannot be undone. The service record will be permanently deleted.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={() => deleteId && handleDelete(deleteId)}
              disabled={deleting}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
