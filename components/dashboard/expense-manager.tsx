"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "bg-amber-100 text-amber-700 border-amber-200",
  insurance: "bg-blue-100 text-blue-700 border-blue-200",
  registration: "bg-purple-100 text-purple-700 border-purple-200",
  fuel: "bg-orange-100 text-orange-700 border-orange-200",
  cleaning: "bg-cyan-100 text-cyan-700 border-cyan-200",
  other: "bg-slate-100 text-slate-600 border-slate-200",
};

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  expense_date: string;
  vehicle_id: string | null;
  vehicles: { make: string; model: string; year: number } | null;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
}

interface ExpenseManagerProps {
  vehicles: Vehicle[];
}

export function ExpenseManager({ vehicles }: ExpenseManagerProps) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    category: "",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
    vehicle_id: "",
  });

  async function loadExpenses() {
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) setExpenses(await res.json());
    } catch {
      // non-fatal
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadExpenses(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.category || !form.amount || !form.expense_date) return;
    setSaving(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          vehicle_id: form.vehicle_id || null,
        }),
      });
      if (res.ok) {
        setModalOpen(false);
        setForm({ category: "", amount: "", description: "", expense_date: new Date().toISOString().split("T")[0], vehicle_id: "" });
        await loadExpenses();
      }
    } finally {
      setSaving(false);
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const monthlyExpenses = expenses
    .filter((e) => e.expense_date.startsWith(thisMonth))
    .reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            This month: <span className="font-semibold text-gray-900">${monthlyExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            <span className="mx-2">·</span>
            Total: <span className="font-semibold text-gray-900">${totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
          </p>
        </div>
        <Button
          size="sm"
          className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Add Expense
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-[#2EBD6B]" />
        </div>
      ) : expenses.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No expenses logged yet.</p>
          <p className="text-xs mt-1">Track maintenance, insurance, fuel, and more.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {expenses.map((exp) => (
            <div
              key={exp.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-white"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs capitalize ${CATEGORY_COLORS[exp.category] || CATEGORY_COLORS.other}`}>
                    {exp.category}
                  </Badge>
                  {exp.vehicles && (
                    <span className="text-xs text-muted-foreground">
                      {exp.vehicles.year} {exp.vehicles.make} {exp.vehicles.model}
                    </span>
                  )}
                </div>
                {exp.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{exp.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">{exp.expense_date}</p>
              </div>
              <div className="text-right ml-3">
                <p className="font-semibold text-gray-900">
                  ${exp.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {["maintenance", "insurance", "registration", "fuel", "cleaning", "other"].map((c) => (
                      <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={form.expense_date}
                  onChange={(e) => setForm((p) => ({ ...p, expense_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Vehicle (optional)</Label>
                <Select value={form.vehicle_id} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_id: v === "_none" ? "" : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">None</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.year} {v.make} {v.model}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description (optional)</Label>
              <Textarea
                rows={2}
                placeholder="e.g. Oil change, tire rotation..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white">
                {saving ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Saving...</> : "Save Expense"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
