import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  TrendingUp,
  DollarSign,
  ChevronRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const operator = await getOperator();
  const supabase = createAdminClient();
  const { q } = await searchParams;

  let query = supabase
    .from("renters")
    .select("id, name, email, phone, is_blacklisted, created_at")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
    );
  }

  const { data: renters } = await query;

  // Aggregate booking stats per renter
  const renterIds = renters?.map((r) => r.id) || [];
  const spendMap: Record<string, number> = {};
  const countMap: Record<string, number> = {};
  const lastBookingMap: Record<string, string> = {};

  if (renterIds.length > 0) {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("renter_id, total_price, start_date, status")
      .in("renter_id", renterIds)
      .order("start_date", { ascending: false });

    if (bookings) {
      for (const b of bookings) {
        if (!b.renter_id) continue;
        countMap[b.renter_id] = (countMap[b.renter_id] || 0) + 1;
        spendMap[b.renter_id] =
          (spendMap[b.renter_id] || 0) + Number(b.total_price ?? 0);
        if (!lastBookingMap[b.renter_id]) {
          lastBookingMap[b.renter_id] = b.start_date;
        }
      }
    }
  }

  const totalCustomers = renters?.length ?? 0;
  const totalRevenue = Object.values(spendMap).reduce((a, b) => a + b, 0);
  const avgSpend =
    totalCustomers > 0 ? totalRevenue / Object.keys(spendMap).length : 0;

  // Sort by total spend descending for value indication
  const sortedRenters = [...(renters ?? [])].sort(
    (a, b) => (spendMap[b.id] ?? 0) - (spendMap[a.id] ?? 0)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-[#2EBD6B]" />
            Customers
          </h1>
          <p className="text-muted-foreground">
            {totalCustomers} customer{totalCustomers !== 1 ? "s" : ""} — full
            rental history &amp; spend
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="bg-blue-50 rounded-full p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Customers</p>
              <p className="text-2xl font-bold">{totalCustomers}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="bg-emerald-50 rounded-full p-2.5">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Revenue</p>
              <p className="text-2xl font-bold">
                ${totalRevenue.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4 flex items-center gap-3">
            <div className="bg-purple-50 rounded-full p-2.5">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg Spend / Customer</p>
              <p className="text-2xl font-bold">
                ${avgSpend.toLocaleString("en-US", { maximumFractionDigits: 0 })}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <form method="GET" className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          name="q"
          placeholder="Search by name, email, or phone…"
          defaultValue={q}
          className="pl-9 bg-white border-0 shadow-sm"
        />
      </form>

      {/* Table */}
      {!renters || renters.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No customers yet</h3>
            <p className="text-sm text-muted-foreground">
              Customers will appear here once bookings are created with renter
              profiles linked.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead className="text-right">Bookings</TableHead>
                  <TableHead className="text-right">Total Spend</TableHead>
                  <TableHead>Last Booking</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRenters.map((renter) => {
                  const bookingCount = countMap[renter.id] ?? 0;
                  const totalSpend = spendMap[renter.id] ?? 0;
                  const lastBooking = lastBookingMap[renter.id];

                  return (
                    <TableRow
                      key={renter.id}
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#2EBD6B]/10 flex items-center justify-center shrink-0">
                            <span className="text-[#2EBD6B] font-semibold text-xs">
                              {renter.name?.charAt(0)?.toUpperCase() ?? "?"}
                            </span>
                          </div>
                          <span className="font-medium">{renter.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {renter.email && (
                            <p className="text-gray-900">{renter.email}</p>
                          )}
                          {renter.phone && (
                            <p className="text-muted-foreground">
                              {renter.phone}
                            </p>
                          )}
                          {!renter.email && !renter.phone && (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {bookingCount}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            totalSpend > 0
                              ? "font-semibold text-emerald-700"
                              : "text-muted-foreground"
                          }
                        >
                          {totalSpend > 0
                            ? `$${totalSpend.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}`
                            : "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {lastBooking
                          ? new Date(
                              lastBooking + "T12:00:00Z"
                            ).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {renter.is_blacklisted ? (
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-600 border-red-200"
                          >
                            Blacklisted
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-emerald-50 text-emerald-700 border-emerald-200"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/dashboard/customers/${renter.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#2EBD6B]"
                          >
                            View
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
