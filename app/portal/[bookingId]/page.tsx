import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Car,
  DollarSign,
  FileText,
  MapPin,
  HeadphonesIcon,
  Clock,
  CheckCircle2,
  Circle,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { BookingStatus } from "@/lib/types";

const statusColors: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  confirmed: "bg-blue-100 text-blue-700 border-blue-200",
  active: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-700 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const statusFlow: BookingStatus[] = [
  "inquiry",
  "pending",
  "confirmed",
  "active",
  "completed",
];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

export default async function PortalPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase
    .from("bookings")
    .select(
      "*, vehicles(id, make, model, year, color, plate, photo_url), rental_agreements(id, status, renter_signature, signed_at, content), payment_schedule(id, amount, due_date, status, paid_at)"
    )
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    notFound();
  }

  const vehicle = booking.vehicles;
  const agreements = booking.rental_agreements;
  const agreement = Array.isArray(agreements) ? agreements[0] : agreements;
  const payments = Array.isArray(booking.payment_schedule)
    ? booking.payment_schedule
    : [];

  const currentStatusIndex = statusFlow.indexOf(booking.status as BookingStatus);

  const paidAmount = payments
    .filter((p: any) => p.status === "paid")
    .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
  const remainingAmount = Number(booking.total_price) - paidAmount;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Welcome, {booking.renter_name}
        </h2>
        <p className="text-muted-foreground mt-1">
          {vehicle ? (
            <>
              Manage your rental for the{" "}
              <span className="font-medium text-gray-700">
                {vehicle.year} {vehicle.make} {vehicle.model}
              </span>
            </>
          ) : (
            <>Booking reference: {bookingId.slice(0, 8).toUpperCase()}</>
          )}
        </p>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="bg-white border border-gray-200 p-1">
          <TabsTrigger value="details" className="gap-1.5 text-sm">
            <Car className="w-4 h-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5 text-sm">
            <FileText className="w-4 h-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-1.5 text-sm">
            <CreditCard className="w-4 h-4" />
            Payment
          </TabsTrigger>
          <TabsTrigger value="agreement" className="gap-1.5 text-sm">
            <FileText className="w-4 h-4" />
            Agreement
          </TabsTrigger>
          <TabsTrigger value="support" className="gap-1.5 text-sm">
            <HeadphonesIcon className="w-4 h-4" />
            Support
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="details" className="space-y-6">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Booking Overview</CardTitle>
                <Badge
                  variant="outline"
                  className={statusColors[booking.status] || ""}
                >
                  {booking.status.charAt(0).toUpperCase() +
                    booking.status.slice(1)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {vehicle && (
                <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 rounded-lg bg-[#2EBD6B]/10 flex items-center justify-center flex-shrink-0">
                    <Car className="w-8 h-8 text-[#2EBD6B]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {vehicle.color && `${vehicle.color} · `}
                      {vehicle.plate && `Plate: ${vehicle.plate}`}
                    </p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Pickup
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(booking.start_date)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarDays className="w-3.5 h-3.5" />
                    Return
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatDate(booking.end_date)}
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    Duration
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.duration_days} days
                  </p>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <DollarSign className="w-3.5 h-3.5" />
                    Total
                  </div>
                  <p className="text-sm font-bold text-[#2EBD6B]">
                    {formatCurrency(Number(booking.total_price))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Instructions */}
          {booking.pickup_instructions && (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#2EBD6B]" />
                  Pickup Instructions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-sm text-gray-700 leading-relaxed">
                  {booking.pickup_instructions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Booking Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {statusFlow.map((step, i) => {
                  const isCompleted = i <= currentStatusIndex;
                  const isCurrent = i === currentStatusIndex;
                  return (
                    <div
                      key={step}
                      className="flex items-center flex-1 last:flex-initial"
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center ${
                            isCurrent
                              ? "bg-[#2EBD6B] text-white"
                              : isCompleted
                              ? "bg-[#2EBD6B]/20 text-[#2EBD6B]"
                              : "bg-gray-100 text-gray-400"
                          }`}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </div>
                        <span
                          className={`text-xs capitalize ${
                            isCurrent
                              ? "font-semibold text-[#2EBD6B]"
                              : isCompleted
                              ? "text-gray-600"
                              : "text-gray-400"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                      {i < statusFlow.length - 1 && (
                        <div
                          className={`flex-1 h-0.5 mx-2 mt-[-1.25rem] ${
                            i < currentStatusIndex
                              ? "bg-[#2EBD6B]/30"
                              : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DOCUMENTS TAB */}
        <TabsContent value="documents">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              {booking.drivers_license_url ? (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Driver&apos;s License
                  </p>
                  <a
                    href={booking.drivers_license_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-medium text-[#2EBD6B] hover:underline"
                  >
                    <FileText className="h-4 w-4" />
                    View Document
                  </a>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No documents uploaded yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* PAYMENT TAB */}
        <TabsContent value="payments" className="space-y-6">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Total</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(Number(booking.total_price))}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Paid</p>
                  <p className="text-xl font-bold text-[#2EBD6B]">
                    {formatCurrency(paidAmount)}
                  </p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Remaining</p>
                  <p className="text-xl font-bold text-orange-600">
                    {formatCurrency(remainingAmount)}
                  </p>
                </div>
              </div>

              {payments.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Due Date
                          </th>
                          <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Amount
                          </th>
                          <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="text-left py-3 px-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Paid On
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {payments.map((payment: any) => (
                          <tr key={payment.id}>
                            <td className="py-3 px-2 text-gray-900">
                              {formatDate(payment.due_date)}
                            </td>
                            <td className="py-3 px-2 font-medium text-gray-900">
                              {formatCurrency(Number(payment.amount))}
                            </td>
                            <td className="py-3 px-2">
                              <Badge
                                variant="outline"
                                className={
                                  payment.status === "paid"
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : payment.status === "overdue"
                                    ? "bg-red-100 text-red-700 border-red-200"
                                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                                }
                              >
                                {payment.status.charAt(0).toUpperCase() +
                                  payment.status.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-gray-500">
                              {payment.paid_at
                                ? formatDate(payment.paid_at)
                                : "---"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {remainingAmount > 0 && (
                <div className="mt-4">
                  <Link href={`/portal/${bookingId}/pay`}>
                    <Button style={{ backgroundColor: "#2EBD6B" }}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Make Payment
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AGREEMENT TAB */}
        <TabsContent value="agreement">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Rental Agreement</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agreement ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant="outline"
                      className={
                        agreement.status === "signed"
                          ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                          : agreement.status === "sent"
                          ? "bg-amber-100 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }
                    >
                      {agreement.status === "signed"
                        ? "Signed"
                        : agreement.status === "sent"
                        ? "Awaiting Signature"
                        : "Draft"}
                    </Badge>
                    {agreement.signed_at && (
                      <span className="text-sm text-muted-foreground">
                        Signed on{" "}
                        {new Date(agreement.signed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {agreement.status !== "signed" && (
                    <Link href={`/portal/${bookingId}/agreement`}>
                      <Button style={{ backgroundColor: "#2EBD6B" }}>
                        <FileText className="h-4 w-4 mr-2" />
                        Review & Sign Agreement
                      </Button>
                    </Link>
                  )}
                  {agreement.status === "signed" &&
                    agreement.renter_signature && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <p className="text-sm font-medium text-emerald-800">
                            Signed
                          </p>
                        </div>
                        <p
                          className="text-2xl text-emerald-700 italic"
                          style={{ fontFamily: "cursive" }}
                        >
                          {agreement.renter_signature}
                        </p>
                      </div>
                    )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No agreement has been generated for this booking yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* SUPPORT TAB */}
        <TabsContent value="support">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HeadphonesIcon className="h-5 w-5 text-[#2EBD6B]" />
                Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Need help? Submit a support ticket and we&apos;ll get back
                to you as soon as possible.
              </p>
              <Link href={`/portal/${bookingId}/support`}>
                <Button style={{ backgroundColor: "#2EBD6B" }}>
                  <HeadphonesIcon className="h-4 w-4 mr-2" />
                  Contact Support
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
