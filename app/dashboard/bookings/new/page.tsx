"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Car,
  User,
  CalendarDays,
  DollarSign,
  CreditCard,
  Check,
  Info,
  FileText,
  Plus,
  Minus,
} from "lucide-react";
import type { Vehicle, BookingStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Placeholder fleet data
// ---------------------------------------------------------------------------
const PLACEHOLDER_VEHICLES: Vehicle[] = [
  {
    id: "v1",
    operator_id: "op1",
    make: "Toyota",
    model: "Camry",
    year: 2024,
    color: "Pearl White",
    plate: "PCR-1001",
    vin: null,
    daily_rate: 65,
    weekly_rate: 390,
    monthly_rate: 1400,
    mileage: 12400,
    fuel_level: "full",
    category: "Sedan",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 1,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "v2",
    operator_id: "op1",
    make: "Honda",
    model: "Accord",
    year: 2023,
    color: "Lunar Silver",
    plate: "PCR-1002",
    vin: null,
    daily_rate: 60,
    weekly_rate: 360,
    monthly_rate: 1300,
    mileage: 18900,
    fuel_level: "3/4",
    category: "Sedan",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 1,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "v3",
    operator_id: "op1",
    make: "Tesla",
    model: "Model 3",
    year: 2024,
    color: "Midnight Black",
    plate: "PCR-2001",
    vin: null,
    daily_rate: 95,
    weekly_rate: 570,
    monthly_rate: 2100,
    mileage: 8200,
    fuel_level: "n/a",
    category: "Electric",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 3,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "v4",
    operator_id: "op1",
    make: "BMW",
    model: "X5",
    year: 2023,
    color: "Alpine White",
    plate: "PCR-3001",
    vin: null,
    daily_rate: 130,
    weekly_rate: 780,
    monthly_rate: 2800,
    mileage: 15600,
    fuel_level: "full",
    category: "SUV",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 2,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "v5",
    operator_id: "op1",
    make: "Mercedes-Benz",
    model: "C300",
    year: 2024,
    color: "Obsidian Black",
    plate: "PCR-4001",
    vin: null,
    daily_rate: 110,
    weekly_rate: 660,
    monthly_rate: 2400,
    mileage: 5400,
    fuel_level: "full",
    category: "Luxury",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 2,
    status: "maintenance",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
  {
    id: "v6",
    operator_id: "op1",
    make: "Hyundai",
    model: "Elantra",
    year: 2025,
    color: "Electric Shadow",
    plate: "PCR-1003",
    vin: null,
    daily_rate: 50,
    weekly_rate: 300,
    monthly_rate: 1100,
    mileage: 3100,
    fuel_level: "full",
    category: "Economy",
    purchase_price: null,
    monthly_cost: null,
    minimum_rental_days: 1,
    status: "active",
    photo_url: null,
    location_id: null,
    created_at: "",
    updated_at: "",
  },
];

const STATUS_OPTIONS: { value: BookingStatus; label: string }[] = [
  { value: "inquiry", label: "Inquiry" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function NewBookingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [multiVehicle, setMultiVehicle] = useState(false);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [installmentCount, setInstallmentCount] = useState(2);

  const [form, setForm] = useState({
    renter_name: "",
    renter_phone: "",
    renter_email: "",
    drivers_license: "",
    start_date: "",
    end_date: "",
    status: "inquiry" as BookingStatus,
    pickup_instructions: "",
    notes: "",
  });

  // Handlers ----------------------------------------------------------------

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function toggleVehicle(vehicleId: string) {
    const vehicle = PLACEHOLDER_VEHICLES.find((v) => v.id === vehicleId);
    if (!vehicle || vehicle.status !== "active") return;

    if (multiVehicle) {
      setSelectedVehicleIds((prev) =>
        prev.includes(vehicleId)
          ? prev.filter((id) => id !== vehicleId)
          : [...prev, vehicleId],
      );
    } else {
      setSelectedVehicleIds((prev) =>
        prev.includes(vehicleId) ? [] : [vehicleId],
      );
    }
  }

  function handleModeSwitch(multi: boolean) {
    setMultiVehicle(multi);
    if (!multi && selectedVehicleIds.length > 1) {
      setSelectedVehicleIds([selectedVehicleIds[0]]);
    }
  }

  // Derived data ------------------------------------------------------------

  const selectedVehicles = useMemo(
    () =>
      PLACEHOLDER_VEHICLES.filter((v) => selectedVehicleIds.includes(v.id)),
    [selectedVehicleIds],
  );

  const duration = useMemo(() => {
    if (!form.start_date || !form.end_date) return 0;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const diffMs = end.getTime() - start.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }, [form.start_date, form.end_date]);

  const pricing = useMemo(() => {
    if (duration === 0 || selectedVehicles.length === 0) {
      return {
        perVehicle: [] as {
          vehicle: Vehicle;
          dailyRate: number;
          subtotal: number;
        }[],
        subtotal: 0,
        discount: 0,
        total: 0,
        isLongTerm: false,
      };
    }

    const perVehicle = selectedVehicles.map((v) => {
      let effectiveRate = v.daily_rate;
      // Apply weekly rate discount if >=7 days
      if (duration >= 7 && v.weekly_rate) {
        effectiveRate = v.weekly_rate / 7;
      }
      // Apply monthly rate discount if >=30 days
      if (duration >= 30 && v.monthly_rate) {
        effectiveRate = v.monthly_rate / 30;
      }
      const subtotal = effectiveRate * duration;
      return { vehicle: v, dailyRate: effectiveRate, subtotal };
    });

    const subtotal = perVehicle.reduce(
      (sum, pv) => sum + pv.vehicle.daily_rate * duration,
      0,
    );
    const discountedTotal = perVehicle.reduce(
      (sum, pv) => sum + pv.subtotal,
      0,
    );
    const discount = subtotal - discountedTotal;

    return {
      perVehicle,
      subtotal,
      discount,
      total: discountedTotal,
      isLongTerm: duration > 30,
    };
  }, [duration, selectedVehicles]);

  const paymentSchedule = useMemo(() => {
    if (!pricing.isLongTerm || pricing.total === 0) return [];
    const amountPerPayment = pricing.total / installmentCount;
    const schedule: { number: number; dueDate: string; amount: number }[] = [];
    const startDate = new Date(form.start_date);

    for (let i = 0; i < installmentCount; i++) {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i);
      schedule.push({
        number: i + 1,
        dueDate: dueDate.toISOString().split("T")[0],
        amount: amountPerPayment,
      });
    }
    return schedule;
  }, [pricing.isLongTerm, pricing.total, installmentCount, form.start_date]);

  // Submit ------------------------------------------------------------------

  function handleSubmit(e: React.FormEvent, isDraft = false) {
    e.preventDefault();
    setLoading(true);
    // Simulate a short delay, then navigate back
    setTimeout(() => {
      setLoading(false);
      router.push("/dashboard/bookings");
    }, 800);
  }

  // Render ------------------------------------------------------------------

  const statusColor = (s: Vehicle["status"]) => {
    switch (s) {
      case "active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "maintenance":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "inactive":
        return "bg-gray-100 text-gray-500 border-gray-200";
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC] w-full overflow-x-hidden">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              New Booking
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Create a new rental booking with full vehicle and pricing details
            </p>
          </div>
        </div>

        <form
          onSubmit={(e) => handleSubmit(e, false)}
          className="grid gap-6 lg:grid-cols-[1fr_380px]"
        >
          {/* ============ LEFT COLUMN ============ */}
          <div className="space-y-6">
            {/* --- Renter Information --- */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                    <User className="h-3.5 w-3.5 text-[#2EBD6B]" />
                  </div>
                  Renter Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="renter_name">
                      Full Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="renter_name"
                      name="renter_name"
                      placeholder="John Doe"
                      value={form.renter_name}
                      onChange={handleChange}
                      required
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="renter_phone">Phone</Label>
                    <Input
                      id="renter_phone"
                      name="renter_phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={form.renter_phone}
                      onChange={handleChange}
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="renter_email">Email</Label>
                    <Input
                      id="renter_email"
                      name="renter_email"
                      type="email"
                      placeholder="renter@example.com"
                      value={form.renter_email}
                      onChange={handleChange}
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="drivers_license">
                      Driver&apos;s License #
                    </Label>
                    <Input
                      id="drivers_license"
                      name="drivers_license"
                      placeholder="DL-123456789"
                      value={form.drivers_license}
                      onChange={handleChange}
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* --- Vehicle Selection --- */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                      <Car className="h-3.5 w-3.5 text-[#2EBD6B]" />
                    </div>
                    Vehicle Selection
                    {selectedVehicleIds.length > 0 && (
                      <Badge
                        variant="secondary"
                        className="ml-2 bg-[#2EBD6B]/10 text-[#2EBD6B]"
                      >
                        {selectedVehicleIds.length} selected
                      </Badge>
                    )}
                  </CardTitle>

                  {/* Toggle */}
                  <div className="flex shrink-0 items-center rounded-lg border border-gray-200 bg-[#F8F9FC] p-0.5">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch(false)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        !multiVehicle
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeSwitch(true)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        multiVehicle
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      Multi
                    </button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PLACEHOLDER_VEHICLES.map((v) => {
                    const isSelected = selectedVehicleIds.includes(v.id);
                    const isAvailable = v.status === "active";

                    return (
                      <button
                        key={v.id}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => toggleVehicle(v.id)}
                        className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
                          isSelected
                            ? "border-[#2EBD6B] bg-[#2EBD6B]/[0.03] shadow-sm"
                            : isAvailable
                              ? "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                              : "cursor-not-allowed border-gray-100 bg-gray-50 opacity-60"
                        }`}
                      >
                        {/* Selection check */}
                        {isSelected && (
                          <div className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#2EBD6B]">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}

                        <div className="mb-2 flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {v.year} {v.make} {v.model}
                          </span>
                        </div>

                        <div className="mb-3 flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${statusColor(v.status)}`}
                          >
                            {v.status}
                          </Badge>
                          <span className="text-xs text-gray-400">
                            {v.plate}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-0.5">
                          <span className="text-lg font-bold text-gray-900">
                            ${v.daily_rate}
                          </span>
                          <span className="text-xs text-gray-400">/day</span>
                          {v.weekly_rate && (
                            <span className="ml-2 text-[10px] text-gray-400">
                              ${v.weekly_rate}/wk
                            </span>
                          )}
                          {v.monthly_rate && (
                            <span className="ml-1 text-[10px] text-gray-400">
                              ${v.monthly_rate}/mo
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* --- Booking Details --- */}
            <Card className="border-0 bg-white shadow-sm overflow-hidden">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                    <CalendarDays className="h-3.5 w-3.5 text-[#2EBD6B]" />
                  </div>
                  Booking Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 grid-cols-1 pr-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      name="start_date"
                      type="date"
                      value={form.start_date}
                      onChange={handleChange}
                      required
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      name="end_date"
                      type="date"
                      value={form.end_date}
                      onChange={handleChange}
                      required
                      className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                    />
                  </div>
                </div>

                {duration > 0 && (
                  <div className="flex items-center gap-2 rounded-lg bg-[#F8F9FC] px-3 py-2">
                    <CalendarDays className="h-4 w-4 text-[#2EBD6B]" />
                    <span className="text-sm font-medium text-gray-700">
                      {duration} {duration === 1 ? "day" : "days"}
                    </span>
                    {duration >= 7 && duration < 30 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto bg-blue-50 text-blue-600 text-[10px]"
                      >
                        Weekly rate applied
                      </Badge>
                    )}
                    {duration >= 30 && (
                      <Badge
                        variant="secondary"
                        className="ml-auto bg-purple-50 text-purple-600 text-[10px]"
                      >
                        Monthly rate applied
                      </Badge>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(val) =>
                      setForm((prev) => ({
                        ...prev,
                        status: val as BookingStatus,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full border-gray-200 bg-[#F8F9FC] focus:ring-[#2EBD6B]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pickup_instructions">
                    Pickup Instructions
                  </Label>
                  <Textarea
                    id="pickup_instructions"
                    name="pickup_instructions"
                    placeholder="Where to pick up the vehicle, access codes, meeting details..."
                    value={form.pickup_instructions}
                    onChange={handleChange}
                    rows={3}
                    className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    placeholder="Any additional notes about this booking..."
                    value={form.notes}
                    onChange={handleChange}
                    rows={3}
                    className="border-gray-200 bg-[#F8F9FC] focus-visible:ring-[#2EBD6B]"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ============ RIGHT COLUMN (Sidebar) ============ */}
          <div className="space-y-6">
            {/* --- Pricing Summary --- */}
            <Card className="sticky top-8 border-0 bg-white shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                    <DollarSign className="h-3.5 w-3.5 text-[#2EBD6B]" />
                  </div>
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedVehicles.length === 0 || duration === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center">
                    <DollarSign className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    <p className="text-sm text-gray-400">
                      Select a vehicle and dates to see pricing
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Per-vehicle breakdown */}
                    {pricing.perVehicle.map(({ vehicle, dailyRate, subtotal }) => (
                      <div
                        key={vehicle.id}
                        className="rounded-lg border border-gray-100 bg-[#F8F9FC] p-3"
                      >
                        <div className="mb-1 text-sm font-medium text-gray-900">
                          {vehicle.year} {vehicle.make} {vehicle.model}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            ${dailyRate.toFixed(2)}/day x {duration} days
                          </span>
                          <span className="font-medium text-gray-700">
                            ${subtotal.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}

                    <Separator />

                    {/* Totals */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Subtotal</span>
                        <span className="font-medium text-gray-700">
                          ${pricing.subtotal.toFixed(2)}
                        </span>
                      </div>

                      {pricing.discount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#2EBD6B]">
                            Discount{" "}
                            {duration >= 30
                              ? "(monthly)"
                              : duration >= 7
                                ? "(weekly)"
                                : ""}
                          </span>
                          <span className="font-medium text-[#2EBD6B]">
                            -${pricing.discount.toFixed(2)}
                          </span>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">
                          Total Price
                        </span>
                        <span className="text-2xl font-bold text-[#2EBD6B]">
                          ${pricing.total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Long-term info box */}
                    {pricing.isLongTerm && (
                      <div className="flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
                        <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500" />
                        <p className="text-xs leading-relaxed text-blue-700">
                          Long-term rental — Payment schedule will be
                          auto-generated with monthly installments.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* --- Payment Schedule Preview --- */}
            {pricing.isLongTerm && pricing.total > 0 && (
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
                      <CreditCard className="h-3.5 w-3.5 text-[#2EBD6B]" />
                    </div>
                    Payment Schedule
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Installment count control */}
                  <div className="flex items-center justify-between rounded-lg bg-[#F8F9FC] px-3 py-2">
                    <span className="text-sm text-gray-600">Installments</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setInstallmentCount((c) => Math.max(2, c - 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold text-gray-900">
                        {installmentCount}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setInstallmentCount((c) => Math.min(12, c + 1))
                        }
                        className="flex h-7 w-7 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* Schedule table */}
                  <div className="space-y-2">
                    {paymentSchedule.map((payment) => (
                      <div
                        key={payment.number}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F8F9FC] text-[10px] font-bold text-gray-500">
                            {payment.number}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-700">
                              Payment #{payment.number}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Due{" "}
                              {new Date(payment.dueDate).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">
                          ${payment.amount.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* --- Actions --- */}
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="space-y-3 pt-6">
                <Button
                  type="submit"
                  disabled={loading || selectedVehicleIds.length === 0}
                  className="w-full bg-[#2EBD6B] text-white shadow-sm hover:bg-[#27a85e] disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Creating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Create Booking
                    </span>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={(e) => handleSubmit(e, true)}
                  className="w-full border-gray-200"
                >
                  Save as Draft
                </Button>
                <Link href="/dashboard/bookings" className="block">
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </form>
      </div>
    </div>
  );
}
