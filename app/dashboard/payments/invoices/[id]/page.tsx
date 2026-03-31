import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { ArrowLeft, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InvoiceActions } from "./actions";

const statusColors: Record<string, string> = {
  draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .select("*, bookings(renter_name, renter_email, renter_phone, start_date, end_date, duration_days, daily_rate, vehicle_id, vehicles(make, model, year)), renters(name, email, phone, address, city, state, zip)")
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  const booking = invoice.bookings as {
    renter_name: string;
    renter_email: string | null;
    renter_phone: string | null;
    start_date: string;
    end_date: string;
    duration_days: number;
    daily_rate: number;
    vehicle_id: string | null;
    vehicles: { make: string; model: string; year: number } | null;
  } | null;

  const renter = invoice.renters as {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  } | null;

  const renterName = renter?.name ?? booking?.renter_name ?? "Unknown";
  const renterEmail = renter?.email ?? booking?.renter_email ?? null;
  const renterPhone = renter?.phone ?? booking?.renter_phone ?? null;

  const subtotal = Number(invoice.amount);
  const tax = Number(invoice.tax_amount);
  const discount = Number(invoice.discount_amount);
  const total = Number(invoice.total);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
            <Badge
              variant="outline"
              className={statusColors[invoice.status] ?? ""}
            >
              {invoice.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Created{" "}
            {new Date(invoice.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <InvoiceActions invoiceId={invoice.id} status={invoice.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* From / To */}
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    From
                  </p>
                  <p className="font-semibold">{operator.business_name}</p>
                  {operator.business_email && (
                    <p className="text-sm text-muted-foreground">
                      {operator.business_email}
                    </p>
                  )}
                  {operator.business_address && (
                    <p className="text-sm text-muted-foreground">
                      {operator.business_address}
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Bill To
                  </p>
                  <p className="font-semibold">{renterName}</p>
                  {renterEmail && (
                    <p className="text-sm text-muted-foreground">
                      {renterEmail}
                    </p>
                  )}
                  {renterPhone && (
                    <p className="text-sm text-muted-foreground">
                      {renterPhone}
                    </p>
                  )}
                  {renter?.address && (
                    <p className="text-sm text-muted-foreground">
                      {renter.address}
                      {renter.city ? `, ${renter.city}` : ""}
                      {renter.state ? `, ${renter.state}` : ""}
                      {renter.zip ? ` ${renter.zip}` : ""}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="text-lg">Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <p className="font-medium">Vehicle Rental</p>
                      {booking?.vehicles && (
                        <p className="text-sm text-muted-foreground">
                          {booking.vehicles.year} {booking.vehicles.make}{" "}
                          {booking.vehicles.model}
                        </p>
                      )}
                      {booking && (
                        <p className="text-sm text-muted-foreground">
                          {booking.start_date} to {booking.end_date}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {booking?.duration_days ?? 1} day
                      {(booking?.duration_days ?? 1) !== 1 ? "s" : ""}
                    </TableCell>
                    <TableCell className="text-right">
                      $
                      {booking?.daily_rate
                        ? Number(booking.daily_rate).toFixed(2)
                        : subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${subtotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">
                      Subtotal
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${subtotal.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  {discount > 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-right text-emerald-600">
                        Discount
                      </TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        -${discount.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )}
                  <TableRow>
                    <TableCell colSpan={3} className="text-right">
                      Tax
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ${tax.toFixed(2)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold text-base">
                      Total
                    </TableCell>
                    <TableCell className="text-right font-bold text-base">
                      ${total.toFixed(2)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Invoice Number</p>
                <p className="font-medium">{invoice.invoice_number}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge
                  variant="outline"
                  className={`mt-1 ${statusColors[invoice.status] ?? ""}`}
                >
                  {invoice.status}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Due Date</p>
                <p className="font-medium">
                  {invoice.due_date
                    ? new Date(invoice.due_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Not set"}
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {new Date(invoice.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              {invoice.sent_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Sent</p>
                    <p className="font-medium">
                      {new Date(invoice.sent_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </>
              )}
              {invoice.paid_at && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Paid</p>
                    <p className="font-medium">
                      {new Date(invoice.paid_at).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </>
              )}
              {booking && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Booking</p>
                    <Link
                      href={`/dashboard/bookings/${invoice.booking_id}`}
                      className="text-[#2EBD6B] hover:underline font-medium"
                    >
                      View Booking
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="p-6">
              <div className="text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2EBD6B]/10 mx-auto mb-3">
                  <FileText className="h-6 w-6 text-[#2EBD6B]" />
                </div>
                <p className="text-2xl font-bold">${total.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Total Amount
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
