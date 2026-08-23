"use client";

import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Car,
  User,
  CalendarDays,
  Package,
  FileText,
  CreditCard,
  Camera,
  Check,
} from "lucide-react";

interface Step8Props {
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  error: string;
}

export function Step8Summary({ onConfirm, onBack, loading, error }: Step8Props) {
  const { state } = useWizard();

  const renterName = `${state.first_name} ${state.last_name}`.trim();
  const vehicleName = state.vehicle
    ? `${state.vehicle.year} ${state.vehicle.make} ${state.vehicle.model}`
    : "—";

  const photoCount = state.inspection_zones.filter((z) => z.path).length;

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <ClipboardList className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Booking Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Vehicle */}
        <SummarySection
          icon={<Car className="h-4 w-4 text-[#2EBD6B]" />}
          title="Vehicle"
        >
          <Row label="Vehicle" value={vehicleName} />
          {state.vehicle?.plate && <Row label="Plate" value={state.vehicle.plate} />}
          {state.vehicle?.color && <Row label="Color" value={state.vehicle.color} />}
          <Row
            label="Daily Rate"
            value={`$${state.vehicle?.daily_rate.toFixed(2) ?? "—"}`}
          />
        </SummarySection>

        {/* Dates */}
        <SummarySection
          icon={<CalendarDays className="h-4 w-4 text-[#2EBD6B]" />}
          title="Rental Period"
        >
          {state.location_name && (
            <Row label="Location" value={state.location_name} />
          )}
          <Row label="Pickup" value={`${state.start_date} @ ${state.start_time}`} />
          <Row label="Return" value={`${state.end_date} @ ${state.return_time}`} />
          <Row
            label="Duration"
            value={`${state.duration_days} day${state.duration_days !== 1 ? "s" : ""}`}
          />
        </SummarySection>

        {/* Customer */}
        <SummarySection
          icon={<User className="h-4 w-4 text-[#2EBD6B]" />}
          title="Customer"
        >
          <Row label="Name" value={renterName || "—"} />
          {state.phone && <Row label="Phone" value={state.phone} />}
          {state.email && <Row label="Email" value={state.email} />}
          {state.license_number && (
            <Row label="License #" value={`${state.license_number} (${state.license_state || "?"})`} />
          )}
          {state.license_photo_path && (
            <Row
              label="License Photo"
              value={
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">
                  <Check className="h-2.5 w-2.5 mr-1" /> Uploaded
                </Badge>
              }
            />
          )}
        </SummarySection>

        {/* Add-ons */}
        {state.addons.length > 0 && (
          <SummarySection
            icon={<Package className="h-4 w-4 text-[#2EBD6B]" />}
            title="Add-ons"
          >
            {state.addons.map((a) => (
              <Row
                key={a.id}
                label={a.name}
                value={`+$${(a.pricing_type === "per_day" ? Number(a.price) * state.duration_days : Number(a.price)).toFixed(2)}`}
              />
            ))}
          </SummarySection>
        )}

        {/* Agreement */}
        <SummarySection
          icon={<FileText className="h-4 w-4 text-[#2EBD6B]" />}
          title="Agreement"
        >
          <Row
            label="Status"
            value={
              state.agreement_id ? (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-[10px]">
                  <Check className="h-2.5 w-2.5 mr-1" /> Signed
                </Badge>
              ) : (
                <Badge variant="secondary" className="bg-gray-100 text-gray-500 text-[10px]">
                  Not signed
                </Badge>
              )
            }
          />
          {state.signature_data_url && (
            <Row
              label="Signature"
              value={
                <img
                  src={state.signature_data_url}
                  alt="Signature"
                  className="h-12 max-w-[180px] object-contain border border-gray-200 rounded"
                />
              }
            />
          )}
        </SummarySection>

        {/* Payment */}
        <SummarySection
          icon={<CreditCard className="h-4 w-4 text-[#2EBD6B]" />}
          title="Payment"
        >
          <Row
            label="Type"
            value={
              state.payment_type === "pay_now"
                ? "Pay Now"
                : state.payment_type === "deposit"
                  ? "Deposit Hold"
                  : "Skip (collect later)"
            }
          />
          {state.payment_status && <Row label="Status" value={state.payment_status} />}
        </SummarySection>

        {/* Photos */}
        <SummarySection
          icon={<Camera className="h-4 w-4 text-[#2EBD6B]" />}
          title="Pickup Photos"
        >
          <Row
            label="Photos"
            value={
              <Badge
                variant="secondary"
                className={`text-[10px] ${photoCount > 0 ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
              >
                {photoCount === 0 ? "None" : `${photoCount} / 4 zones`}
              </Badge>
            }
          />
        </SummarySection>

        <Separator />

        {/* Grand total */}
        <div className="flex items-center justify-between rounded-xl bg-[#F8F9FC] border border-gray-100 px-4 py-4">
          <span className="text-sm font-semibold text-gray-700">Grand Total</span>
          <span className="text-2xl font-bold text-[#2EBD6B]">
            ${state.grand_total.toFixed(2)}
          </span>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className="flex-2 bg-[#2EBD6B] text-white hover:bg-[#27a85e] px-8"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Creating Booking…
              </span>
            ) : (
              <>
                Confirm Booking <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────

function SummarySection({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-[#F8F9FC] p-4 space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
          {title}
        </span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-800 text-right">{value}</span>
    </div>
  );
}
