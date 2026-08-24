import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  DollarSign,
  AlertTriangle,
  CreditCard,
  FileText,
  ArrowUpRight,
} from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  booking_id: string | null;
  renter_id: string | null;
  amount: number | string;
  total: number | string;
  status: string;
  paid_at: string | null;
  created_at: string;
  bookings?: {
    renter_name: string | null;
    vehicle_id?: string | null;
    vehicles?: { make: string; model: string; year: number } | null;
  } | null;
  renters?: { name: string } | null;
};

export default async function PaymentsPage() {
  const operator = await getOperator();
  const supabase = createAdminClient();

  // Fetch invoices
  const { data: invoicesData } = await supabase
    .from("invoices")
    .select(
      `
      id,
      invoice_number,
      booking_id,
      renter_id,
      amount,
      total,
      status,
      paid_at,
      created_at,
      bookings(renter_name, vehicle_id, vehicles(make, model, year)),
      renters(name)
    `
    )
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  // Calculate metrics
  const safeInvoices: Invoice[] = (invoicesData as unknown as Invoice[]) || [];
  const currentMonth = new Date();
  const paidThisMonth = safeInvoices
    .filter((inv) => inv.status === "paid" && inv.paid_at)
    .filter((inv) => {
      const paidDate = new Date(inv.paid_at!);
      return (
        paidDate.getMonth() === currentMonth.getMonth() &&
        paidDate.getFullYear() === currentMonth.getFullYear()
      );
    });

  const totalReceivedThisMonth = paidThisMonth.reduce(
    (sum, inv) => sum + Number(inv.total),
    0
  );

  const totalOutstanding = safeInvoices
    .filter((inv) => inv.status !== "paid" && inv.status !== "cancelled")
    .reduce((sum, inv) => sum + Number(inv.total), 0);

  const pendingCount = safeInvoices.filter(
    (inv) => inv.status === "pending" || inv.status === "overdue"
  ).length;

  const statusColors: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    paid: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    pending: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    overdue: "bg-red-500/10 text-red-600 border-red-500/20",
    cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
        <p className="text-muted-foreground mt-1">
          Track invoices and payments from renters
        </p>
      </div>

      {/* Stripe Connection Banner — visible until charges_enabled = true */}
      {!operator.charges_enabled && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0 mt-0.5">
              <CreditCard className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                {operator.stripe_account_id
                  ? '⚠️ Stripe setup incomplete'
                  : 'Connect Stripe to accept payments'}
              </p>
              <p className="text-sm text-amber-800 mt-1">
                {operator.stripe_account_id ? (
                  <>
                    Your Stripe account setup isn&apos;t finished. Renters can&apos;t pay until this is complete.{" "}
                    <a
                      href="/api/stripe/connect"
                      className="font-semibold underline hover:no-underline"
                    >
                      Resume setup →
                    </a>
                  </>
                ) : (
                  <>
                    You need to connect your Stripe account to receive payments from renters. Go to{" "}
                    <Link
                      href="/dashboard/settings?tab=payment"
                      className="font-semibold underline hover:no-underline"
                    >
                      Settings → Payment
                    </Link>{" "}
                    to connect now.
                  </>
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Received This Month
                </p>
                <p className="text-3xl font-bold mt-2">
                  ${totalReceivedThisMonth.toFixed(2)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Outstanding
                </p>
                <p className="text-3xl font-bold mt-2">
                  ${totalOutstanding.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingCount} pending
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Invoices
                </p>
                <p className="text-3xl font-bold mt-2">{safeInvoices.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  All time
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            All invoices and their payment status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {safeInvoices.length === 0 ? (
            <div className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-gray-900">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Once renters pay for bookings, invoices will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Renter</TableHead>
                    <TableHead>Vehicle</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {safeInvoices.map((invoice) => {
                    const renterName =
                      invoice.renters?.name ||
                      invoice.bookings?.renter_name ||
                      "Unknown";
                    const vehicleLabel = invoice.bookings?.vehicles
                      ? `${invoice.bookings.vehicles.year} ${invoice.bookings.vehicles.make} ${invoice.bookings.vehicles.model}`
                      : "—";

                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono text-sm font-medium">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell className="font-medium">
                          {renterName}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {vehicleLabel}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${Number(invoice.total).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusColors[invoice.status] || ""}
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(invoice.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/dashboard/payments/invoices/${invoice.id}`}>
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
