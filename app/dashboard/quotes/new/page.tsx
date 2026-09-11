"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Send, FileText, Car, CheckSquare } from "lucide-react";
import type { Vehicle, Addon } from "@/lib/types";

interface PriceBreakdown {
  base: number;
  addonLines: { name: string; amount: number }[];
  addonTotal: number;
  total: number;
  durationDays: number;
}

function calcPricing(
  vehicle: Vehicle | null,
  pickupDate: string,
  returnDate: string,
  selectedAddons: Addon[]
): PriceBreakdown {
  const empty = { base: 0, addonLines: [], addonTotal: 0, total: 0, durationDays: 0 };
  if (!pickupDate || !returnDate || !vehicle) return empty;

  const pickup = new Date(pickupDate);
  const returnD = new Date(returnDate);
  if (returnD <= pickup) return empty;

  const durationDays = Math.max(
    1,
    Math.ceil((returnD.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24))
  );

  let base = 0;
  if (durationDays >= 30 && vehicle.monthly_rate) {
    const months = Math.floor(durationDays / 30);
    const rem = durationDays % 30;
    base = months * vehicle.monthly_rate + rem * vehicle.daily_rate;
  } else if (durationDays >= 7 && vehicle.weekly_rate) {
    const weeks = Math.floor(durationDays / 7);
    const rem = durationDays % 7;
    base = weeks * vehicle.weekly_rate + rem * vehicle.daily_rate;
  } else {
    base = durationDays * vehicle.daily_rate;
  }

  const addonLines = selectedAddons.map((a) => ({
    name: a.name,
    amount: a.pricing_type === "per_day" ? a.price * durationDays : a.price,
  }));
  const addonTotal = addonLines.reduce((sum, l) => sum + l.amount, 0);

  return { base, addonLines, addonTotal, total: base + addonTotal, durationDays };
}

export default function NewQuotePage() {
  const router = useRouter();
  const supabase = createClient();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sendAfterCreate, setSendAfterCreate] = useState(true);

  // Form fields
  const [vehicleId, setVehicleId] = useState<string>("");
  const [pickupDate, setPickupDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      const [{ data: v }, { data: a }] = await Promise.all([
        supabase.from("vehicles").select("*").order("make"),
        supabase.from("addons").select("*").eq("active", true).order("sort_order"),
      ]);
      if (v) setVehicles(v as Vehicle[]);
      if (a) setAddons(a as Addon[]);
      setLoading(false);
    }
    loadData();
  }, [supabase]);

  const selectedVehicle = vehicles.find((v) => v.id === vehicleId) ?? null;
  const selectedAddonObjects = addons.filter((a) => selectedAddonIds.includes(a.id));
  const pricing = calcPricing(selectedVehicle, pickupDate, returnDate, selectedAddonObjects);

  function toggleAddon(addonId: string) {
    setSelectedAddonIds((prev) =>
      prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pickupDate || !returnDate) return;

    setSubmitting(true);
    try {
      // 1. Create the quote
      const createRes = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: vehicleId || undefined,
          pickupDate,
          returnDate,
          addonIds: selectedAddonIds,
          customerEmail: customerEmail || undefined,
          customerPhone: customerPhone || undefined,
          customerName: customerName || undefined,
          notes: notes || undefined,
        }),
      });

      const quote = await createRes.json();
      if (!createRes.ok) {
        alert(quote.error || "Failed to create quote");
        return;
      }

      // 2. Optionally send immediately
      if (sendAfterCreate && (customerEmail || customerPhone)) {
        await fetch(`/api/quotes/${quote.id}/send`, { method: "POST" });
      }

      router.push("/dashboard/quotes");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-muted-foreground p-6">Loading…</div>;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/quotes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Quote</h1>
          <p className="text-muted-foreground text-sm">
            Build a quote and send it to a potential customer.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Customer Info */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-name">Name</Label>
                <Input
                  id="customer-name"
                  placeholder="Jane Smith"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="jane@example.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-phone">Phone (for SMS)</Label>
              <Input
                id="customer-phone"
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Vehicle + Dates */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Car className="h-4 w-4" />
              Vehicle &amp; Dates
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Vehicle</Label>
              <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.year} {v.make} {v.model} — ${v.daily_rate}/day
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickup-date">Pickup Date *</Label>
                <Input
                  id="pickup-date"
                  type="date"
                  min={today}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="return-date">Return Date *</Label>
                <Input
                  id="return-date"
                  type="date"
                  min={pickupDate || today}
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Add-ons */}
        {addons.length > 0 && (
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Add-ons &amp; Protection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {addons.map((addon) => (
                  <div
                    key={addon.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAddonIds.includes(addon.id)
                        ? "border-[#2EBD6B] bg-emerald-50"
                        : "border-border hover:border-[#2EBD6B]/40"
                    }`}
                    onClick={() => toggleAddon(addon.id)}
                  >
                    <Checkbox
                      checked={selectedAddonIds.includes(addon.id)}
                      onCheckedChange={() => toggleAddon(addon.id)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{addon.name}</span>
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-50"
                        >
                          ${addon.price}/{addon.pricing_type === "per_day" ? "day" : "flat"}
                        </Badge>
                      </div>
                      {addon.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Notes to Customer</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Special instructions, conditions, what's included, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Price Preview */}
        {pricing.durationDays > 0 && selectedVehicle && (
          <Card className="border-0 bg-slate-50 shadow-sm ring-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Price Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {selectedVehicle.year} {selectedVehicle.make} {selectedVehicle.model} ×{" "}
                  {pricing.durationDays} day{pricing.durationDays !== 1 ? "s" : ""}
                </span>
                <span>${pricing.base.toFixed(2)}</span>
              </div>
              {pricing.addonLines.map((line) => (
                <div key={line.name} className="flex justify-between">
                  <span className="text-muted-foreground">{line.name}</span>
                  <span>${line.amount.toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-[#2EBD6B]">${pricing.total.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Send option */}
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-white">
          <Checkbox
            id="send-now"
            checked={sendAfterCreate}
            onCheckedChange={(v) => setSendAfterCreate(!!v)}
          />
          <Label htmlFor="send-now" className="cursor-pointer">
            Send quote to customer immediately after creating
          </Label>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting || !pickupDate || !returnDate}
            style={{ backgroundColor: "#2EBD6B" }}
          >
            {submitting ? (
              "Creating…"
            ) : sendAfterCreate && (customerEmail || customerPhone) ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                Create &amp; Send Quote
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Save Quote
              </>
            )}
          </Button>
          <Link href="/dashboard/quotes">
            <Button variant="ghost" type="button">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
