"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type {
  Booking,
  BookingStatus,
  Vehicle,
  PaymentScheduleItem,
  RentalAgreement,
} from "@/lib/types";
import {
  ArrowLeft,
  Check,
  X,
  Send,
  Bell,
  Printer,
  Ban,
  Link2,
  FileText,
  CreditCard,
  Calendar,
  Clock,
  User,
  Car,
  Phone,
  Mail,
  IdCard,
  DollarSign,
  MapPin,
  StickyNote,
  Plus,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Circle,
  PenLine,
} from "lucide-react";

// ── Status Flow Config ──────────────────────────────────────────────

const STATUS_STEPS: BookingStatus[] = [
  "inquiry",
  "pending",
  "confirmed",
  "active",
  "completed",
];

const STATUS_LABELS: Record<BookingStatus, string> = {
  inquiry: "Inquiry",
  pending: "Pending",
  confirmed: "Confirmed",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
};

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  inquiry: ["pending", "cancelled"],
  pending: ["confirmed", "cancelled"],
  confirmed: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const TRANSITION_DESCRIPTIONS: Record<string, string> = {
  "inquiry→pending": "Mark as reviewed and move to pending approval.",
  "pending→confirmed": "Confirm booking after deposit/payment received.",
  "confirmed→active": "Vehicle picked up — rental is now active.",
  "active→completed": "Vehicle returned — rental complete.",
};

const statusBadgeColors: Record<BookingStatus, string> = {
  inquiry: "bg-purple-100 text-purple-700 border-purple-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

// ── Sample Data ─────────────────────────────────────────────────────

const SAMPLE_VEHICLE: Vehicle = {
  id: "veh-001",
  operator_id: "op-001",
  make: "Toyota",
  model: "Camry",
  year: 2024,
  color: "Pearl White",
  plate: "PCR-2024",
  vin: "1HGCM82633A123456",
  daily_rate: 65,
  weekly_rate: 400,
  monthly_rate: 1500,
  mileage: 12450,
  fuel_level: "full",
  category: "sedan",
  purchase_price: 28000,
  monthly_cost: 450,
  minimum_rental_days: 3,
  status: "active",
  photo_url: null,
  location_id: "loc-001",
  created_at: "2024-01-15T10:00:00Z",
  updated_at: "2026-03-28T14:00:00Z",
};

const SAMPLE_BOOKING: Booking = {
  id: "bk-a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  operator_id: "op-001",
  vehicle_id: "veh-001",
  renter_id: "rnt-001",
  renter_name: "Marcus Johnson",
  renter_phone: "+1 (404) 555-0192",
  renter_email: "marcus.johnson@email.com",
  start_date: "2026-04-01",
  end_date: "2026-04-14",
  duration_days: 14,
  daily_rate: 65,
  total_price: 860,
  tax_amount: 68.8,
  discount_amount: 50,
  deposit_amount: 300,
  deposit_status: "held",
  deposit_payment_intent_id: null,
  stripe_payment_intent_id: null,
  status: "confirmed",
  notes: "Returning renter — 3rd booking. Prefers early morning pickup. Uber driver, needs vehicle for rideshare.",
  pickup_instructions: "Meet at the office parking lot, Lot B, Space 14. Bring valid driver's license and proof of insurance.",
  drivers_license_url: "https://example.com/dl/marcus-johnson.pdf",
  location_id: "loc-001",
  dropoff_location_id: null,
  promo_code_id: null,
  mileage_out: null,
  mileage_in: null,
  fuel_out: null,
  fuel_in: null,
  created_at: "2026-03-25T09:30:00Z",
  updated_at: "2026-03-28T16:45:00Z",
};

const SAMPLE_AGREEMENT: RentalAgreement = {
  id: "agr-001",
  operator_id: "op-001",
  booking_id: SAMPLE_BOOKING.id,
  template_id: "tpl-001",
  content:
    "RENTAL AGREEMENT\n\nThis Rental Agreement is entered into between PCR Fleet Management (\"Owner\") and Marcus Johnson (\"Renter\") on March 28, 2026.\n\nVEHICLE: 2024 Toyota Camry — Plate: PCR-2024\nRENTAL PERIOD: April 1, 2026 to April 14, 2026 (14 days)\nDAILY RATE: $65.00\nTOTAL: $860.00 (after $50 discount)\nSECURITY DEPOSIT: $300.00\n\nTERMS:\n1. Renter agrees to maintain the vehicle in good condition.\n2. Renter is responsible for fuel, tolls, and traffic violations.\n3. Vehicle may be used for rideshare (Uber/Lyft) purposes.\n4. Maximum mileage: Unlimited.\n5. Late return fee: $85/day after the agreed return date.\n6. Renter must return vehicle with the same fuel level.\n\nSigned electronically via PCR Portal.",
  status: "signed",
  renter_signature: "Marcus Johnson",
  signed_at: "2026-03-28T14:30:00Z",
  created_at: "2026-03-28T10:00:00Z",
  updated_at: "2026-03-28T14:30:00Z",
};

const SAMPLE_PAYMENTS: PaymentScheduleItem[] = [
  {
    id: "pay-001",
    booking_id: SAMPLE_BOOKING.id,
    operator_id: "op-001",
    amount: 300,
    due_date: "2026-03-28",
    status: "paid",
    stripe_payment_intent_id: null,
    paid_at: "2026-03-28T14:00:00Z",
    created_at: "2026-03-25T09:30:00Z",
  },
  {
    id: "pay-002",
    booking_id: SAMPLE_BOOKING.id,
    operator_id: "op-001",
    amount: 430,
    due_date: "2026-04-01",
    status: "paid",
    stripe_payment_intent_id: null,
    paid_at: "2026-04-01T08:15:00Z",
    created_at: "2026-03-25T09:30:00Z",
  },
  {
    id: "pay-003",
    booking_id: SAMPLE_BOOKING.id,
    operator_id: "op-001",
    amount: 430,
    due_date: "2026-04-08",
    status: "pending",
    stripe_payment_intent_id: null,
    paid_at: null,
    created_at: "2026-03-25T09:30:00Z",
  },
];

interface ActivityEvent {
  id: string;
  type: "status" | "payment" | "agreement" | "note" | "system";
  title: string;
  description: string;
  timestamp: string;
  icon: "status" | "payment" | "agreement" | "note" | "system";
}

const SAMPLE_ACTIVITY: ActivityEvent[] = [
  {
    id: "act-001",
    type: "status",
    title: "Booking Created",
    description: "New inquiry submitted by Marcus Johnson via portal.",
    timestamp: "2026-03-25T09:30:00Z",
    icon: "status",
  },
  {
    id: "act-002",
    type: "status",
    title: "Status → Pending",
    description: "Operator reviewed inquiry and moved to pending.",
    timestamp: "2026-03-25T10:15:00Z",
    icon: "status",
  },
  {
    id: "act-003",
    type: "note",
    title: "Note Added",
    description: "Returning renter — 3rd booking. Verified license on file.",
    timestamp: "2026-03-25T10:20:00Z",
    icon: "note",
  },
  {
    id: "act-004",
    type: "agreement",
    title: "Agreement Generated",
    description: "Rental agreement created from default template.",
    timestamp: "2026-03-28T10:00:00Z",
    icon: "agreement",
  },
  {
    id: "act-005",
    type: "agreement",
    title: "Agreement Signed",
    description: "Marcus Johnson signed the rental agreement via portal.",
    timestamp: "2026-03-28T14:30:00Z",
    icon: "agreement",
  },
  {
    id: "act-006",
    type: "payment",
    title: "Deposit Received",
    description: "$300.00 security deposit collected — Zelle.",
    timestamp: "2026-03-28T14:00:00Z",
    icon: "payment",
  },
  {
    id: "act-007",
    type: "status",
    title: "Status → Confirmed",
    description: "Booking confirmed after deposit and signed agreement.",
    timestamp: "2026-03-28T16:45:00Z",
    icon: "status",
  },
  {
    id: "act-008",
    type: "payment",
    title: "Week 1 Payment Received",
    description: "$430.00 received — Cash App.",
    timestamp: "2026-04-01T08:15:00Z",
    icon: "payment",
  },
];

// ── Helper Functions ────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Component ───────────────────────────────────────────────────────

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  // State
  const [booking, setBooking] = useState<Booking>(SAMPLE_BOOKING);
  const [vehicle] = useState<Vehicle>(SAMPLE_VEHICLE);
  const [agreement, setAgreement] = useState<RentalAgreement | null>(SAMPLE_AGREEMENT);
  const [payments, setPayments] = useState<PaymentScheduleItem[]>(SAMPLE_PAYMENTS);
  const [activity, setActivity] = useState<ActivityEvent[]>(SAMPLE_ACTIVITY);
  const [notes, setNotes] = useState(SAMPLE_BOOKING.notes || "");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // Dialogs
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    targetStatus: BookingStatus | null;
  }>({ open: false, targetStatus: null });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNote, setPaymentNote] = useState("");

  // Toast
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3000);
  }, []);

  // ── Status Transitions ──────────────────────────────────────────

  const currentStepIndex = STATUS_STEPS.indexOf(booking.status);
  const isCancelled = booking.status === "cancelled";

  function canTransitionTo(target: BookingStatus): boolean {
    return VALID_TRANSITIONS[booking.status]?.includes(target) ?? false;
  }

  function handleStepClick(step: BookingStatus) {
    if (step === booking.status || isCancelled) return;
    if (!canTransitionTo(step)) return;
    if (step === "cancelled") {
      setCancelDialog(true);
    } else {
      setStatusDialog({ open: true, targetStatus: step });
    }
  }

  function confirmStatusChange() {
    if (!statusDialog.targetStatus) return;
    const target = statusDialog.targetStatus;
    const now = new Date().toISOString();

    setBooking((prev) => ({ ...prev, status: target, updated_at: now }));
    setActivity((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        type: "status",
        title: `Status → ${STATUS_LABELS[target]}`,
        description: `Booking status changed to ${STATUS_LABELS[target]}.`,
        timestamp: now,
        icon: "status",
      },
    ]);
    setStatusDialog({ open: false, targetStatus: null });
    showToast(`Booking status updated to ${STATUS_LABELS[target]}`);
  }

  function confirmCancel() {
    if (!cancelReason.trim()) return;
    const now = new Date().toISOString();

    setBooking((prev) => ({
      ...prev,
      status: "cancelled" as BookingStatus,
      updated_at: now,
    }));
    setActivity((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        type: "status",
        title: "Booking Cancelled",
        description: `Reason: ${cancelReason}`,
        timestamp: now,
        icon: "status",
      },
    ]);
    setCancelDialog(false);
    setCancelReason("");
    showToast("Booking has been cancelled");
  }

  // ── Payments ────────────────────────────────────────────────────

  function recordPayment() {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    const now = new Date().toISOString();

    const newPayment: PaymentScheduleItem = {
      id: `pay-${Date.now()}`,
      booking_id: booking.id,
      operator_id: booking.operator_id,
      amount,
      due_date: now.split("T")[0],
      status: "paid",
      stripe_payment_intent_id: null,
      paid_at: now,
      created_at: now,
    };
    setPayments((prev) => [...prev, newPayment]);
    setActivity((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        type: "payment",
        title: "Payment Recorded",
        description: `${formatCurrency(amount)} received — ${paymentMethod}${paymentNote ? `. ${paymentNote}` : ""}`,
        timestamp: now,
        icon: "payment",
      },
    ]);
    setPaymentDialog(false);
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentNote("");
    showToast(`Payment of ${formatCurrency(amount)} recorded`);
  }

  // ── Agreement ───────────────────────────────────────────────────

  function generateAgreement() {
    const now = new Date().toISOString();
    const newAgreement: RentalAgreement = {
      id: `agr-${Date.now()}`,
      operator_id: booking.operator_id,
      booking_id: booking.id,
      template_id: null,
      content: `RENTAL AGREEMENT\n\nGenerated on ${formatDate(now)}\n\nRenter: ${booking.renter_name}\nVehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}\nPeriod: ${formatDate(booking.start_date)} — ${formatDate(booking.end_date)}\nRate: ${formatCurrency(booking.daily_rate)}/day\nTotal: ${formatCurrency(booking.total_price)}`,
      status: "draft",
      renter_signature: null,
      signed_at: null,
      created_at: now,
      updated_at: now,
    };
    setAgreement(newAgreement);
    setActivity((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        type: "agreement",
        title: "Agreement Generated",
        description: "New rental agreement draft created.",
        timestamp: now,
        icon: "agreement",
      },
    ]);
    showToast("Rental agreement generated");
  }

  function saveNotes() {
    const now = new Date().toISOString();
    setBooking((prev) => ({ ...prev, notes, updated_at: now }));
    setActivity((prev) => [
      ...prev,
      {
        id: `act-${Date.now()}`,
        type: "note",
        title: "Notes Updated",
        description: notes,
        timestamp: now,
        icon: "note",
      },
    ]);
    setIsEditingNotes(false);
    showToast("Notes saved");
  }

  // ── Computed Values ─────────────────────────────────────────────

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalDue = booking.total_price + booking.tax_amount - booking.discount_amount;
  const remaining = totalDue - totalPaid;

  // Next valid forward transition
  const nextStep =
    !isCancelled && currentStepIndex < STATUS_STEPS.length - 1
      ? STATUS_STEPS[currentStepIndex + 1]
      : null;

  // ── Render ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Toast */}
      {toast.visible && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-2 bg-[#2EBD6B] text-white px-5 py-3 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="h-4 w-4" />
          {toast.message}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard/bookings">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 truncate">
                {booking.renter_name}
              </h1>
              <Badge
                variant="outline"
                className={`${statusBadgeColors[booking.status]} font-semibold text-xs uppercase tracking-wide`}
              >
                {STATUS_LABELS[booking.status]}
              </Badge>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Booking #{id.slice(0, 8)} &middot; Created{" "}
              {formatDate(booking.created_at)}
            </p>
          </div>
        </div>

        {/* ── Status Flow Bar ────────────────────────────────────── */}
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-6 px-4 sm:px-8">
            {isCancelled ? (
              <div className="flex items-center justify-center gap-3 py-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                  <X className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold text-red-700 text-lg">
                    Booking Cancelled
                  </p>
                  <p className="text-sm text-slate-500">
                    This booking was cancelled and cannot be modified.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                {STATUS_STEPS.map((step, index) => {
                  const isPast = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isFuture = index > currentStepIndex;
                  const isClickable = canTransitionTo(step);

                  return (
                    <div key={step} className="flex items-center flex-1 last:flex-none">
                      <button
                        type="button"
                        onClick={() => handleStepClick(step)}
                        disabled={!isClickable}
                        className={`flex flex-col items-center gap-2 group relative ${
                          isClickable ? "cursor-pointer" : "cursor-default"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                            isPast
                              ? "bg-[#2EBD6B] border-[#2EBD6B]"
                              : isCurrent
                                ? "bg-[#2EBD6B] border-[#2EBD6B] ring-4 ring-[#2EBD6B]/20"
                                : isClickable
                                  ? "border-[#2EBD6B]/40 bg-[#2EBD6B]/5 group-hover:border-[#2EBD6B] group-hover:bg-[#2EBD6B]/10"
                                  : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          {isPast ? (
                            <Check className="h-5 w-5 text-white" />
                          ) : isCurrent ? (
                            <Circle className="h-3 w-3 fill-white text-white" />
                          ) : (
                            <span
                              className={`text-xs font-bold ${
                                isClickable
                                  ? "text-[#2EBD6B]/60 group-hover:text-[#2EBD6B]"
                                  : "text-slate-300"
                              }`}
                            >
                              {index + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isPast || isCurrent
                              ? "text-slate-900"
                              : "text-slate-400"
                          }`}
                        >
                          {STATUS_LABELS[step]}
                        </span>
                        {isClickable && (
                          <span className="absolute -bottom-5 text-[10px] text-[#2EBD6B] font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                            Click to advance
                          </span>
                        )}
                      </button>
                      {index < STATUS_STEPS.length - 1 && (
                        <div className="flex-1 mx-2">
                          <div
                            className={`h-0.5 rounded ${
                              index < currentStepIndex
                                ? "bg-[#2EBD6B]"
                                : "bg-slate-200"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Main Content Grid ──────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Tabs — 3 cols */}
          <div className="lg:col-span-3">
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList className="bg-white border shadow-sm">
                <TabsTrigger value="details">Booking Details</TabsTrigger>
                <TabsTrigger value="agreement">Agreement</TabsTrigger>
                <TabsTrigger value="payments">Payments</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              {/* ── Details Tab ─────────────────────────────────── */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Renter Info */}
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <User className="h-4 w-4 text-[#2EBD6B]" />
                        Renter Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#2EBD6B]/10 flex items-center justify-center">
                          <span className="text-[#2EBD6B] font-bold text-sm">
                            {booking.renter_name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {booking.renter_name}
                          </p>
                          <p className="text-xs text-slate-500">
                            Returning Customer
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{booking.renter_phone || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{booking.renter_email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <IdCard className="h-3.5 w-3.5 text-slate-400" />
                          {booking.drivers_license_url ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                Verified
                              </Badge>
                              <a
                                href={booking.drivers_license_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#2EBD6B] text-xs hover:underline"
                              >
                                View License
                              </a>
                            </div>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                              Not Uploaded
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Vehicle Info */}
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Car className="h-4 w-4 text-[#2EBD6B]" />
                        Vehicle
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <Car className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </p>
                          <p className="text-xs text-slate-500">
                            {vehicle.color} &middot; {vehicle.category}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-2 gap-y-2.5">
                        <div>
                          <p className="text-xs text-slate-400">Plate</p>
                          <p className="font-medium text-slate-700">
                            {vehicle.plate || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">VIN</p>
                          <p className="font-medium text-slate-700 text-xs">
                            {vehicle.vin?.slice(-6) || "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Daily Rate</p>
                          <p className="font-semibold text-[#2EBD6B]">
                            {formatCurrency(vehicle.daily_rate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Mileage</p>
                          <p className="font-medium text-slate-700">
                            {vehicle.mileage.toLocaleString()} mi
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Dates & Duration */}
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-[#2EBD6B]" />
                        Rental Period
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-400">Start Date</p>
                          <p className="font-semibold text-slate-900">
                            {formatDate(booking.start_date)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">End Date</p>
                          <p className="font-semibold text-slate-900">
                            {formatDate(booking.end_date)}
                          </p>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-2.5">
                        <Clock className="h-4 w-4 text-[#2EBD6B]" />
                        <span className="font-bold text-lg text-slate-900">
                          {booking.duration_days} days
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Pricing Summary */}
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-[#2EBD6B]" />
                        Pricing
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          {booking.duration_days} days &times;{" "}
                          {formatCurrency(booking.daily_rate)}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(
                            booking.duration_days * booking.daily_rate
                          )}
                        </span>
                      </div>
                      {booking.discount_amount > 0 && (
                        <div className="flex justify-between text-[#2EBD6B]">
                          <span>Discount</span>
                          <span>-{formatCurrency(booking.discount_amount)}</span>
                        </div>
                      )}
                      {booking.tax_amount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Tax</span>
                          <span className="font-medium">
                            {formatCurrency(booking.tax_amount)}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-900">
                          Total
                        </span>
                        <span className="text-xl font-bold text-[#2EBD6B]">
                          {formatCurrency(totalDue)}
                        </span>
                      </div>
                      {booking.deposit_amount > 0 && (
                        <>
                          <Separator />
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">
                              Security Deposit
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {formatCurrency(booking.deposit_amount)}
                              </span>
                              <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs capitalize">
                                {booking.deposit_status}
                              </Badge>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Pickup Instructions */}
                {booking.pickup_instructions && (
                  <Card className="border-0 bg-white shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#2EBD6B]" />
                        Pickup Instructions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {booking.pickup_instructions}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Notes */}
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <StickyNote className="h-4 w-4 text-[#2EBD6B]" />
                        Notes
                      </CardTitle>
                      {!isEditingNotes && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsEditingNotes(true)}
                          className="text-slate-500 hover:text-slate-700"
                        >
                          <PenLine className="h-3.5 w-3.5 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isEditingNotes ? (
                      <div className="space-y-3">
                        <Textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                          className="resize-none"
                          placeholder="Add notes about this booking..."
                        />
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setNotes(booking.notes || "");
                              setIsEditingNotes(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={saveNotes}
                            className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                          >
                            Save Notes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-600 leading-relaxed">
                        {booking.notes || (
                          <span className="text-slate-400 italic">
                            No notes yet
                          </span>
                        )}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Agreement Tab ───────────────────────────────── */}
              <TabsContent value="agreement" className="space-y-4">
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#2EBD6B]" />
                        Rental Agreement
                      </CardTitle>
                      {agreement && (
                        <Badge
                          className={
                            agreement.status === "signed"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : agreement.status === "sent"
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                          }
                        >
                          {agreement.status === "signed"
                            ? "Signed"
                            : agreement.status === "sent"
                              ? "Sent — Awaiting Signature"
                              : "Draft"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!agreement ? (
                      <div className="text-center py-10">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 mb-1">
                          No agreement generated yet
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                          Create an agreement from the default template
                        </p>
                        <Button
                          onClick={generateAgreement}
                          className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Generate Agreement
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                          <pre className="whitespace-pre-wrap text-sm text-slate-700 font-mono leading-relaxed">
                            {agreement.content}
                          </pre>
                        </div>
                        {agreement.renter_signature && (
                          <>
                            <Separator />
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-xs text-slate-400 mb-1">
                                  Signed by
                                </p>
                                <p className="text-lg font-serif italic text-slate-800">
                                  {agreement.renter_signature}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-slate-400 mb-1">
                                  Signed on
                                </p>
                                <p className="text-sm font-medium text-slate-700">
                                  {agreement.signed_at
                                    ? formatDateTime(agreement.signed_at)
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                        {agreement.status === "draft" && (
                          <div className="flex gap-2">
                            <Button
                              className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                              onClick={() => {
                                setAgreement((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        status: "sent",
                                        updated_at: new Date().toISOString(),
                                      }
                                    : prev
                                );
                                showToast("Agreement sent to renter");
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send to Renter
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Payments Tab ────────────────────────────────── */}
              <TabsContent value="payments" className="space-y-4">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="border-0 bg-white shadow-sm">
                    <CardContent className="pt-5 pb-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        Total Due
                      </p>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {formatCurrency(totalDue)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-white shadow-sm">
                    <CardContent className="pt-5 pb-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        Paid
                      </p>
                      <p className="text-2xl font-bold text-[#2EBD6B] mt-1">
                        {formatCurrency(totalPaid)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-white shadow-sm">
                    <CardContent className="pt-5 pb-4">
                      <p className="text-xs text-slate-400 uppercase tracking-wide">
                        Remaining
                      </p>
                      <p
                        className={`text-2xl font-bold mt-1 ${
                          remaining > 0 ? "text-amber-600" : "text-slate-400"
                        }`}
                      >
                        {formatCurrency(Math.max(remaining, 0))}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Schedule */}
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-[#2EBD6B]" />
                        Payment Schedule
                      </CardTitle>
                      <Button
                        size="sm"
                        onClick={() => setPaymentDialog(true)}
                        className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Record Payment
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                p.status === "paid"
                                  ? "bg-[#2EBD6B]/10"
                                  : p.status === "overdue"
                                    ? "bg-red-50"
                                    : "bg-slate-100"
                              }`}
                            >
                              {p.status === "paid" ? (
                                <Check className="h-4 w-4 text-[#2EBD6B]" />
                              ) : p.status === "overdue" ? (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Clock className="h-4 w-4 text-slate-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 text-sm">
                                {formatCurrency(p.amount)}
                              </p>
                              <p className="text-xs text-slate-400">
                                Due {formatDate(p.due_date)}
                                {p.paid_at &&
                                  ` · Paid ${formatDate(p.paid_at)}`}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              p.status === "paid"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : p.status === "overdue"
                                  ? "bg-red-50 text-red-700 border-red-200"
                                  : "bg-slate-50 text-slate-600 border-slate-200"
                            }
                          >
                            {p.status}
                          </Badge>
                        </div>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-5">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>Payment Progress</span>
                        <span>
                          {totalDue > 0
                            ? Math.min(
                                Math.round((totalPaid / totalDue) * 100),
                                100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#2EBD6B] rounded-full transition-all duration-500"
                          style={{
                            width: `${totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Activity Tab ────────────────────────────────── */}
              <TabsContent value="activity" className="space-y-4">
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200" />
                      <div className="space-y-6">
                        {[...activity]
                          .sort(
                            (a, b) =>
                              new Date(b.timestamp).getTime() -
                              new Date(a.timestamp).getTime()
                          )
                          .map((event) => (
                            <div
                              key={event.id}
                              className="relative flex items-start gap-4 pl-0"
                            >
                              <div
                                className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  event.type === "status"
                                    ? "bg-blue-100"
                                    : event.type === "payment"
                                      ? "bg-emerald-100"
                                      : event.type === "agreement"
                                        ? "bg-purple-100"
                                        : event.type === "note"
                                          ? "bg-amber-100"
                                          : "bg-slate-100"
                                }`}
                              >
                                {event.type === "status" && (
                                  <ChevronRight className="h-3.5 w-3.5 text-blue-600" />
                                )}
                                {event.type === "payment" && (
                                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                                )}
                                {event.type === "agreement" && (
                                  <FileText className="h-3.5 w-3.5 text-purple-600" />
                                )}
                                {event.type === "note" && (
                                  <StickyNote className="h-3.5 w-3.5 text-amber-600" />
                                )}
                                {event.type === "system" && (
                                  <Bell className="h-3.5 w-3.5 text-slate-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {event.title}
                                </p>
                                <p className="text-sm text-slate-500 mt-0.5">
                                  {event.description}
                                </p>
                                <p className="text-xs text-slate-400 mt-1">
                                  {formatDateTime(event.timestamp)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* ── Right Sidebar: Actions ───────────────────────────── */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Actions */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {nextStep && !isCancelled && (
                  <Button
                    className="w-full bg-[#2EBD6B] hover:bg-[#27a85e] text-white justify-start"
                    onClick={() => handleStepClick(nextStep)}
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    {nextStep === "pending" && "Move to Pending"}
                    {nextStep === "confirmed" && "Confirm Booking"}
                    {nextStep === "active" && "Mark as Active"}
                    {nextStep === "completed" && "Mark as Completed"}
                  </Button>
                )}

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/portal/${booking.id}`
                    );
                    showToast("Portal link copied to clipboard");
                  }}
                >
                  <Link2 className="h-4 w-4 mr-2 text-slate-500" />
                  Send Portal Link
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => showToast("Reminder sent to renter")}
                >
                  <Bell className="h-4 w-4 mr-2 text-slate-500" />
                  Send Reminder
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => showToast("Preparing agreement for print...")}
                >
                  <Printer className="h-4 w-4 mr-2 text-slate-500" />
                  Print Agreement
                </Button>

                <Separator className="my-2" />

                {!isCancelled && booking.status !== "completed" && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setCancelDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Booking Snapshot */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vehicle</span>
                  <span className="font-medium text-slate-700">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Duration</span>
                  <span className="font-medium text-slate-700">
                    {booking.duration_days} days
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Rate</span>
                  <span className="font-medium text-slate-700">
                    {formatCurrency(booking.daily_rate)}/day
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-slate-400">Paid</span>
                  <span className="font-semibold text-[#2EBD6B]">
                    {formatCurrency(totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Remaining</span>
                  <span
                    className={`font-semibold ${remaining > 0 ? "text-amber-600" : "text-slate-400"}`}
                  >
                    {formatCurrency(Math.max(remaining, 0))}
                  </span>
                </div>
                {/* Payment bar mini */}
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2EBD6B] rounded-full"
                    style={{
                      width: `${totalDue > 0 ? Math.min((totalPaid / totalDue) * 100, 100) : 0}%`,
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Status Transition Dialog ───────────────────────────────── */}
      <Dialog
        open={statusDialog.open}
        onOpenChange={(open) => {
          if (!open) setStatusDialog({ open: false, targetStatus: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {statusDialog.targetStatus &&
                TRANSITION_DESCRIPTIONS[
                  `${booking.status}→${statusDialog.targetStatus}`
                ]}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center gap-3 py-4">
            <Badge
              variant="outline"
              className={`${statusBadgeColors[booking.status]} text-sm`}
            >
              {STATUS_LABELS[booking.status]}
            </Badge>
            <ChevronRight className="h-4 w-4 text-slate-400" />
            {statusDialog.targetStatus && (
              <Badge
                variant="outline"
                className={`${statusBadgeColors[statusDialog.targetStatus]} text-sm`}
              >
                {STATUS_LABELS[statusDialog.targetStatus]}
              </Badge>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="ghost"
              onClick={() =>
                setStatusDialog({ open: false, targetStatus: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={confirmStatusChange}
              className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Cancel Dialog ──────────────────────────────────────────── */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600">Cancel Booking</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Please provide a reason for
              cancellation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="cancel-reason">Reason *</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g., Renter requested cancellation, no-show, failed payment..."
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setCancelDialog(false)}>
              Go Back
            </Button>
            <Button
              variant="destructive"
              onClick={confirmCancel}
              disabled={!cancelReason.trim()}
            >
              <Ban className="h-4 w-4 mr-1" />
              Cancel Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Record Payment Dialog ──────────────────────────────────── */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Enter the payment details received from the renter.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="pay-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-method">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(val) => { if (val) setPaymentMethod(val); }}>
                <SelectTrigger id="pay-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                  <SelectItem value="cashapp">Cash App</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="card">Credit/Debit Card</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-note">Note (optional)</Label>
              <Input
                id="pay-note"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., Week 2 payment"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setPaymentDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={recordPayment}
              disabled={!paymentAmount || parseFloat(paymentAmount) <= 0}
              className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
            >
              <Check className="h-4 w-4 mr-1" />
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
