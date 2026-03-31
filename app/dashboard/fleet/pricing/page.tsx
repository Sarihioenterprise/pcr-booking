"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Calendar,
  Car,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import type { Vehicle, PricingRule } from "@/lib/types";

// ---------------------------------------------------------------------------
// Placeholder data
// ---------------------------------------------------------------------------

const VEHICLES: Vehicle[] = [
  {
    id: "v1",
    operator_id: "op1",
    make: "Tesla",
    model: "Model 3",
    year: 2024,
    color: "Pearl White",
    plate: "EV-1234",
    vin: null,
    daily_rate: 65,
    weekly_rate: 390,
    monthly_rate: 1400,
    mileage: 12400,
    fuel_level: "100%",
    category: "Sedan",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 3,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "2024-06-01T00:00:00Z",
    updated_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "v2",
    operator_id: "op1",
    make: "BMW",
    model: "X5",
    year: 2024,
    color: "Black Sapphire",
    plate: "LX-5678",
    vin: null,
    daily_rate: 95,
    weekly_rate: 570,
    monthly_rate: 2100,
    mileage: 8200,
    fuel_level: "85%",
    category: "SUV",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 2,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "2024-05-15T00:00:00Z",
    updated_at: "2024-05-15T00:00:00Z",
  },
  {
    id: "v3",
    operator_id: "op1",
    make: "Mercedes",
    model: "C300",
    year: 2025,
    color: "Obsidian Black",
    plate: "MB-9012",
    vin: null,
    daily_rate: 85,
    weekly_rate: 510,
    monthly_rate: 1900,
    mileage: 3100,
    fuel_level: "92%",
    category: "Sedan",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 3,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "2024-07-10T00:00:00Z",
    updated_at: "2024-07-10T00:00:00Z",
  },
  {
    id: "v4",
    operator_id: "op1",
    make: "Porsche",
    model: "Cayenne",
    year: 2024,
    color: "Carrara White",
    plate: "PR-3456",
    vin: null,
    daily_rate: 120,
    weekly_rate: 720,
    monthly_rate: 2700,
    mileage: 5600,
    fuel_level: "78%",
    category: "SUV",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 2,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "2024-04-20T00:00:00Z",
    updated_at: "2024-04-20T00:00:00Z",
  },
  {
    id: "v5",
    operator_id: "op1",
    make: "Audi",
    model: "A4",
    year: 2025,
    color: "Mythos Black",
    plate: "AU-7890",
    vin: null,
    daily_rate: 75,
    weekly_rate: 450,
    monthly_rate: 1650,
    mileage: 1800,
    fuel_level: "95%",
    category: "Sedan",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 3,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "2024-08-01T00:00:00Z",
    updated_at: "2024-08-01T00:00:00Z",
  },
];

const INITIAL_RULES: PricingRule[] = [
  {
    id: "r1",
    vehicle_id: "v1",
    operator_id: "op1",
    name: "Summer Peak",
    type: "peak_season",
    start_date: "2026-06-15",
    end_date: "2026-08-31",
    day_of_week: null,
    multiplier: 1.4,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r2",
    vehicle_id: "v1",
    operator_id: "op1",
    name: "Weekday Discount",
    type: "discount",
    start_date: "2026-04-01",
    end_date: "2026-05-31",
    day_of_week: null,
    multiplier: 0.85,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r3",
    vehicle_id: "v2",
    operator_id: "op1",
    name: "Holiday Surge",
    type: "surge",
    start_date: "2026-12-20",
    end_date: "2027-01-05",
    day_of_week: null,
    multiplier: 1.6,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r4",
    vehicle_id: "v2",
    operator_id: "op1",
    name: "Weekend Premium",
    type: "day_of_week",
    start_date: null,
    end_date: null,
    day_of_week: 6,
    multiplier: 1.25,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r5",
    vehicle_id: "v3",
    operator_id: "op1",
    name: "Spring Sale",
    type: "discount",
    start_date: "2026-03-01",
    end_date: "2026-04-30",
    day_of_week: null,
    multiplier: 0.8,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r6",
    vehicle_id: "v4",
    operator_id: "op1",
    name: "Friday Surge",
    type: "day_of_week",
    start_date: null,
    end_date: null,
    day_of_week: 5,
    multiplier: 1.35,
    created_at: "2024-06-01T00:00:00Z",
  },
  {
    id: "r7",
    vehicle_id: "v5",
    operator_id: "op1",
    name: "Launch Promo",
    type: "discount",
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    day_of_week: null,
    multiplier: 0.75,
    created_at: "2024-08-01T00:00:00Z",
  },
  {
    id: "r8",
    vehicle_id: "v3",
    operator_id: "op1",
    name: "Sunday Special",
    type: "day_of_week",
    start_date: null,
    end_date: null,
    day_of_week: 0,
    multiplier: 1.15,
    created_at: "2024-07-10T00:00:00Z",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const TYPE_BADGE_STYLES: Record<PricingRule["type"], string> = {
  peak_season: "bg-red-500/10 text-red-600 border-red-500/20",
  discount: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  surge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  day_of_week: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const TYPE_LABELS: Record<PricingRule["type"], string> = {
  peak_season: "Peak Season",
  discount: "Discount",
  surge: "Surge",
  day_of_week: "Day of Week",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDateRange(start: string | null, end: string | null): string {
  if (!start || !end) return "--";
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `${fmt(s)} - ${fmt(e)}`;
}

function discountPct(daily: number, rate: number, days: number): string {
  const effectiveDaily = rate / days;
  const pct = ((daily - effectiveDaily) / daily) * 100;
  if (pct <= 0) return "";
  return `${pct.toFixed(0)}% off`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface NewRuleForm {
  name: string;
  type: PricingRule["type"];
  start_date: string;
  end_date: string;
  day_of_week: string;
  multiplier: string;
}

const EMPTY_FORM: NewRuleForm = {
  name: "",
  type: "peak_season",
  start_date: "",
  end_date: "",
  day_of_week: "1",
  multiplier: "1.0",
};

export default function DynamicPricingPage() {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>(VEHICLES);
  const [rules, setRules] = useState<PricingRule[]>(INITIAL_RULES);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [form, setForm] = useState<NewRuleForm>(EMPTY_FORM);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) ?? null;

  const vehicleRules = useMemo(() => {
    if (selectedVehicleId === "all") return rules;
    return rules.filter((r) => r.vehicle_id === selectedVehicleId);
  }, [rules, selectedVehicleId]);

  // Base rates editing (per vehicle)
  const [editingRates, setEditingRates] = useState<Record<string, {
    daily_rate: string;
    weekly_rate: string;
    monthly_rate: string;
    minimum_rental_days: string;
  }>>({});

  function getEditableRates(v: Vehicle) {
    if (editingRates[v.id]) return editingRates[v.id];
    return {
      daily_rate: v.daily_rate.toString(),
      weekly_rate: (v.weekly_rate ?? v.daily_rate * 7).toString(),
      monthly_rate: (v.monthly_rate ?? v.daily_rate * 30).toString(),
      minimum_rental_days: v.minimum_rental_days.toString(),
    };
  }

  function updateRate(vehicleId: string, field: string, value: string) {
    const v = vehicles.find((veh) => veh.id === vehicleId);
    if (!v) return;
    const current = getEditableRates(v);
    setEditingRates((prev) => ({
      ...prev,
      [vehicleId]: { ...current, [field]: value },
    }));
  }

  function saveRates(vehicleId: string) {
    const rates = editingRates[vehicleId];
    if (!rates) return;
    setVehicles((prev) =>
      prev.map((v) =>
        v.id === vehicleId
          ? {
              ...v,
              daily_rate: parseFloat(rates.daily_rate) || v.daily_rate,
              weekly_rate: parseFloat(rates.weekly_rate) || v.weekly_rate,
              monthly_rate: parseFloat(rates.monthly_rate) || v.monthly_rate,
              minimum_rental_days:
                parseInt(rates.minimum_rental_days) || v.minimum_rental_days,
            }
          : v
      )
    );
    setEditingRates((prev) => {
      const next = { ...prev };
      delete next[vehicleId];
      return next;
    });
  }

  // Rule CRUD
  function openAddDialog() {
    setEditingRuleId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEditDialog(rule: PricingRule) {
    setEditingRuleId(rule.id);
    setForm({
      name: rule.name,
      type: rule.type,
      start_date: rule.start_date ?? "",
      end_date: rule.end_date ?? "",
      day_of_week: rule.day_of_week?.toString() ?? "1",
      multiplier: rule.multiplier.toString(),
    });
    setDialogOpen(true);
  }

  function saveRule() {
    const multiplier = parseFloat(form.multiplier);
    if (!form.name || isNaN(multiplier) || multiplier <= 0) return;

    const vehicleId =
      selectedVehicleId === "all" ? vehicles[0].id : selectedVehicleId;

    if (editingRuleId) {
      setRules((prev) =>
        prev.map((r) =>
          r.id === editingRuleId
            ? {
                ...r,
                name: form.name,
                type: form.type,
                start_date:
                  form.type === "day_of_week" ? null : form.start_date || null,
                end_date:
                  form.type === "day_of_week" ? null : form.end_date || null,
                day_of_week:
                  form.type === "day_of_week"
                    ? parseInt(form.day_of_week)
                    : null,
                multiplier,
              }
            : r
        )
      );
    } else {
      const newRule: PricingRule = {
        id: `r${Date.now()}`,
        vehicle_id: vehicleId,
        operator_id: "op1",
        name: form.name,
        type: form.type,
        start_date:
          form.type === "day_of_week" ? null : form.start_date || null,
        end_date: form.type === "day_of_week" ? null : form.end_date || null,
        day_of_week:
          form.type === "day_of_week" ? parseInt(form.day_of_week) : null,
        multiplier,
        created_at: new Date().toISOString(),
      };
      setRules((prev) => [...prev, newRule]);
    }
    setDialogOpen(false);
  }

  function deleteRule(id: string) {
    setRules((prev) => prev.filter((r) => r.id !== id));
  }

  // Pricing preview calendar (next 30 days)
  function getEffectiveRate(vehicle: Vehicle, date: Date): number {
    let rate = vehicle.daily_rate;
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.getDay();

    const applicable = rules.filter((r) => r.vehicle_id === vehicle.id);
    let bestMultiplier = 1;

    for (const rule of applicable) {
      if (rule.type === "day_of_week" && rule.day_of_week === dayOfWeek) {
        bestMultiplier = Math.max(bestMultiplier, rule.multiplier);
      } else if (rule.start_date && rule.end_date) {
        if (dateStr >= rule.start_date && dateStr <= rule.end_date) {
          if (rule.type === "discount") {
            bestMultiplier = Math.min(bestMultiplier, rule.multiplier);
          } else {
            bestMultiplier = Math.max(bestMultiplier, rule.multiplier);
          }
        }
      }
    }

    return rate * bestMultiplier;
  }

  function getCalendarDays(vehicle: Vehicle) {
    const today = new Date();
    const days: { date: Date; rate: number; multiplier: number }[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const effectiveRate = getEffectiveRate(vehicle, d);
      days.push({
        date: d,
        rate: effectiveRate,
        multiplier: effectiveRate / vehicle.daily_rate,
      });
    }
    return days;
  }

  function getDayColor(multiplier: number): string {
    if (multiplier < 0.95)
      return "bg-blue-500/20 text-blue-700 border-blue-300";
    if (multiplier <= 1.05)
      return "bg-emerald-500/15 text-emerald-700 border-emerald-300";
    if (multiplier <= 1.3)
      return "bg-amber-500/20 text-amber-700 border-amber-300";
    return "bg-red-500/20 text-red-700 border-red-300";
  }

  // All-vehicles overview helpers
  function rulesCountForVehicle(vehicleId: string): number {
    return rules.filter((r) => r.vehicle_id === vehicleId).length;
  }

  return (
    <div className="min-h-screen space-y-6 bg-[#F8F9FC]">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Dynamic Pricing
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage rates, seasonal pricing, and discount rules across your fleet
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            value={selectedVehicleId}
            onValueChange={(val) => {
              if (val !== null) setSelectedVehicleId(val);
            }}
          >
            <SelectTrigger className="w-[260px] border-gray-200 bg-white">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-gray-400" />
                  All Vehicles
                </span>
              </SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedVehicleId !== "all" && (
            <Button
              onClick={openAddDialog}
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Rule
            </Button>
          )}
        </div>
      </div>

      {/* ---------- ALL VEHICLES OVERVIEW ---------- */}
      {selectedVehicleId === "all" && (
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Car className="h-5 w-5 text-[#2EBD6B]" />
              Fleet Pricing Overview
            </CardTitle>
            <CardDescription>
              Rates and active rules for all vehicles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Vehicle</TableHead>
                  <TableHead className="text-right">Daily Rate</TableHead>
                  <TableHead className="text-right">Weekly Rate</TableHead>
                  <TableHead className="text-right">Monthly Rate</TableHead>
                  <TableHead className="text-center">Min Days</TableHead>
                  <TableHead className="text-center">Active Rules</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.map((v) => (
                  <TableRow
                    key={v.id}
                    className="cursor-pointer hover:bg-gray-50/80"
                    onClick={() => setSelectedVehicleId(v.id)}
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium text-gray-900">
                          {v.year} {v.make} {v.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {v.category} &middot; {v.plate}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-gray-900">
                      {formatCurrency(v.daily_rate)}
                      <span className="text-xs font-normal text-muted-foreground">
                        /day
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-medium">
                          {formatCurrency(v.weekly_rate ?? v.daily_rate * 7)}
                        </span>
                        {v.weekly_rate && (
                          <span className="ml-1.5 text-xs text-emerald-600">
                            {discountPct(v.daily_rate, v.weekly_rate, 7)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div>
                        <span className="font-medium">
                          {formatCurrency(v.monthly_rate ?? v.daily_rate * 30)}
                        </span>
                        {v.monthly_rate && (
                          <span className="ml-1.5 text-xs text-emerald-600">
                            {discountPct(v.daily_rate, v.monthly_rate, 30)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="border-gray-200 bg-gray-50 text-gray-700"
                      >
                        {v.minimum_rental_days}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className="border-[#2EBD6B]/20 bg-[#2EBD6B]/10 text-[#2EBD6B]"
                      >
                        {rulesCountForVehicle(v.id)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#2EBD6B] hover:text-[#1a9952]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVehicleId(v.id);
                        }}
                      >
                        Manage
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ---------- SINGLE VEHICLE VIEW ---------- */}
      {selectedVehicle && (
        <>
          {/* Back to overview */}
          <button
            onClick={() => setSelectedVehicleId("all")}
            className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-gray-900"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to All Vehicles
          </button>

          {/* Vehicle title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
              <Car className="h-5 w-5 text-[#2EBD6B]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedVehicle.year} {selectedVehicle.make}{" "}
                {selectedVehicle.model}
              </h2>
              <p className="text-xs text-muted-foreground">
                {selectedVehicle.category} &middot; {selectedVehicle.plate}
              </p>
            </div>
          </div>

          {/* ---- Base Rates Card ---- */}
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <DollarSign className="h-5 w-5 text-[#2EBD6B]" />
                Base Rates
              </CardTitle>
              <CardDescription>
                Set the standard pricing for this vehicle
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const rates = getEditableRates(selectedVehicle);
                const dailyNum = parseFloat(rates.daily_rate) || 0;
                const weeklyNum = parseFloat(rates.weekly_rate) || 0;
                const monthlyNum = parseFloat(rates.monthly_rate) || 0;
                const hasEdits = !!editingRates[selectedVehicle.id];

                return (
                  <div className="space-y-6">
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Daily Rate */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Daily Rate
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            className="pl-7 text-lg font-semibold"
                            value={rates.daily_rate}
                            onChange={(e) =>
                              updateRate(
                                selectedVehicle.id,
                                "daily_rate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          per day
                        </p>
                      </div>

                      {/* Weekly Rate */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Weekly Rate
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            className="pl-7 text-lg font-semibold"
                            value={rates.weekly_rate}
                            onChange={(e) =>
                              updateRate(
                                selectedVehicle.id,
                                "weekly_rate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {formatCurrency(weeklyNum / 7)}/day effective
                          </span>
                          {dailyNum > 0 && weeklyNum > 0 && (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-600"
                            >
                              {discountPct(dailyNum, weeklyNum, 7)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Monthly Rate */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Monthly Rate
                        </Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            $
                          </span>
                          <Input
                            type="number"
                            className="pl-7 text-lg font-semibold"
                            value={rates.monthly_rate}
                            onChange={(e) =>
                              updateRate(
                                selectedVehicle.id,
                                "monthly_rate",
                                e.target.value
                              )
                            }
                          />
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-muted-foreground">
                            {formatCurrency(monthlyNum / 30)}/day effective
                          </span>
                          {dailyNum > 0 && monthlyNum > 0 && (
                            <Badge
                              variant="outline"
                              className="border-emerald-200 bg-emerald-50 text-emerald-600"
                            >
                              {discountPct(dailyNum, monthlyNum, 30)}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Minimum Rental Days */}
                      <div className="space-y-2">
                        <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Minimum Rental
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          className="text-lg font-semibold"
                          value={rates.minimum_rental_days}
                          onChange={(e) =>
                            updateRate(
                              selectedVehicle.id,
                              "minimum_rental_days",
                              e.target.value
                            )
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          days minimum
                        </p>
                      </div>
                    </div>

                    {hasEdits && (
                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setEditingRates((prev) => {
                              const next = { ...prev };
                              delete next[selectedVehicle.id];
                              return next;
                            })
                          }
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                          onClick={() => saveRates(selectedVehicle.id)}
                        >
                          Save Rates
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* ---- Pricing Rules Table ---- */}
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
                    Pricing Rules
                  </CardTitle>
                  <CardDescription>
                    {vehicleRules.length} rule
                    {vehicleRules.length !== 1 ? "s" : ""} configured
                  </CardDescription>
                </div>
                <Button
                  onClick={openAddDialog}
                  size="sm"
                  className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Rule
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {vehicleRules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                    <TrendingUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">
                    No pricing rules yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Add rules to dynamically adjust rates based on seasons, days,
                    or demand
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Rule Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Date Range / Day</TableHead>
                      <TableHead className="text-right">Multiplier</TableHead>
                      <TableHead className="text-right">
                        Effective Rate
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicleRules.map((rule) => {
                      const effectiveRate =
                        selectedVehicle.daily_rate * rule.multiplier;
                      const isDiscount = rule.multiplier < 1;

                      return (
                        <TableRow key={rule.id} className="hover:bg-gray-50/50">
                          <TableCell className="font-medium text-gray-900">
                            {rule.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={TYPE_BADGE_STYLES[rule.type]}
                            >
                              {TYPE_LABELS[rule.type]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            {rule.type === "day_of_week"
                              ? DAY_NAMES_FULL[rule.day_of_week ?? 0]
                              : formatDateRange(rule.start_date, rule.end_date)}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={`font-semibold ${
                                isDiscount ? "text-emerald-600" : "text-red-600"
                              }`}
                            >
                              {rule.multiplier.toFixed(2)}x
                            </span>
                            <span className="ml-1 text-xs text-muted-foreground">
                              (
                              {isDiscount
                                ? `-${((1 - rule.multiplier) * 100).toFixed(0)}%`
                                : `+${((rule.multiplier - 1) * 100).toFixed(0)}%`}
                              )
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-gray-900">
                            {formatCurrency(effectiveRate)}
                            <span className="text-xs font-normal text-muted-foreground">
                              /day
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
                                onClick={() => openEditDialog(rule)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
                                onClick={() => deleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
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

          {/* ---- Pricing Preview Calendar ---- */}
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-[#2EBD6B]" />
                30-Day Pricing Preview
              </CardTitle>
              <CardDescription>
                Effective daily rates for the next 30 days based on all active
                rules
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Legend */}
              <div className="mb-4 flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-emerald-300 bg-emerald-500/15" />
                  Normal
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-amber-300 bg-amber-500/20" />
                  Slight Increase
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-red-300 bg-red-500/20" />
                  Peak Pricing
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block h-3 w-3 rounded border border-blue-300 bg-blue-500/20" />
                  Discounted
                </div>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Day headers */}
                {DAY_NAMES.map((d) => (
                  <div
                    key={d}
                    className="pb-1 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
                  >
                    {d}
                  </div>
                ))}

                {/* Leading empty cells to align first day */}
                {(() => {
                  const days = getCalendarDays(selectedVehicle);
                  const firstDayOfWeek = days[0].date.getDay();
                  const empties = Array.from(
                    { length: firstDayOfWeek },
                    (_, i) => (
                      <div key={`empty-${i}`} />
                    )
                  );

                  return (
                    <>
                      {empties}
                      {days.map((day, idx) => {
                        const colorClass = getDayColor(day.multiplier);
                        const dateNum = day.date.getDate();
                        const monthShort = day.date.toLocaleDateString(
                          "en-US",
                          { month: "short" }
                        );
                        const isHovered = hoveredDay === idx;

                        return (
                          <div
                            key={idx}
                            className={`relative flex min-h-[64px] cursor-default flex-col items-center justify-center rounded-lg border p-1 transition-all ${colorClass} ${
                              isHovered
                                ? "ring-2 ring-[#2EBD6B] ring-offset-1"
                                : ""
                            }`}
                            onMouseEnter={() => setHoveredDay(idx)}
                            onMouseLeave={() => setHoveredDay(null)}
                          >
                            <span className="text-[10px] leading-none opacity-60">
                              {dateNum === 1 || idx === 0 ? monthShort : ""}
                            </span>
                            <span className="text-sm font-semibold leading-tight">
                              {dateNum}
                            </span>
                            <span className="mt-0.5 text-[10px] font-medium leading-none">
                              {formatCurrency(day.rate)}
                            </span>
                            {isHovered && (
                              <div className="absolute -top-10 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg">
                                {day.date.toLocaleDateString("en-US", {
                                  weekday: "short",
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                &mdash; {formatCurrency(day.rate)}/day
                                {day.multiplier !== 1 && (
                                  <span className="ml-1 opacity-75">
                                    ({day.multiplier.toFixed(2)}x)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ---------- ADD / EDIT RULE DIALOG ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>
              {editingRuleId ? "Edit Pricing Rule" : "Add Pricing Rule"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Rule Name */}
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                placeholder="e.g. Summer Peak Pricing"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            {/* Rule Type */}
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.type}
                onValueChange={(val) => {
                  if (val !== null)
                    setForm({ ...form, type: val as PricingRule["type"] });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="peak_season">Peak Season</SelectItem>
                  <SelectItem value="discount">Discount</SelectItem>
                  <SelectItem value="surge">Surge</SelectItem>
                  <SelectItem value="day_of_week">Day of Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Conditional fields */}
            {form.type === "day_of_week" ? (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={form.day_of_week}
                  onValueChange={(val) =>
                    setForm({ ...form, day_of_week: val ?? "1" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES_FULL.map((name, i) => (
                      <SelectItem key={i} value={i.toString()}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.end_date}
                    onChange={(e) =>
                      setForm({ ...form, end_date: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {/* Multiplier */}
            <div className="space-y-2">
              <Label>Multiplier</Label>
              <Input
                type="number"
                step="0.05"
                min="0.1"
                max="5"
                placeholder="1.5"
                value={form.multiplier}
                onChange={(e) =>
                  setForm({ ...form, multiplier: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground">
                1.5 = 50% increase &middot; 0.8 = 20% discount
              </p>
            </div>

            {/* Live Preview */}
            {selectedVehicle && (
              <>
                <Separator />
                <div className="rounded-lg border border-gray-100 bg-[#F8F9FC] p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Info className="h-4 w-4 text-[#2EBD6B]" />
                    <span className="font-medium text-gray-700">Preview</span>
                  </div>
                  <p className="mt-2 text-lg font-semibold text-gray-900">
                    Base {formatCurrency(selectedVehicle.daily_rate)}/day{" "}
                    <span className="text-muted-foreground">&times;</span>{" "}
                    {parseFloat(form.multiplier) || 0}
                    <span className="text-muted-foreground"> = </span>
                    <span className="text-[#2EBD6B]">
                      {formatCurrency(
                        selectedVehicle.daily_rate *
                          (parseFloat(form.multiplier) || 0)
                      )}
                      /day
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              onClick={saveRule}
              disabled={
                !form.name || !form.multiplier || parseFloat(form.multiplier) <= 0
              }
            >
              {editingRuleId ? "Update Rule" : "Add Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
