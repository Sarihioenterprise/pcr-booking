"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import type { PromoCode } from "@/lib/types";

interface PromoCodeDialogProps {
  operatorId: string;
  onCreated?: (promo: PromoCode) => void;
}

export function PromoCodeDialog({ operatorId, onCreated }: PromoCodeDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [minRentalDays, setMinRentalDays] = useState("1");

  function resetForm() {
    setCode("");
    setDescription("");
    setType("percentage");
    setValue("");
    setMaxUses("");
    setValidFrom("");
    setValidUntil("");
    setMinRentalDays("1");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Promo code is required");
      return;
    }
    if (!value || Number(value) <= 0) {
      setError("Discount value must be greater than zero");
      return;
    }
    if (type === "percentage" && Number(value) > 100) {
      setError("Percentage discount cannot exceed 100%");
      return;
    }

    setSaving(true);
    try {
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from("promo_codes")
        .insert({
          operator_id: operatorId,
          code: code.toUpperCase().trim(),
          description: description.trim() || null,
          type,
          value: Number(value),
          max_uses: maxUses ? Number(maxUses) : null,
          used_count: 0,
          min_rental_days: Number(minRentalDays) || 1,
          valid_from: validFrom || null,
          valid_until: validUntil || null,
          is_active: true,
        })
        .select("*")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          setError("A promo code with this name already exists");
        } else {
          setError("Failed to create promo code");
        }
        return;
      }

      onCreated?.(data as PromoCode);
      resetForm();
      setOpen(false);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="h-4 w-4 mr-1" />
        New Promo Code
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Promo Code</DialogTitle>
            <DialogDescription>
              Create a discount code for your renters.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {error && (
              <div className="rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="grid gap-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                placeholder="e.g. SUMMER25"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="e.g. Summer promotion 25% off"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Discount Type</Label>
                <Select value={type} onValueChange={(val) => setType(val as "percentage" | "fixed")}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step={type === "percentage" ? "1" : "0.01"}
                  max={type === "percentage" ? "100" : undefined}
                  placeholder={type === "percentage" ? "25" : "50.00"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="maxUses">Max Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  min="0"
                  placeholder="Unlimited"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="minRentalDays">Min. Rental Days</Label>
                <Input
                  id="minRentalDays"
                  type="number"
                  min="1"
                  value={minRentalDays}
                  onChange={(e) => setMinRentalDays(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="validFrom">Valid From</Label>
                <Input
                  id="validFrom"
                  type="date"
                  value={validFrom}
                  onChange={(e) => setValidFrom(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="validUntil">Valid Until</Label>
                <Input
                  id="validUntil"
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Promo Code"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
