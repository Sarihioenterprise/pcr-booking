"use client";

import { use, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SMSButton } from "@/components/dashboard/sms-button";
import { AddonsBreakdown } from "@/components/dashboard/addons-breakdown";
import { DepositCard } from "@/components/dashboard/deposit-card";
import { RequestPaymentModal } from "@/components/dashboard/request-payment-modal";
import { createClient } from "@/lib/supabase/client";
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
  Operator,
  Vehicle,
  PaymentScheduleItem,
  RentalAgreement,
  Inspection,
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
  Loader2,
  RefreshCw,
  Eye,
  Monitor,
  Copy,
  ClipboardCheck,
  Gauge,
  Fuel,
  Camera,
} from "lucide-react";

// ── License Viewer Component ──────────────────────────────────────────

function LicenseViewer({
  bookingLicenseUrl,
  renterLicenseUrl,
}: {
  bookingLicenseUrl: string | null;
  renterLicenseUrl: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Prefer booking-level license, fall back to renter-level
  const licensePath = bookingLicenseUrl || renterLicenseUrl;

  if (!licensePath) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
        Not Uploaded
      </Badge>
    );
  }

  // If it's an external HTTP URL (old behavior), link directly
  const isExternalUrl = licensePath.startsWith("http://") || licensePath.startsWith("https://");

  async function viewLicense() {
    if (!licensePath) return;
    if (isExternalUrl) {
      window.open(licensePath, "_blank", "noopener,noreferrer");
      return;
    }
    // Private storage — request a signed URL
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/license/signed-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: licensePath }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate link");
      } else {
        window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setError("Failed to generate link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
        {bookingLicenseUrl ? "Verified" : "On File"}
      </Badge>
      <button
        onClick={viewLicense}
        disabled={loading}
        className="text-[#2EBD6B] text-xs hover:underline disabled:opacity-50"
      >
        {loading ? "Generating link..." : "View License"}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}

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

// ── Activity Event type ─────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  type: "status" | "payment" | "agreement" | "note" | "system";
  title: string;
  description: string;
  timestamp: string;
  icon: "status" | "payment" | "agreement" | "note" | "system";
}

// ── BookingInspectionsPanel ────────────────────────────────────────

function InspectionCard({
  inspection,
  label,
}: {
  inspection: Inspection;
  label: string;
}) {
  const checklist = inspection.checklist || {};
  const checklistItems = [
    { key: "exterior_clean", label: "Exterior Clean" },
    { key: "interior_clean", label: "Interior Clean" },
    { key: "tires_ok", label: "Tires OK" },
    { key: "lights_working", label: "Lights Working" },
    { key: "brakes_ok", label: "Brakes OK" },
    { key: "windshield_ok", label: "Windshield OK" },
    { key: "mirrors_ok", label: "Mirrors OK" },
    { key: "ac_working", label: "A/C Working" },
  ] as const;

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4 text-[#2EBD6B]" />
          {label}
          <Badge className={`ml-auto text-xs ${
            inspection.status === "completed"
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            {inspection.status === "completed" ? "Completed" : "Pending"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm">
            <Gauge className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Odometer:</span>
            <span className="font-semibold">
              {inspection.mileage != null ? `${inspection.mileage.toLocaleString()} mi` : "—"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Fuel className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Fuel:</span>
            <span className="font-semibold">{inspection.fuel_level || "—"}</span>
          </div>
        </div>
        {inspection.notes && (
          <p className="text-xs text-gray-600 bg-gray-50 rounded p-2">{inspection.notes}</p>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {checklistItems.map(({ key, label: itemLabel }) => {
            const val = (checklist as unknown as Record<string, boolean>)[key];
            return (
              <div key={key} className="flex items-center gap-1.5 text-xs">
                {val ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                )}
                <span className={val ? "text-gray-700" : "text-amber-700 font-medium"}>
                  {itemLabel}
                </span>
              </div>
            );
          })}
        </div>
        {Array.isArray(inspection.signed_photo_urls) && inspection.signed_photo_urls.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {inspection.signed_photo_urls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`Photo ${i + 1}`}
                  className="h-16 w-16 rounded object-cover border border-gray-200 hover:opacity-80 transition-opacity"
                />
              </a>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BookingInspectionsPanel({
  bookingId,
  vehicleId,
  inspections,
  operator,
  onInspectionCreated,
}: {
  bookingId: string;
  vehicleId: string;
  inspections: Inspection[];
  operator: Operator | null;
  onInspectionCreated: () => void;
}) {
  const pickup = inspections.find((i) => i.type === "pre_rental");
  const returning = inspections.find((i) => i.type === "post_rental");

  // Miles driven + overage
  const milesDriven =
    pickup?.mileage != null && returning?.mileage != null
      ? returning.mileage - pickup.mileage
      : null;

  const includedMiles =
    operator?.included_miles_per_day != null ? operator.included_miles_per_day : null;
  const overageRate =
    operator?.overage_rate_per_mile != null ? operator.overage_rate_per_mile : null;

  // We don't have booking duration here — overage is informational summary
  // The new inspection page handles this on creation.

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Camera className="h-4 w-4 text-[#2EBD6B]" />
          Vehicle Inspections
        </h3>
        <Link href={`/dashboard/inspections/new?booking_id=${bookingId}&vehicle_id=${vehicleId}`}>
          <Button size="sm" variant="outline" className="text-xs h-7 px-3">
            <Plus className="h-3 w-3 mr-1" />
            New Inspection
          </Button>
        </Link>
      </div>

      {inspections.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-10 text-center">
            <ClipboardCheck className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500 mb-1">No inspections recorded yet.</p>
            <p className="text-xs text-gray-400">
              Record a pickup inspection before the rental starts, and a return inspection when
              the vehicle comes back.
            </p>
            <Link
              href={`/dashboard/inspections/new?booking_id=${bookingId}&vehicle_id=${vehicleId}&type=pre_rental`}
              className="mt-4 inline-block"
            >
              <Button size="sm" className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Record Pickup Inspection
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {pickup ? (
            <InspectionCard inspection={pickup} label="Pickup Inspection" />
          ) : (
            <Card className="border-0 bg-white shadow-sm border-dashed border-gray-200">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No pickup inspection</p>
                <Link
                  href={`/dashboard/inspections/new?booking_id=${bookingId}&vehicle_id=${vehicleId}&type=pre_rental`}
                >
                  <Button size="sm" variant="outline" className="text-xs">
                    Record Pickup
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
          {returning ? (
            <InspectionCard inspection={returning} label="Return Inspection" />
          ) : (
            <Card className="border-0 bg-white shadow-sm">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-gray-400 mb-3">No return inspection</p>
                <Link
                  href={`/dashboard/inspections/new?booking_id=${bookingId}&vehicle_id=${vehicleId}&type=post_rental`}
                >
                  <Button size="sm" variant="outline" className="text-xs">
                    Record Return
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Miles driven + overage summary */}
      {milesDriven !== null && (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-[#2EBD6B]" />
                <span className="text-sm font-semibold">Miles Driven</span>
              </div>
              <span className="text-lg font-bold">{milesDriven.toLocaleString()} mi</span>
            </div>
            {includedMiles != null && overageRate != null && (
              <div className="mt-2 text-xs text-gray-500">
                <span>Policy: {includedMiles} mi/day included @ ${overageRate}/mi overage.</span>
                {milesDriven > includedMiles && (
                  <span className="ml-2 text-amber-600 font-medium">
                    Overage: {(milesDriven - includedMiles).toLocaleString()} mi over — add to
                    deposit capture if applicable.
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State
  const [booking, setBooking] = useState<Booking | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [agreement, setAgreement] = useState<RentalAgreement | null>(null);
  const [payments, setPayments] = useState<PaymentScheduleItem[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [inspections, setInspections] = useState<Inspection[]>([]);

  // Dialogs
  const [statusDialog, setStatusDialog] = useState<{
    open: boolean;
    targetStatus: BookingStatus | null;
  }>({ open: false, targetStatus: null });
  const [cancelDialog, setCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(false);

  // No-show dialog state
  const [noShowDialog, setNoShowDialog] = useState(false);
  const [noShowReason, setNoShowReason] = useState("");
  const [noShowSendSms, setNoShowSendSms] = useState(false);
  const [noShowLoading, setNoShowLoading] = useState(false);
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

  // ── Fetch real booking data ─────────────────────────────────────
  useEffect(() => {
    async function fetchBooking() {
      try {
        setIsLoading(true);
        setLoadError(null);

        const response = await fetch(`/api/bookings/${id}`);

        if (response.status === 404) {
          router.push("/dashboard/bookings");
          return;
        }

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          setLoadError(data.error || "Failed to load booking");
          return;
        }

        const data = await response.json();

        setBooking(data);
        setNotes(data.notes || "");

        if (data.vehicles) {
          setVehicle(data.vehicles);
        }

        if (data.rental_agreements && data.rental_agreements.length > 0) {
          // Take the most recent agreement
          const sorted = [...data.rental_agreements].sort(
            (a: RentalAgreement, b: RentalAgreement) =>
              new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setAgreement(sorted[0]);
        }

        if (data.payment_schedule) {
          setPayments(data.payment_schedule);
        }

        // Build initial activity from booking data
        const events: ActivityEvent[] = [
          {
            id: "act-created",
            type: "status",
            title: "Booking Created",
            description: `Booking created for ${data.renter_name}.`,
            timestamp: data.created_at,
            icon: "status",
          },
        ];

        if (data.rental_agreements && data.rental_agreements.length > 0) {
          for (const agr of data.rental_agreements) {
            events.push({
              id: `act-agr-${agr.id}`,
              type: "agreement",
              title: agr.status === "signed" ? "Agreement Signed" : "Agreement Generated",
              description:
                agr.status === "signed"
                  ? `${data.renter_name} signed the rental agreement.`
                  : "Rental agreement created.",
              timestamp: agr.signed_at || agr.created_at,
              icon: "agreement",
            });
          }
        }

        setActivity(events);
      } catch (err) {
        console.error("Failed to fetch booking:", err);
        setLoadError("Failed to load booking. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBooking();
  }, [id, router]);

  // Load operator for DepositCard + mileage policy
  useEffect(() => {
    const supabase = createClient();
    async function loadOperator() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from("operators")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (data) setOperator(data as Operator);
      } catch { /* non-fatal */ }
    }
    loadOperator();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load inspections for this booking
  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    async function loadInspections() {
      try {
        const { data } = await supabase
          .from("inspections")
          .select("*")
          .eq("booking_id", id)
          .order("created_at", { ascending: true });
        if (data) setInspections(data as Inspection[]);
      } catch { /* inspections table may not exist — non-fatal */ }
    }
    loadInspections();
  }, [id]);

  // ── Status Transitions ──────────────────────────────────────────

  const currentStepIndex = booking ? STATUS_STEPS.indexOf(booking.status) : 0;
  const isCancelled = booking?.status === "cancelled";

  function canTransitionTo(target: BookingStatus): boolean {
    if (!booking) return false;
    return VALID_TRANSITIONS[booking.status]?.includes(target) ?? false;
  }

  function handleStepClick(step: BookingStatus) {
    if (!booking || step === booking.status || isCancelled) return;
    if (!canTransitionTo(step)) return;
    if (step === "cancelled") {
      setCancelDialog(true);
    } else {
      setStatusDialog({ open: true, targetStatus: step });
    }
  }

  async function confirmStatusChange() {
    if (!statusDialog.targetStatus || !booking) return;
    const target = statusDialog.targetStatus;
    const now = new Date().toISOString();

    // Optimistic update
    setBooking((prev) => prev ? { ...prev, status: target, updated_at: now } : prev);
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

    // Persist via API
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: target }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Status persist failed:", err);
        showToast("Warning: status may not have saved — please reload.");
      }
    } catch (e) {
      console.error("Status persist network error:", e);
      showToast("Warning: status may not have saved — please reload.");
    }
  }

  async function confirmCancel() {
    if (!cancelReason.trim() || !booking) return;
    const now = new Date().toISOString();

    // Optimistic update
    setBooking((prev) =>
      prev ? { ...prev, status: "cancelled" as BookingStatus, updated_at: now } : prev
    );
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

    // Persist via API
    try {
      const res = await fetch(`/api/bookings/${booking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled", cancel_reason: cancelReason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("Cancel persist failed:", err);
        showToast("Warning: cancellation may not have saved — please reload.");
      }
    } catch (e) {
      console.error("Cancel persist network error:", e);
      showToast("Warning: cancellation may not have saved — please reload.");
    }
  }

  // ── Payments ────────────────────────────────────────────────────

  function recordPayment() {
    if (!booking) return;
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
  const [agreementSending, setAgreementSending] = useState(false);
  const [agreementError, setAgreementError] = useState("");
  const [agreementCopied, setAgreementCopied] = useState(false);

  async function sendAgreement(resend = false) {
    if (!booking) return;
    setAgreementSending(true);
    setAgreementError("");
    try {
      const res = await fetch("/api/agreements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: booking.id, resend }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send agreement");

      const now = new Date().toISOString();
      // Refresh agreement from API call response
      setAgreement((prev) =>
        prev
          ? {
              ...prev,
              status: "sent",
              sign_token: data.sign_token || prev.sign_token,
              sent_at: now,
              updated_at: now,
            }
          : {
              id: data.agreement_id,
              operator_id: booking.operator_id,
              booking_id: booking.id,
              template_id: null,
              content: "",
              status: "sent",
              renter_signature: null,
              signed_at: null,
              sign_token: data.sign_token,
              sent_at: now,
              viewed_at: null,
              signer_ip: null,
              signer_ua: null,
              signature_png_b64: null,
              created_at: now,
              updated_at: now,
            }
      );
      setActivity((prev) => [
        ...prev,
        {
          id: `act-${Date.now()}`,
          type: "agreement",
          title: resend ? "Agreement Resent" : "Agreement Sent for Signature",
          description: `Email with signing link sent to ${booking.renter_email || booking.renter_name}.`,
          timestamp: now,
          icon: "agreement",
        },
      ]);
      showToast(resend ? "Agreement resent!" : "Agreement sent for signature!");
    } catch (err: unknown) {
      setAgreementError(
        err instanceof Error ? err.message : "Failed to send agreement"
      );
    } finally {
      setAgreementSending(false);
    }
  }

  function copySignLink() {
    if (!agreement?.sign_token) return;
    const url = `${window.location.origin}/sign/${agreement.sign_token}`;
    navigator.clipboard.writeText(url);
    setAgreementCopied(true);
    setTimeout(() => setAgreementCopied(false), 2000);
  }

  function saveNotes() {
    if (!booking) return;
    const now = new Date().toISOString();
    setBooking((prev) => prev ? { ...prev, notes, updated_at: now } : prev);
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
  const totalDue = booking
    ? booking.total_price + booking.tax_amount - booking.discount_amount
    : 0;
  const remaining = totalDue - totalPaid;

  const nextStep =
    !isCancelled && booking && currentStepIndex < STATUS_STEPS.length - 1
      ? STATUS_STEPS[currentStepIndex + 1]
      : null;

  // ── Loading / Error State ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#2EBD6B]" />
          <p className="text-sm font-medium">Loading booking...</p>
        </div>
      </div>
    );
  }

  if (loadError || !booking) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-slate-600">{loadError || "Booking not found"}</p>
          <Link href="/dashboard/bookings">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

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
              {(booking as typeof booking & { is_no_show?: boolean }).is_no_show && (
                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 font-semibold text-xs uppercase tracking-wide">
                  <Ban className="h-3 w-3 mr-1" />
                  No Show
                </Badge>
              )}
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
                <TabsTrigger value="inspections">Inspections</TabsTrigger>
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
                        </div>
                      </div>
                      <Separator />
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 text-slate-600">
                            <Phone className="h-3.5 w-3.5 text-slate-400" />
                            <span>{booking.renter_phone || "—"}</span>
                          </div>
                          {booking.renter_phone && (
                            <SMSButton
                              phone={booking.renter_phone}
                              renterName={booking.renter_name}
                              bookingId={booking.id}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2.5 text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          <span>{booking.renter_email || "—"}</span>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <IdCard className="h-3.5 w-3.5 text-slate-400" />
                          <LicenseViewer
                            bookingLicenseUrl={booking.drivers_license_url || null}
                            renterLicenseUrl={(booking as unknown as { renters?: { drivers_license_url?: string } }).renters?.drivers_license_url || null}
                          />
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
                      {vehicle ? (
                        <>
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
                        </>
                      ) : (
                        <p className="text-slate-400 italic text-sm">No vehicle assigned</p>
                      )}
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
                      {/* Add-ons breakdown */}
                      {(booking as typeof booking & { addons?: unknown[]; addons_total?: number }).addons_total ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Add-ons</span>
                          <span className="font-medium">
                            +{formatCurrency((booking as typeof booking & { addons_total?: number }).addons_total!)}
                          </span>
                        </div>
                      ) : null}
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

                {/* Add-ons Breakdown */}
                {(booking as typeof booking & { addons?: unknown[] }).addons && (booking as typeof booking & { addons?: unknown[] }).addons!.length > 0 && (
                  <AddonsBreakdown
                    addons={(booking as typeof booking & { addons?: import("@/lib/types").AddonSnapshot[] }).addons!}
                    addons_total={(booking as typeof booking & { addons_total?: number }).addons_total}
                  />
                )}

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
                            ? "✓ Signed"
                            : agreement.status === "sent"
                              ? "Sent — Awaiting Signature"
                              : "Draft"}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {agreementError && (
                      <div className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        {agreementError}
                      </div>
                    )}
                    {!agreement ? (
                      <div className="text-center py-10">
                        <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 mb-1 font-medium">
                          No agreement sent yet
                        </p>
                        <p className="text-xs text-slate-400 mb-4">
                          PCR Booking will generate and email the renter a signing link.
                        </p>
                        {!booking.renter_email && (
                          <p className="text-xs text-amber-600 bg-amber-50 rounded p-2 mb-4">
                            ⚠️ No renter email on record.
                          </p>
                        )}
                        <Button
                          onClick={() => sendAgreement(false)}
                          disabled={agreementSending || !booking.renter_email}
                          className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                        >
                          {agreementSending ? (
                            <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Sending...</>
                          ) : (
                            <><Send className="h-4 w-4 mr-1" /> Send for Signature</>
                          )}
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {agreement.content && (
                          <div className="bg-slate-50 rounded-lg p-5 border border-slate-100 max-h-64 overflow-y-auto">
                            <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans leading-relaxed">
                              {agreement.content}
                            </pre>
                          </div>
                        )}
                        {agreement.status === "signed" && (
                          <>
                            <Separator />
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                              <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
                                <CheckCircle2 className="h-4 w-4" /> Signed
                              </div>
                              <p className="text-xl italic text-emerald-800" style={{ fontFamily: "cursive" }}>
                                {agreement.renter_signature}
                              </p>
                              {agreement.signature_png_b64 && (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={agreement.signature_png_b64} alt="sig" className="max-h-12 border rounded bg-white" />
                              )}
                              <div className="pt-2 border-t border-emerald-200 text-xs text-emerald-700 space-y-1">
                                {agreement.sent_at && <div><Send className="inline h-3 w-3 mr-1" />Sent {formatDateTime(agreement.sent_at)}</div>}
                                {agreement.viewed_at && <div><Eye className="inline h-3 w-3 mr-1" />Viewed {formatDateTime(agreement.viewed_at)}</div>}
                                {agreement.signed_at && <div><CheckCircle2 className="inline h-3 w-3 mr-1" />Signed {formatDateTime(agreement.signed_at)}</div>}
                                {agreement.signer_ip && <div><Monitor className="inline h-3 w-3 mr-1" />IP: <span className="font-mono">{agreement.signer_ip}</span></div>}
                              </div>
                            </div>
                            <Link href={`/dashboard/agreements/${agreement.id}`}>
                              <Button variant="outline" size="sm">
                                <FileText className="h-3.5 w-3.5 mr-1" /> Full Details
                              </Button>
                            </Link>
                          </>
                        )}
                        {agreement.status === "sent" && (
                          <>
                            <Separator />
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
                                <Clock className="h-4 w-4 flex-shrink-0" />
                                Signing link sent. Awaiting renter signature.
                                {agreement.viewed_at && " (Viewed ✓)"}
                              </div>
                              {agreement.sign_token && (
                                <div className="flex items-center gap-2">
                                  <code className="text-xs bg-slate-100 rounded px-2 py-1 flex-1 truncate">/sign/{agreement.sign_token.slice(0, 16)}…</code>
                                  <Button variant="outline" size="sm" onClick={copySignLink}>
                                    {agreementCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => sendAgreement(true)} disabled={agreementSending}>
                                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${agreementSending ? 'animate-spin' : ''}`} />
                                  Resend
                                </Button>
                                <Link href={`/dashboard/agreements/${agreement.id}`}>
                                  <Button variant="ghost" size="sm"><Eye className="h-3.5 w-3.5 mr-1" />Details</Button>
                                </Link>
                              </div>
                            </div>
                          </>
                        )}
                        {agreement.status === "draft" && (
                          <>
                            <Separator />
                            <div className="flex flex-wrap gap-2">
                              <Button
                                className="bg-[#2EBD6B] hover:bg-[#27a85e] text-white"
                                onClick={() => sendAgreement(false)}
                                disabled={agreementSending || !booking.renter_email}
                              >
                                {agreementSending ? (
                                  <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Sending...</>
                                ) : (
                                  <><Send className="h-4 w-4 mr-1" /> Send for Signature</>
                                )}
                              </Button>
                              <Link href={`/dashboard/agreements/${agreement.id}`}>
                                <Button variant="outline"><FileText className="h-4 w-4 mr-1" /> View</Button>
                              </Link>
                            </div>
                          </>
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
                    {payments.length === 0 ? (
                      <p className="text-slate-400 italic text-sm text-center py-6">
                        No payments recorded yet
                      </p>
                    ) : (
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
                    )}

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

              {/* Inspections Tab */}
              <TabsContent value="inspections" className="space-y-4">
                {/* 4-Zone Photo Inspections */}
                <Card className="border-0 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Camera className="h-4 w-4 text-[#2EBD6B]" />
                      4-Zone Photo Inspections
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Pickup Inspection */}
                      <Link href={`/dashboard/bookings/${id}/pickup-inspection`}>
                        <div className={`rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:shadow-md cursor-pointer ${
                          (booking as unknown as Record<string, boolean>).pickup_inspected
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-dashed border-slate-200 bg-slate-50 hover:border-[#2EBD6B] hover:bg-[#2EBD6B]/5"
                        }`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            (booking as unknown as Record<string, boolean>).pickup_inspected
                              ? "bg-emerald-100"
                              : "bg-slate-100"
                          }`}>
                            {(booking as unknown as Record<string, boolean>).pickup_inspected ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Camera className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${
                              (booking as unknown as Record<string, boolean>).pickup_inspected
                                ? "text-emerald-800"
                                : "text-slate-800"
                            }`}>
                              📷 Pickup Inspection
                            </p>
                            <p className={`text-xs ${
                              (booking as unknown as Record<string, boolean>).pickup_inspected
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}>
                              {(booking as unknown as Record<string, boolean>).pickup_inspected
                                ? "✓ Completed"
                                : "Tap to capture 4 zones"}
                            </p>
                          </div>
                        </div>
                      </Link>

                      {/* Return Inspection */}
                      <Link href={`/dashboard/bookings/${id}/return-inspection`}>
                        <div className={`rounded-xl border-2 p-4 flex items-center gap-3 transition-all hover:shadow-md cursor-pointer ${
                          (booking as unknown as Record<string, boolean>).return_inspected
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-dashed border-slate-200 bg-slate-50 hover:border-[#2EBD6B] hover:bg-[#2EBD6B]/5"
                        }`}>
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            (booking as unknown as Record<string, boolean>).return_inspected
                              ? "bg-emerald-100"
                              : "bg-slate-100"
                          }`}>
                            {(booking as unknown as Record<string, boolean>).return_inspected ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Camera className="h-5 w-5 text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold ${
                              (booking as unknown as Record<string, boolean>).return_inspected
                                ? "text-emerald-800"
                                : "text-slate-800"
                            }`}>
                              📷 Return Inspection
                            </p>
                            <p className={`text-xs ${
                              (booking as unknown as Record<string, boolean>).return_inspected
                                ? "text-emerald-600"
                                : "text-slate-400"
                            }`}>
                              {(booking as unknown as Record<string, boolean>).return_inspected
                                ? "✓ Completed"
                                : "Tap to capture 4 zones"}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </CardContent>
                </Card>

                <BookingInspectionsPanel
                  bookingId={id as string}
                  vehicleId={booking?.vehicle_id || ""}
                  inspections={inspections}
                  operator={operator}
                  onInspectionCreated={() => {
                    const sb = createClient();
                    sb.from("inspections")
                      .select("*")
                      .eq("booking_id", id)
                      .order("created_at", { ascending: true })
                      .then(({ data }) => { if (data) setInspections(data as Inspection[]); });
                  }}
                />
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

                {/* Photo Inspection Shortcuts */}
                <Link href={`/dashboard/bookings/${id}/pickup-inspection`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Camera className="h-4 w-4 mr-2 text-slate-500" />
                    📷 Pickup Inspection
                    {(booking as unknown as Record<string, boolean>).pickup_inspected && (
                      <span className="ml-auto text-emerald-600 text-xs font-medium">✓</span>
                    )}
                  </Button>
                </Link>
                <Link href={`/dashboard/bookings/${id}/return-inspection`}>
                  <Button variant="outline" className="w-full justify-start">
                    <Camera className="h-4 w-4 mr-2 text-slate-500" />
                    📷 Return Inspection
                    {(booking as unknown as Record<string, boolean>).return_inspected && (
                      <span className="ml-auto text-emerald-600 text-xs font-medium">✓</span>
                    )}
                  </Button>
                </Link>

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

                {/* Mark as No Show — only when booking is not yet cancelled/completed AND start_date <= today */}
                {!isCancelled &&
                  booking.status !== "completed" &&
                  booking.status !== "active" &&
                  !(booking as typeof booking & { is_no_show?: boolean }).is_no_show &&
                  booking.start_date <= new Date().toISOString().slice(0, 10) && (
                  <Button
                    variant="outline"
                    className="w-full justify-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setNoShowDialog(true)}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Mark as No Show
                  </Button>
                )}

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

            {/* Deposit Card */}
            {booking && operator && (
              <DepositCard
                booking={booking as Parameters<typeof DepositCard>[0]["booking"]}
                operator={operator as Parameters<typeof DepositCard>[0]["operator"]}
                onUpdate={async () => {
                  // Refresh booking from API after deposit action
                  const res = await fetch(`/api/bookings/${id}`);
                  if (res.ok) {
                    const refreshed = await res.json();
                    setBooking(refreshed);
                  }
                }}
              />
            )}

            {/* Request Payment Card */}
            {booking && operator && (
              <Card className="border-0 bg-white shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="h-4 w-4 text-[#2EBD6B]">💳</span>
                    Request Payment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Generate a secure payment link to send to your customer via text or email.
                  </p>
                  <RequestPaymentModal
                    bookingId={booking.id}
                    operatorId={operator.id}
                    defaultAmountDollars={booking.total_price}
                    renterEmail={booking.renter_email}
                    renterName={booking.renter_name}
                  />
                </CardContent>
              </Card>
            )}

            {/* Booking Snapshot */}
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {vehicle && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Vehicle</span>
                    <span className="font-medium text-slate-700">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </span>
                  </div>
                )}
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

      {/* ── No Show Dialog ─────────────────────────────────────────── */}
      <Dialog open={noShowDialog} onOpenChange={setNoShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Mark as No Show
            </DialogTitle>
            <DialogDescription>
              The renter did not show up for their scheduled pickup. This will cancel the booking and flag it as a no-show.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* SMS reminder toggle */}
            {booking.renter_phone && (
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <input
                  type="checkbox"
                  id="no-show-sms"
                  checked={noShowSendSms}
                  onChange={(e) => setNoShowSendSms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="no-show-sms" className="text-sm cursor-pointer">
                  <span className="font-medium">Send SMS reminder to {booking.renter_phone} first</span>
                  <span className="block text-xs text-gray-500 mt-0.5">
                    &ldquo;Your rental is scheduled for today. Please contact us if you still need the vehicle.&rdquo;
                  </span>
                </label>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="no-show-reason">Reason (optional)</Label>
              <Textarea
                id="no-show-reason"
                value={noShowReason}
                onChange={(e) => setNoShowReason(e.target.value)}
                placeholder="e.g. Customer did not arrive, no communication"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setNoShowDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={noShowLoading}
              onClick={async () => {
                setNoShowLoading(true);
                try {
                  const res = await fetch(`/api/bookings/${booking.id}/no-show`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      reason: noShowReason.trim() || undefined,
                      send_sms_first: noShowSendSms,
                    }),
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    showToast(data.error || "Failed to mark as no-show");
                  } else {
                    setNoShowDialog(false);
                    setNoShowReason("");
                    setNoShowSendSms(false);
                    // Refresh booking data
                    const refreshed = await fetch(`/api/bookings/${id}`);
                    if (refreshed.ok) {
                      const updated = await refreshed.json();
                      setBooking(updated);
                    } else {
                      // Optimistic update
                      setBooking((prev) => prev ? { ...prev, status: "cancelled" as BookingStatus } : prev);
                    }
                    showToast(data.sms_sent ? "Booking marked as no-show. SMS sent." : "Booking marked as no-show");
                  }
                } catch {
                  showToast("Network error — please try again");
                } finally {
                  setNoShowLoading(false);
                }
              }}
            >
              {noShowLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-1" />
              )}
              Mark as No Show
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
