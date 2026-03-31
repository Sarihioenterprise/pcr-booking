"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { Booking, PaymentScheduleItem } from "@/lib/types";
import {
  DollarSign,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Send,
  CalendarPlus,
  CreditCard,
  ListChecks,
  AlertCircle,
  Calendar,
  Car,
  User,
  Eye,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Placeholder Data
// ---------------------------------------------------------------------------

const MOCK_BOOKINGS: (Booking & { vehicle_label: string })[] = [
  {
    id: "bk-001",
    operator_id: "op-1",
    vehicle_id: "v-1",
    renter_id: "r-1",
    renter_name: "Marcus Johnson",
    renter_phone: "(404) 555-1234",
    renter_email: "marcus.j@email.com",
    start_date: "2026-01-15",
    end_date: "2026-04-15",
    duration_days: 90,
    daily_rate: 95,
    total_price: 8550,
    tax_amount: 0,
    discount_amount: 0,
    deposit_amount: 500,
    deposit_status: "held",
    deposit_payment_intent_id: null,
    stripe_payment_intent_id: null,
    status: "active",
    notes: null,
    pickup_instructions: null,
    drivers_license_url: null,
    location_id: null,
    dropoff_location_id: null,
    promo_code_id: null,
    mileage_out: null,
    mileage_in: null,
    fuel_out: null,
    fuel_in: null,
    created_at: "2026-01-10T00:00:00Z",
    updated_at: "2026-01-10T00:00:00Z",
    vehicle_label: "2024 Toyota Camry TRD",
  },
  {
    id: "bk-002",
    operator_id: "op-1",
    vehicle_id: "v-2",
    renter_id: "r-2",
    renter_name: "Sarah Williams",
    renter_phone: "(770) 555-5678",
    renter_email: "sarah.w@email.com",
    start_date: "2026-02-01",
    end_date: "2026-05-01",
    duration_days: 89,
    daily_rate: 110,
    total_price: 9790,
    tax_amount: 0,
    discount_amount: 0,
    deposit_amount: 600,
    deposit_status: "held",
    deposit_payment_intent_id: null,
    stripe_payment_intent_id: null,
    status: "active",
    notes: null,
    pickup_instructions: null,
    drivers_license_url: null,
    location_id: null,
    dropoff_location_id: null,
    promo_code_id: null,
    mileage_out: null,
    mileage_in: null,
    fuel_out: null,
    fuel_in: null,
    created_at: "2026-01-28T00:00:00Z",
    updated_at: "2026-01-28T00:00:00Z",
    vehicle_label: "2025 Honda Accord Sport",
  },
  {
    id: "bk-003",
    operator_id: "op-1",
    vehicle_id: "v-3",
    renter_id: "r-3",
    renter_name: "David Chen",
    renter_phone: "(678) 555-9012",
    renter_email: "david.c@email.com",
    start_date: "2026-02-10",
    end_date: "2026-04-10",
    duration_days: 59,
    daily_rate: 85,
    total_price: 5015,
    tax_amount: 0,
    discount_amount: 0,
    deposit_amount: 400,
    deposit_status: "held",
    deposit_payment_intent_id: null,
    stripe_payment_intent_id: null,
    status: "active",
    notes: null,
    pickup_instructions: null,
    drivers_license_url: null,
    location_id: null,
    dropoff_location_id: null,
    promo_code_id: null,
    mileage_out: null,
    mileage_in: null,
    fuel_out: null,
    fuel_in: null,
    created_at: "2026-02-05T00:00:00Z",
    updated_at: "2026-02-05T00:00:00Z",
    vehicle_label: "2024 Hyundai Sonata SEL",
  },
  {
    id: "bk-004",
    operator_id: "op-1",
    vehicle_id: "v-4",
    renter_id: "r-4",
    renter_name: "Aisha Patel",
    renter_phone: "(404) 555-3456",
    renter_email: "aisha.p@email.com",
    start_date: "2026-03-01",
    end_date: "2026-06-01",
    duration_days: 92,
    daily_rate: 130,
    total_price: 11960,
    tax_amount: 0,
    discount_amount: 0,
    deposit_amount: 750,
    deposit_status: "held",
    deposit_payment_intent_id: null,
    stripe_payment_intent_id: null,
    status: "active",
    notes: null,
    pickup_instructions: null,
    drivers_license_url: null,
    location_id: null,
    dropoff_location_id: null,
    promo_code_id: null,
    mileage_out: null,
    mileage_in: null,
    fuel_out: null,
    fuel_in: null,
    created_at: "2026-02-25T00:00:00Z",
    updated_at: "2026-02-25T00:00:00Z",
    vehicle_label: "2025 Tesla Model 3 Long Range",
  },
];

const MOCK_PAYMENTS: PaymentScheduleItem[] = [
  // Booking 1 - Marcus Johnson (6 installments, monthly)
  { id: "ps-001", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-01-15", status: "paid", stripe_payment_intent_id: "pi_001", paid_at: "2026-01-15T10:30:00Z", created_at: "2026-01-10T00:00:00Z" },
  { id: "ps-002", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-02-15", status: "paid", stripe_payment_intent_id: "pi_002", paid_at: "2026-02-14T15:00:00Z", created_at: "2026-01-10T00:00:00Z" },
  { id: "ps-003", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-03-15", status: "paid", stripe_payment_intent_id: "pi_003", paid_at: "2026-03-15T09:00:00Z", created_at: "2026-01-10T00:00:00Z" },
  { id: "ps-004", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-04-15", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-01-10T00:00:00Z" },
  { id: "ps-005", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-05-15", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-01-10T00:00:00Z" },
  { id: "ps-006", booking_id: "bk-001", operator_id: "op-1", amount: 1425, due_date: "2026-06-15", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-01-10T00:00:00Z" },

  // Booking 2 - Sarah Williams (3 installments, monthly)
  { id: "ps-007", booking_id: "bk-002", operator_id: "op-1", amount: 3263.33, due_date: "2026-02-01", status: "paid", stripe_payment_intent_id: "pi_007", paid_at: "2026-02-01T12:00:00Z", created_at: "2026-01-28T00:00:00Z" },
  { id: "ps-008", booking_id: "bk-002", operator_id: "op-1", amount: 3263.33, due_date: "2026-03-01", status: "paid", stripe_payment_intent_id: "pi_008", paid_at: "2026-03-02T08:00:00Z", created_at: "2026-01-28T00:00:00Z" },
  { id: "ps-009", booking_id: "bk-002", operator_id: "op-1", amount: 3263.34, due_date: "2026-04-01", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-01-28T00:00:00Z" },

  // Booking 3 - David Chen (4 installments, bi-weekly)
  { id: "ps-010", booking_id: "bk-003", operator_id: "op-1", amount: 1253.75, due_date: "2026-02-10", status: "paid", stripe_payment_intent_id: "pi_010", paid_at: "2026-02-10T11:00:00Z", created_at: "2026-02-05T00:00:00Z" },
  { id: "ps-011", booking_id: "bk-003", operator_id: "op-1", amount: 1253.75, due_date: "2026-02-24", status: "paid", stripe_payment_intent_id: "pi_011", paid_at: "2026-02-24T14:00:00Z", created_at: "2026-02-05T00:00:00Z" },
  { id: "ps-012", booking_id: "bk-003", operator_id: "op-1", amount: 1253.75, due_date: "2026-03-10", status: "overdue", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-02-05T00:00:00Z" },
  { id: "ps-013", booking_id: "bk-003", operator_id: "op-1", amount: 1253.75, due_date: "2026-03-24", status: "overdue", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-02-05T00:00:00Z" },

  // Booking 4 - Aisha Patel (4 installments, monthly)
  { id: "ps-014", booking_id: "bk-004", operator_id: "op-1", amount: 2990, due_date: "2026-03-01", status: "paid", stripe_payment_intent_id: "pi_014", paid_at: "2026-03-01T10:00:00Z", created_at: "2026-02-25T00:00:00Z" },
  { id: "ps-015", booking_id: "bk-004", operator_id: "op-1", amount: 2990, due_date: "2026-03-29", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-02-25T00:00:00Z" },
  { id: "ps-016", booking_id: "bk-004", operator_id: "op-1", amount: 2990, due_date: "2026-04-29", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-02-25T00:00:00Z" },
  { id: "ps-017", booking_id: "bk-004", operator_id: "op-1", amount: 2990, due_date: "2026-05-29", status: "pending", stripe_payment_intent_id: null, paid_at: null, created_at: "2026-02-25T00:00:00Z" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const fmtDatetime = (d: string) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const statusBadge: Record<PaymentScheduleItem["status"], string> = {
  pending: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  failed: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function daysOverdue(dueDate: string): number {
  const now = new Date("2026-03-31");
  const due = new Date(dueDate + "T00:00:00");
  const diff = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PaymentSchedulesPage() {
  const [payments, setPayments] = useState<PaymentScheduleItem[]>(MOCK_PAYMENTS);
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<"due_date" | "amount" | "status">("due_date");
  const [sortAsc, setSortAsc] = useState(true);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [generateBookingId, setGenerateBookingId] = useState("");
  const [generateFrequency, setGenerateFrequency] = useState<"weekly" | "biweekly" | "monthly">("monthly");
  const [generateInstallments, setGenerateInstallments] = useState("");
  const [generateFirstDate, setGenerateFirstDate] = useState("");
  const [generatePreview, setGeneratePreview] = useState<{ num: number; date: string; amount: number }[] | null>(null);

  // Derived data
  const bookingMap = useMemo(() => {
    const m = new Map<string, (typeof MOCK_BOOKINGS)[0]>();
    for (const b of MOCK_BOOKINGS) m.set(b.id, b);
    return m;
  }, []);

  const paymentsByBooking = useMemo(() => {
    const m = new Map<string, PaymentScheduleItem[]>();
    for (const p of payments) {
      const arr = m.get(p.booking_id) ?? [];
      arr.push(p);
      m.set(p.booking_id, arr);
    }
    return m;
  }, [payments]);

  // Summary calculations
  const totalOutstanding = useMemo(
    () => payments.filter((p) => p.status === "pending" || p.status === "overdue").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const dueThisWeek = useMemo(() => {
    const now = new Date("2026-03-31");
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return payments
      .filter((p) => {
        if (p.status !== "pending") return false;
        const d = new Date(p.due_date + "T00:00:00");
        return d >= now && d <= weekEnd;
      })
      .reduce((s, p) => s + p.amount, 0);
  }, [payments]);

  const totalOverdue = useMemo(
    () => payments.filter((p) => p.status === "overdue").reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  const collectedThisMonth = useMemo(
    () =>
      payments
        .filter((p) => p.status === "paid" && p.paid_at && p.paid_at.startsWith("2026-03"))
        .reduce((s, p) => s + p.amount, 0),
    [payments]
  );

  // All-payments tab: sorted & filtered
  const allPaymentsSorted = useMemo(() => {
    let list = [...payments];
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === "due_date") cmp = a.due_date.localeCompare(b.due_date);
      else if (sortField === "amount") cmp = a.amount - b.amount;
      else cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [payments, statusFilter, sortField, sortAsc]);

  const overduePayments = useMemo(
    () =>
      payments
        .filter((p) => p.status === "overdue")
        .sort((a, b) => a.due_date.localeCompare(b.due_date)),
    [payments]
  );

  // Actions
  const markPaid = (id: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status: "paid" as const, paid_at: new Date().toISOString(), stripe_payment_intent_id: `pi_manual_${Date.now()}` }
          : p
      )
    );
  };

  const sendReminder = (id: string) => {
    const p = payments.find((x) => x.id === id);
    if (!p) return;
    const booking = bookingMap.get(p.booking_id);
    alert(`Reminder sent to ${booking?.renter_email ?? "renter"} for payment of $${fmt(p.amount)} due ${fmtDate(p.due_date)}`);
  };

  const toggleExpand = (id: string) => {
    setExpandedBookings((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) setSortAsc((p) => !p);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Generate schedule
  const selectedGenBooking = bookingMap.get(generateBookingId);
  const genTotalAmount = selectedGenBooking?.total_price ?? 0;

  const autoInstallments = useMemo(() => {
    if (!selectedGenBooking) return 0;
    const days = selectedGenBooking.duration_days;
    if (generateFrequency === "weekly") return Math.ceil(days / 7);
    if (generateFrequency === "biweekly") return Math.ceil(days / 14);
    return Math.ceil(days / 30);
  }, [selectedGenBooking, generateFrequency]);

  const handlePreview = () => {
    const count = generateInstallments ? parseInt(generateInstallments) : autoInstallments;
    if (!count || count <= 0 || !generateFirstDate) return;
    const perPayment = Math.round((genTotalAmount / count) * 100) / 100;
    const preview: { num: number; date: string; amount: number }[] = [];
    const start = new Date(generateFirstDate + "T00:00:00");
    for (let i = 0; i < count; i++) {
      const d = new Date(start);
      if (generateFrequency === "weekly") d.setDate(d.getDate() + i * 7);
      else if (generateFrequency === "biweekly") d.setDate(d.getDate() + i * 14);
      else d.setMonth(d.getMonth() + i);
      const amt = i === count - 1 ? genTotalAmount - perPayment * (count - 1) : perPayment;
      preview.push({ num: i + 1, date: d.toISOString().split("T")[0], amount: Math.round(amt * 100) / 100 });
    }
    setGeneratePreview(preview);
  };

  const handleConfirmGenerate = () => {
    if (!generatePreview || !generateBookingId) return;
    const newItems: PaymentScheduleItem[] = generatePreview.map((p, i) => ({
      id: `ps-gen-${Date.now()}-${i}`,
      booking_id: generateBookingId,
      operator_id: "op-1",
      amount: p.amount,
      due_date: p.date,
      status: "pending" as const,
      stripe_payment_intent_id: null,
      paid_at: null,
      created_at: new Date().toISOString(),
    }));
    setPayments((prev) => [...prev, ...newItems]);
    setGenerateOpen(false);
    setGeneratePreview(null);
    setGenerateBookingId("");
    setGenerateInstallments("");
    setGenerateFirstDate("");
  };

  // Booking progress helper
  const bookingProgress = (bookingId: string) => {
    const items = paymentsByBooking.get(bookingId) ?? [];
    const total = items.reduce((s, p) => s + p.amount, 0);
    const paid = items.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);
    return total > 0 ? Math.round((paid / total) * 100) : 0;
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen space-y-6" style={{ backgroundColor: "#F8F9FC" }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Schedules</h1>
          <p className="text-muted-foreground">
            Manage long-term rental installment plans and track collections
          </p>
        </div>
        <Button
          onClick={() => setGenerateOpen(true)}
          className="gap-2"
          style={{ backgroundColor: "#2EBD6B" }}
        >
          <CalendarPlus className="h-4 w-4" />
          Generate Schedule
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Total Outstanding
                </p>
                <p className="text-2xl font-bold">${fmt(totalOutstanding)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Due This Week
                </p>
                <p className="text-2xl font-bold">${fmt(dueThisWeek)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Overdue
                </p>
                <p className="text-2xl font-bold text-red-600">${fmt(totalOverdue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: "rgba(46,189,107,0.1)" }}>
                <TrendingUp className="h-5 w-5" style={{ color: "#2EBD6B" }} />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Collected This Month
                </p>
                <p className="text-2xl font-bold" style={{ color: "#2EBD6B" }}>
                  ${fmt(collectedThisMonth)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="schedules">
        <TabsList>
          <TabsTrigger value="schedules" className="gap-1.5">
            <CreditCard className="h-4 w-4" />
            Payment Schedules
          </TabsTrigger>
          <TabsTrigger value="all" className="gap-1.5">
            <ListChecks className="h-4 w-4" />
            All Payments
          </TabsTrigger>
          <TabsTrigger value="overdue" className="gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Overdue
            {overduePayments.length > 0 && (
              <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {overduePayments.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ============================================================= */}
        {/* Payment Schedules Tab                                         */}
        {/* ============================================================= */}
        <TabsContent value="schedules" className="space-y-4 mt-4">
          {MOCK_BOOKINGS.map((booking) => {
            const items = (paymentsByBooking.get(booking.id) ?? []).sort((a, b) =>
              a.due_date.localeCompare(b.due_date)
            );
            if (items.length === 0) return null;
            const expanded = expandedBookings.has(booking.id);
            const progress = bookingProgress(booking.id);
            const totalValue = items.reduce((s, p) => s + p.amount, 0);
            const paidValue = items.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0);

            return (
              <Card key={booking.id} className="border-0 bg-white shadow-sm ring-0 overflow-hidden">
                {/* Booking Header */}
                <button
                  type="button"
                  onClick={() => toggleExpand(booking.id)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "rgba(46,189,107,0.1)" }}>
                          {expanded ? (
                            <ChevronDown className="h-5 w-5" style={{ color: "#2EBD6B" }} />
                          ) : (
                            <ChevronRight className="h-5 w-5" style={{ color: "#2EBD6B" }} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base">{booking.renter_name}</CardTitle>
                            <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-500/20 text-[11px]">
                              {booking.id}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Car className="h-3.5 w-3.5" />
                              {booking.vehicle_label}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {fmtDate(booking.start_date)} — {fmtDate(booking.end_date)}
                            </span>
                            <span className="font-medium text-foreground">
                              ${fmt(totalValue)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-muted-foreground">Collected</p>
                          <p className="text-sm font-semibold" style={{ color: "#2EBD6B" }}>
                            ${fmt(paidValue)} <span className="text-muted-foreground font-normal">/ ${fmt(totalValue)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                        <span>{progress}% collected</span>
                        <span>
                          {items.filter((p) => p.status === "paid").length} / {items.length} payments
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${progress}%`,
                            backgroundColor: "#2EBD6B",
                          }}
                        />
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Expanded Schedule Table */}
                {expanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-20">Payment #</TableHead>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Paid Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium text-muted-foreground">
                              #{idx + 1}
                            </TableCell>
                            <TableCell>{fmtDate(item.due_date)}</TableCell>
                            <TableCell className="font-semibold">${fmt(item.amount)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadge[item.status]}>
                                {item.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {item.paid_at ? fmtDatetime(item.paid_at) : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {item.status === "pending" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1 text-xs h-8"
                                    onClick={(e) => { e.stopPropagation(); markPaid(item.id); }}
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    Mark Paid
                                  </Button>
                                )}
                                {item.status === "overdue" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
                                      onClick={(e) => { e.stopPropagation(); sendReminder(item.id); }}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Send Reminder
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="gap-1 text-xs h-8"
                                      onClick={(e) => { e.stopPropagation(); markPaid(item.id); }}
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Mark Paid
                                    </Button>
                                  </>
                                )}
                                {item.status === "paid" && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                                    Completed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* ============================================================= */}
        {/* All Payments Tab                                               */}
        {/* ============================================================= */}
        <TabsContent value="all" className="mt-4">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg">All Payment Items</CardTitle>
              <div className="flex items-center gap-3">
                <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Booking Ref</TableHead>
                    <TableHead>
                      <button type="button" className="flex items-center gap-1" onClick={() => handleSort("due_date")}>
                        <User className="h-3.5 w-3.5" />
                        Renter
                      </button>
                    </TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-semibold"
                        onClick={() => handleSort("amount")}
                      >
                        Amount {sortField === "amount" && (sortAsc ? "\u2191" : "\u2193")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-semibold"
                        onClick={() => handleSort("due_date")}
                      >
                        Due Date {sortField === "due_date" && (sortAsc ? "\u2191" : "\u2193")}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-semibold"
                        onClick={() => handleSort("status")}
                      >
                        Status {sortField === "status" && (sortAsc ? "\u2191" : "\u2193")}
                      </button>
                    </TableHead>
                    <TableHead>Paid Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPaymentsSorted.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payments match the selected filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    allPaymentsSorted.map((p) => {
                      const booking = bookingMap.get(p.booking_id);
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <span className="font-mono text-xs text-muted-foreground">{p.booking_id}</span>
                          </TableCell>
                          <TableCell className="font-medium">{booking?.renter_name ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{booking?.vehicle_label ?? "—"}</TableCell>
                          <TableCell className="font-semibold">${fmt(p.amount)}</TableCell>
                          <TableCell>{fmtDate(p.due_date)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusBadge[p.status]}>
                              {p.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {p.paid_at ? fmtDatetime(p.paid_at) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============================================================= */}
        {/* Overdue Tab                                                    */}
        {/* ============================================================= */}
        <TabsContent value="overdue" className="mt-4 space-y-4">
          {/* Overdue summary banner */}
          <Card className="border-0 shadow-sm ring-0 bg-gradient-to-r from-red-50 to-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-800">Total Overdue Amount</p>
                    <p className="text-3xl font-bold text-red-600">${fmt(totalOverdue)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">{overduePayments.length} overdue payment{overduePayments.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {overduePayments.length === 0 ? (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-400" />
                <p className="font-medium text-lg">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">No overdue payments at this time.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="text-lg">Overdue Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overduePayments.map((p) => {
                    const booking = bookingMap.get(p.booking_id);
                    const days = daysOverdue(p.due_date);
                    return (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 p-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 flex-col items-center justify-center rounded-lg bg-red-500 text-white">
                            <span className="text-lg font-bold leading-none">{days}</span>
                            <span className="text-[9px] uppercase leading-none mt-0.5">days</span>
                          </div>
                          <div>
                            <p className="font-semibold">{booking?.renter_name ?? "Unknown"}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                              <span>{booking?.vehicle_label}</span>
                              <span className="text-red-500 font-medium">Due {fmtDate(p.due_date)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <p className="text-xl font-bold text-red-600">${fmt(p.amount)}</p>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50"
                              onClick={() => sendReminder(p.id)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send Reminder
                            </Button>
                            <Button
                              size="sm"
                              className="gap-1.5"
                              style={{ backgroundColor: "#2EBD6B" }}
                              onClick={() => markPaid(p.id)}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Mark Paid
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ============================================================= */}
      {/* Generate Schedule Dialog                                       */}
      {/* ============================================================= */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" style={{ color: "#2EBD6B" }} />
              Generate Payment Schedule
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Booking selection */}
            <div className="space-y-2">
              <Label>Select Booking</Label>
              <Select
                value={generateBookingId}
                onValueChange={(v) => {
                  setGenerateBookingId(v ?? "");
                  setGeneratePreview(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a long-term booking..." />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_BOOKINGS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.renter_name} — {b.vehicle_label} ({b.duration_days} days)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGenBooking && (
              <>
                {/* Total amount */}
                <div className="space-y-2">
                  <Label>Total Amount</Label>
                  <Input
                    value={`$${fmt(genTotalAmount)}`}
                    disabled
                    className="bg-slate-50 font-semibold"
                  />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Payment Frequency</Label>
                  <Select
                    value={generateFrequency}
                    onValueChange={(v) => {
                      if (v) setGenerateFrequency(v as "weekly" | "biweekly" | "monthly");
                      setGeneratePreview(null);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Bi-weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Installments */}
                <div className="space-y-2">
                  <Label>
                    Number of Installments{" "}
                    <span className="text-muted-foreground font-normal">
                      (auto: {autoInstallments})
                    </span>
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={52}
                    placeholder={String(autoInstallments)}
                    value={generateInstallments}
                    onChange={(e) => {
                      setGenerateInstallments(e.target.value);
                      setGeneratePreview(null);
                    }}
                  />
                </div>

                {/* First payment date */}
                <div className="space-y-2">
                  <Label>First Payment Date</Label>
                  <Input
                    type="date"
                    value={generateFirstDate}
                    onChange={(e) => {
                      setGenerateFirstDate(e.target.value);
                      setGeneratePreview(null);
                    }}
                  />
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={handlePreview}
                  disabled={!generateFirstDate}
                >
                  <Eye className="h-4 w-4" />
                  Preview Schedule
                </Button>

                {/* Preview table */}
                {generatePreview && (
                  <div className="rounded-lg border bg-slate-50 p-3 max-h-56 overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">#</TableHead>
                          <TableHead className="text-xs">Due Date</TableHead>
                          <TableHead className="text-xs text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {generatePreview.map((row) => (
                          <TableRow key={row.num}>
                            <TableCell className="text-xs py-2">{row.num}</TableCell>
                            <TableCell className="text-xs py-2">{fmtDate(row.date)}</TableCell>
                            <TableCell className="text-xs py-2 text-right font-semibold">
                              ${fmt(row.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!generatePreview}
              onClick={handleConfirmGenerate}
              style={{ backgroundColor: "#2EBD6B" }}
            >
              Confirm &amp; Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
