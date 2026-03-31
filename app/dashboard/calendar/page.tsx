"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Car,
  Filter,
  X,
} from "lucide-react";
import type { Vehicle, Booking, BookingStatus } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDate(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${year}-${m}-${d}`;
}

function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function isDateInRange(dateStr: string, startStr: string, endStr: string): boolean {
  const date = parseDate(dateStr);
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  return date >= start && date <= end;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_COLORS: Record<string, { bg: string; dot: string; label: string }> = {
  available: { bg: "bg-emerald-500/15", dot: "bg-emerald-500", label: "Available" },
  confirmed: { bg: "bg-blue-500/15", dot: "bg-blue-500", label: "Confirmed" },
  pending: { bg: "bg-amber-500/15", dot: "bg-amber-500", label: "Pending" },
  active: { bg: "bg-[#2EBD6B]/15", dot: "bg-[#2EBD6B]", label: "Active" },
  completed: { bg: "bg-slate-400/10", dot: "bg-slate-400", label: "Completed" },
  cancelled: { bg: "bg-red-500/15", dot: "bg-red-400", label: "Cancelled" },
  maintenance: { bg: "bg-slate-500/15", dot: "bg-slate-500", label: "Maintenance" },
};

const LEGEND_ITEMS = [
  { key: "available", dot: "bg-emerald-500" },
  { key: "confirmed", dot: "bg-blue-500" },
  { key: "pending", dot: "bg-amber-500" },
  { key: "active", dot: "bg-[#2EBD6B]" },
  { key: "completed", dot: "bg-slate-400" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarPage() {
  const supabase = createClient();
  const today = new Date();
  const todayStr = formatDate(today.getFullYear(), today.getMonth(), today.getDate());

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [filterVehicle, setFilterVehicle] = useState("all");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDialogOpen, setDayDialogOpen] = useState(false);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: op } = await supabase
      .from("operators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!op) return;

    // Load vehicles
    const { data: vehicleData } = await supabase
      .from("vehicles")
      .select("*")
      .eq("operator_id", op.id)
      .order("created_at");

    // Load bookings for visible range (include padding for multi-month spans)
    const rangeStart = formatDate(currentYear, currentMonth - 1, 1);
    const rangeEnd = formatDate(currentYear, currentMonth + 2, 0);

    const { data: bookingData } = await supabase
      .from("bookings")
      .select("*")
      .eq("operator_id", op.id)
      .or(`start_date.lte.${rangeEnd},end_date.gte.${rangeStart}`)
      .not("status", "eq", "inquiry");

    setVehicles((vehicleData as Vehicle[]) || []);
    setBookings((bookingData as Booking[]) || []);
    setLoading(false);
  }, [currentYear, currentMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadData();
  }, [loadData]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredVehicles = useMemo(
    () =>
      filterVehicle === "all"
        ? vehicles
        : vehicles.filter((v) => v.id === filterVehicle),
    [filterVehicle, vehicles]
  );

  // Build lookup: vehicleId -> day string -> booking
  const cellBookingMap = useMemo(() => {
    const map: Record<string, Record<string, Booking>> = {};
    for (const vehicle of vehicles) {
      map[vehicle.id] = {};
    }
    for (const booking of bookings) {
      const vid = booking.vehicle_id;
      if (!vid || !map[vid]) continue;
      for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = formatDate(currentYear, currentMonth, day);
        if (isDateInRange(dateStr, booking.start_date, booking.end_date)) {
          const existing = map[vid][dateStr];
          if (!existing || priorityOf(booking.status) > priorityOf(existing.status)) {
            map[vid][dateStr] = booking;
          }
        }
      }
    }
    return map;
  }, [bookings, vehicles, currentYear, currentMonth, daysInMonth]);

  function priorityOf(status: BookingStatus | string): number {
    const order: Record<string, number> = {
      active: 5, confirmed: 4, pending: 3, cancelled: 1, completed: 0, inquiry: 0,
    };
    return order[status] ?? 0;
  }

  function getCellStatus(vehicle: Vehicle, dayStr: string): { status: string; booking?: Booking } {
    if (vehicle.status === "maintenance") return { status: "maintenance" };
    const booking = cellBookingMap[vehicle.id]?.[dayStr];
    if (booking) return { status: booking.status, booking };
    return { status: "available" };
  }

  function goToPreviousMonth() {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((y) => y - 1); }
    else setCurrentMonth((m) => m - 1);
  }

  function goToNextMonth() {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((y) => y + 1); }
    else setCurrentMonth((m) => m + 1);
  }

  function goToToday() {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  }

  function handleCellClick(dayStr: string) {
    setSelectedDay(dayStr);
    setDayDialogOpen(true);
  }

  // Get all bookings for a specific day
  function getBookingsForDay(dayStr: string): { vehicle: Vehicle; booking: Booking }[] {
    const results: { vehicle: Vehicle; booking: Booking }[] = [];
    for (const vehicle of filteredVehicles) {
      const booking = cellBookingMap[vehicle.id]?.[dayStr];
      if (booking) results.push({ vehicle, booking });
    }
    return results;
  }

  const dayOfWeekLabels = dayNumbers.map((d) => {
    const date = new Date(currentYear, currentMonth, d);
    return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-[#2EBD6B]" />
            Availability Calendar
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            View and manage fleet availability across the month
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterVehicle} onValueChange={(val) => setFilterVehicle(val ?? "all")}>
            <SelectTrigger className="min-w-[180px]">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.year} {v.make} {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardContent className="p-0">
          {/* Month navigation */}
          <div className="flex items-center justify-between border-b px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            <h2 className="text-lg font-semibold">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <div className="text-sm text-muted-foreground">
              {filteredVehicles.length} vehicle{filteredVehicles.length !== 1 ? "s" : ""}
            </div>
          </div>

          {/* Grid */}
          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No vehicles in your fleet yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className="min-w-[900px]"
                style={{
                  display: "grid",
                  gridTemplateColumns: `180px repeat(${daysInMonth}, minmax(38px, 1fr))`,
                }}
              >
                {/* Header row */}
                <div className="sticky left-0 z-10 bg-muted/50 border-b border-r px-3 py-2 text-xs font-medium text-muted-foreground flex items-center">
                  <Car className="h-3.5 w-3.5 mr-1.5" />
                  Vehicle
                </div>
                {dayNumbers.map((d) => {
                  const dateStr = formatDate(currentYear, currentMonth, d);
                  const isToday = dateStr === todayStr;
                  const isWeekend = [0, 6].includes(new Date(currentYear, currentMonth, d).getDay());
                  return (
                    <div
                      key={d}
                      className={`border-b border-r px-1 py-2 text-center cursor-pointer hover:bg-muted/60 ${isWeekend ? "bg-muted/30" : "bg-muted/50"}`}
                      onClick={() => handleCellClick(dateStr)}
                    >
                      <div className={`text-[10px] leading-none font-medium mb-0.5 ${isToday ? "text-[#2EBD6B]" : "text-muted-foreground"}`}>
                        {dayOfWeekLabels[d - 1]}
                      </div>
                      <div className={`text-xs font-semibold leading-none ${isToday ? "mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-[#2EBD6B] text-white" : ""}`}>
                        {d}
                      </div>
                    </div>
                  );
                })}

                {/* Vehicle rows */}
                {filteredVehicles.map((vehicle) => (
                  <div key={vehicle.id} className="contents">
                    {/* Vehicle label */}
                    <div className="sticky left-0 z-10 bg-background border-b border-r px-3 py-2 flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {vehicle.year} {vehicle.make}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {vehicle.model}
                          {vehicle.plate ? ` \u00B7 ${vehicle.plate}` : ""}
                        </div>
                      </div>
                      {vehicle.status === "maintenance" && (
                        <Badge variant="outline" className="bg-slate-500/10 text-slate-500 border-slate-500/20 text-[10px] shrink-0">
                          Maint.
                        </Badge>
                      )}
                    </div>

                    {/* Day cells */}
                    {dayNumbers.map((d) => {
                      const dateStr = formatDate(currentYear, currentMonth, d);
                      const { status, booking } = getCellStatus(vehicle, dateStr);
                      const colors = STATUS_COLORS[status] || STATUS_COLORS.available;
                      const isToday = dateStr === todayStr;
                      const isWeekend = [0, 6].includes(new Date(currentYear, currentMonth, d).getDay());

                      return (
                        <div
                          key={`${vehicle.id}-${d}`}
                          className={`relative border-b border-r transition-all duration-100 group/cell ${colors.bg} ${isToday ? "ring-1 ring-inset ring-[#2EBD6B]/40" : ""} cursor-pointer hover:opacity-80 ${isWeekend && status === "available" ? "bg-slate-50/50" : ""}`}
                          style={{ minHeight: "44px" }}
                          onClick={() => handleCellClick(dateStr)}
                        >
                          {booking && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                            </div>
                          )}
                          {/* Tooltip */}
                          {booking && (
                            <div className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 opacity-0 group-hover/cell:opacity-100 transition-opacity duration-150">
                              <div className="whitespace-nowrap rounded-md bg-[#0c0c1c] px-2.5 py-1.5 text-[11px] text-white shadow-lg">
                                <div className="font-medium">{booking.renter_name}</div>
                                <div className="text-white/60 mt-0.5">
                                  {booking.start_date} &rarr; {booking.end_date}
                                </div>
                                <div className="text-white/60">
                                  ${booking.total_price.toLocaleString()} &middot; <span className="capitalize">{booking.status}</span>
                                </div>
                                <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-[#0c0c1c]" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardContent className="py-3 px-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="text-xs font-medium text-muted-foreground mr-1">Legend:</span>
            {LEGEND_ITEMS.map((item) => (
              <div key={item.key} className="flex items-center gap-1.5">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.dot}`} />
                <span className="text-xs text-muted-foreground">{STATUS_COLORS[item.key].label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dayDialogOpen} onOpenChange={setDayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-[#2EBD6B]" />
              {selectedDay
                ? parseDate(selectedDay).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogTitle>
            <DialogDescription>
              Bookings for this day
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[400px] overflow-y-auto">
            {selectedDay && (() => {
              const dayBookings = getBookingsForDay(selectedDay);
              if (dayBookings.length === 0) {
                return (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">No bookings on this day</p>
                  </div>
                );
              }
              return dayBookings.map(({ vehicle, booking }) => (
                <div key={booking.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{booking.renter_name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.start_date} &rarr; {booking.end_date} ({booking.duration_days} days)
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`${
                          booking.status === "active"
                            ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                            : booking.status === "confirmed"
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : booking.status === "pending"
                            ? "bg-amber-100 text-amber-700 border-amber-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {booking.status}
                      </Badge>
                      <p className="text-sm font-bold mt-1 text-[#2EBD6B]">
                        ${booking.total_price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
