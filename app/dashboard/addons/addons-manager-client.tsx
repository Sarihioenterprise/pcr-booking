"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Lock,
} from "lucide-react";
import type { Addon } from "@/lib/types";

const emptyForm = {
  name: "",
  description: "",
  pricing_type: "flat" as "flat" | "per_day",
  price: "",
  category: "extra" as "insurance" | "extra",
  required: false,
  sort_order: 0,
};

function AddonCard({
  addon,
  onEdit,
  onToggle,
  onDelete,
}: {
  addon: Addon;
  onEdit: (a: Addon) => void;
  onToggle: (a: Addon) => void;
  onDelete: (a: Addon) => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  async function handleToggle() {
    setToggling(true);
    await onToggle(addon);
    setToggling(false);
  }

  async function handleDelete() {
    if (!confirm(`Delete "${addon.name}"? This cannot be undone.`)) return;
    setDeleting(true);
    await onDelete(addon);
    setDeleting(false);
  }

  return (
    <div
      className={`rounded-xl border bg-white p-4 flex items-start gap-4 transition-opacity ${
        addon.active ? "" : "opacity-60"
      }`}
    >
      {/* Category icon */}
      <div
        className={`shrink-0 flex h-10 w-10 items-center justify-center rounded-lg ${
          addon.category === "insurance"
            ? "bg-blue-50 text-blue-600"
            : "bg-emerald-50 text-emerald-600"
        }`}
      >
        {addon.category === "insurance" ? (
          <Shield className="h-5 w-5" />
        ) : (
          <Package className="h-5 w-5" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-gray-900 text-sm">{addon.name}</span>
          {addon.required && (
            <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700 bg-amber-50 flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" /> Required
            </Badge>
          )}
          {!addon.active && (
            <Badge variant="outline" className="text-[10px] text-gray-400">
              Inactive
            </Badge>
          )}
        </div>
        {addon.description && (
          <p className="text-xs text-gray-500 mb-2 line-clamp-2">{addon.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
          <span className="font-semibold text-gray-800">
            ${Number(addon.price).toFixed(2)}
            {addon.pricing_type === "per_day" ? "/day" : " flat"}
          </span>
          <Badge
            variant="outline"
            className={`text-[10px] ${
              addon.category === "insurance"
                ? "border-blue-200 text-blue-700 bg-blue-50"
                : "border-emerald-200 text-emerald-700 bg-emerald-50"
            }`}
          >
            {addon.category === "insurance" ? "Insurance" : "Extra"}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleToggle}
          disabled={toggling}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          title={addon.active ? "Deactivate" : "Activate"}
        >
          {toggling ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : addon.active ? (
            <ToggleRight className="h-6 w-6 text-emerald-500" />
          ) : (
            <ToggleLeft className="h-6 w-6" />
          )}
        </button>
        <button
          onClick={() => onEdit(addon)}
          className="text-gray-400 hover:text-blue-500 transition-colors"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-gray-400 hover:text-red-500 transition-colors"
          title="Delete"
        >
          {deleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

export function AddonsManagerClient() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<Addon | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedError, setSeedError] = useState("");
  const [migrationMissing, setMigrationMissing] = useState(false);
  const [error, setError] = useState("");

  const loadAddons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/addons");
      if (res.ok) {
        const data = await res.json();
        setAddons(data.addons ?? []);
      } else {
        const data = await res.json();
        if (data.error?.includes("migration")) setMigrationMissing(true);
      }
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  function openCreate() {
    setEditingAddon(null);
    setForm(emptyForm);
    setError("");
    setDialogOpen(true);
  }

  function openEdit(addon: Addon) {
    setEditingAddon(addon);
    setForm({
      name: addon.name,
      description: addon.description ?? "",
      pricing_type: addon.pricing_type,
      price: String(addon.price),
      category: addon.category,
      required: addon.required,
      sort_order: addon.sort_order,
    });
    setError("");
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setError("Price must be a valid non-negative number.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        pricing_type: form.pricing_type,
        price,
        category: form.category,
        required: form.required,
        sort_order: form.sort_order,
      };

      let res: Response;
      if (editingAddon) {
        res = await fetch(`/api/addons/${editingAddon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/addons", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        if (data.error?.includes("migration")) setMigrationMissing(true);
        setError(data.error ?? "Save failed");
        return;
      }

      setDialogOpen(false);
      await loadAddons();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(addon: Addon) {
    await fetch(`/api/addons/${addon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !addon.active }),
    });
    await loadAddons();
  }

  async function handleDelete(addon: Addon) {
    await fetch(`/api/addons/${addon.id}`, { method: "DELETE" });
    await loadAddons();
  }

  async function handleSeed() {
    if (
      !confirm(
        "This will add 8 standard add-on templates with placeholder prices. You can edit prices and details after. Continue?"
      )
    )
      return;

    setSeeding(true);
    setSeedError("");
    try {
      const res = await fetch("/api/addons/seed", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        if (data.error?.includes("migration")) setMigrationMissing(true);
        setSeedError(data.error ?? "Seed failed");
      } else {
        await loadAddons();
      }
    } finally {
      setSeeding(false);
    }
  }

  const insuranceAddons = addons.filter((a) => a.category === "insurance");
  const extraAddons = addons.filter((a) => a.category === "extra");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add-ons & Insurance</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Renters can select these during booking. Required add-ons are auto-applied.
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2"
          >
            {seeding ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Seed Templates
          </Button>
          <Button
            onClick={openCreate}
            className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Add-on
          </Button>
        </div>
      </div>

      {/* Migration missing banner */}
      {migrationMissing && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">Database migration required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Apply migration 018_addons.sql in your Supabase dashboard (SQL Editor) to enable
              add-ons. The rest of the app continues to work normally in the meantime.
            </p>
          </div>
        </div>
      )}

      {/* Seed error */}
      {seedError && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {seedError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
        </div>
      ) : addons.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">No add-ons yet</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-md">
              Add-ons appear in your booking form so renters can select insurance coverage and
              extras at checkout. Click{" "}
              <strong>Seed Templates</strong> for a quick start with 8 standard options.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                {seeding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Seed Templates
              </Button>
              <Button onClick={openCreate} className="bg-[#2EBD6B] text-white hover:bg-[#27a85e]">
                <Plus className="h-4 w-4 mr-2" /> New Add-on
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Insurance Section */}
          {insuranceAddons.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <div className="h-7 w-7 rounded-lg bg-blue-50 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-blue-600" />
                  </div>
                  Insurance & Protection
                  <span className="ml-auto text-sm font-normal text-gray-400">
                    {insuranceAddons.length} item{insuranceAddons.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {insuranceAddons.map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {/* Extras Section */}
          {extraAddons.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <div className="h-7 w-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Package className="h-4 w-4 text-emerald-600" />
                  </div>
                  Extras & Upgrades
                  <span className="ml-auto text-sm font-normal text-gray-400">
                    {extraAddons.length} item{extraAddons.length !== 1 ? "s" : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {extraAddons.map((addon) => (
                  <AddonCard
                    key={addon.id}
                    addon={addon}
                    onEdit={openEdit}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingAddon ? "Edit Add-on" : "New Add-on"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="ao-name">Name <span className="text-red-500">*</span></Label>
              <Input
                id="ao-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Collision Damage Waiver"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="ao-desc">Description</Label>
              <Textarea
                id="ao-desc"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description shown to renters..."
              />
            </div>

            {/* Category + Pricing Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm({ ...form, category: v as "insurance" | "extra" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="extra">Extra</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Pricing Type</Label>
                <Select
                  value={form.pricing_type}
                  onValueChange={(v) =>
                    setForm({ ...form, pricing_type: v as "flat" | "per_day" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_day">Per Day</SelectItem>
                    <SelectItem value="flat">Flat Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price + Sort Order */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ao-price">
                  Price ($) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="ao-price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="15.00"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ao-sort">Sort Order</Label>
                <Input
                  id="ao-sort"
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* Required toggle */}
            <div className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <input
                id="ao-required"
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="h-4 w-4 rounded border-gray-300 text-[#2EBD6B] focus:ring-[#2EBD6B]"
              />
              <div>
                <Label htmlFor="ao-required" className="cursor-pointer font-medium">
                  Required
                </Label>
                <p className="text-xs text-gray-500">
                  Pre-selected and locked for all renters
                </p>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
              ) : editingAddon ? "Save Changes" : "Create Add-on"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
