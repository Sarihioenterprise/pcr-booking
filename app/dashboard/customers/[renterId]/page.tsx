import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  CalendarDays,
  Car,
  DollarSign,
  TrendingUp,
  FileText,
  Shield,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  inquiry: "bg-gray-100 text-gray-600 border-gray-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-50 text-red-600 border-red-200",
  no_show: "bg-orange-50 text-orange-600 border-orange-200",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ renterId: string }>;
}) {
  const { renterId } = await params;
  const operator = await getOperator();
  const supabase = createAdminClient();

  // Fetch renter
  const { data: renter, error } = await supabase
    .from("renters")
    .select("*")
    .eq("id", renterId)
    .eq("operator_id", operator.id)
    .single();

  if (error || !renter) {
    notFound();
  }

  // Fetch all bookings for this renter
  const { data: bookings } = await supabase
    .from("bookings")
    .select(
      `
      id, start_date, end_date, duration_days, total_price, status,
      deposit_amount, deposit_status, deposit_captured_amount,
      notes, created_at,
      vehicles(make, model, year, license_plate),
      location:locations!location_id(name)
    `
    )
    .eq("renter_id", renterId)
    .eq("operator_id", operator.id)
    .order("start_date", { ascending: false });

  // Compute stats
  const totalBookings = bookings?.length ?? 0;
  const completedBookings =
    bookings?.filter((b) => ["completed", "active"].includes(b.status)).length ??
    0;
  const totalSpend = bookings?.reduce(
    (sum, b) => sum + Number(b.total_price ?? 0),
    0
  ) ?? 0;
  const avgBookingValue =
    totalBookings > 0 ? totalSpend / totalBookings : 0;
  const lastBooking = bookings?.[0];

  // License photo public URL
  let licenseUrl: string | null = null;
  if (renter.drivers_license_url) {
    const { data } = supabase.storage
      .from("licenses")
      .getPublicUrl(renter.drivers_license_url);
    licenseUrl = data?.publicUrl ?? null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#2EBD6B]/10 flex items-center justify-center">
              <span className="text-[#2EBD6B] font-bold text-base">
                {renter.name?.charAt(0)?.toUpperCase() ?? "?"}
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{renter.name}</h1>
              <p className="text-muted-foreground text-sm">
                Customer since{" "}
                {new Date(renter.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
        {renter.is_blacklisted ? (
          <Badge className="bg-red-50 text-red-600 border-red-200 border">
            <Shield className="h-3.5 w-3.5 mr-1" />
            Blacklisted
          </Badge>
        ) : (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 border">
            Active Customer
          </Badge>
        )}
        <Link href={`/dashboard/renters/${renterId}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
            Full Profile
          </Button>
        </Link>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CalendarDays className="h-4 w-4" />
              <span className="text-xs">Total Bookings</span>
            </div>
            <p className="text-2xl font-bold">{totalBookings}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Total Spend</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              ${totalSpend.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Avg Booking</span>
            </div>
            <p className="text-2xl font-bold">
              ${avgBookingValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Car className="h-4 w-4" />
              <span className="text-xs">Completed Rentals</span>
            </div>
            <p className="text-2xl font-bold">{completedBookings}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Profile info */}
        <div className="space-y-4">
          {/* Contact info */}
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-[#2EBD6B]" />
                Contact Info
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renter.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${renter.email}`}
                    className="text-[#2EBD6B] hover:underline truncate"
                  >
                    {renter.email}
                  </a>
                </div>
              )}
              {renter.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a href={`tel:${renter.phone}`} className="text-[#2EBD6B] hover:underline">
                    {renter.phone}
                  </a>
                </div>
              )}
              {(renter.address || renter.city || renter.state) && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    {[renter.address, renter.city, renter.state, renter.zip]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
              )}
              {renter.date_of_birth && (
                <div className="flex items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-gray-700">
                    DOB:{" "}
                    {new Date(
                      renter.date_of_birth + "T12:00:00Z"
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* License info */}
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#2EBD6B]" />
                Driver&apos;s License
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {renter.drivers_license_number ? (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    License #
                  </p>
                  <p className="font-mono font-medium">
                    {renter.drivers_license_number}
                  </p>
                </div>
              ) : null}
              {renter.drivers_license_expiry && (
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground mb-0.5">
                    Expires
                  </p>
                  <p className="font-medium">
                    {new Date(
                      renter.drivers_license_expiry + "T12:00:00Z"
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
              )}
              {licenseUrl ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Photo</p>
                  <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={licenseUrl}
                      alt="Driver's License"
                      className="w-full rounded-lg border object-contain max-h-32 hover:opacity-90 transition-opacity"
                    />
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  No photo uploaded
                </div>
              )}
              {!renter.drivers_license_number &&
                !renter.drivers_license_expiry &&
                !licenseUrl && (
                  <p className="text-sm text-muted-foreground">
                    No license information on file.
                  </p>
                )}
            </CardContent>
          </Card>

          {/* Notes */}
          {renter.notes && (
            <Card className="border-0 bg-white shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#2EBD6B]" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                  {renter.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Blacklist reason */}
          {renter.is_blacklisted && renter.blacklist_reason && (
            <Card className="border-0 bg-red-50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-red-700 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Blacklist Reason
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-red-700">{renter.blacklist_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Booking history */}
        <div className="lg:col-span-2">
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-[#2EBD6B]" />
                Booking History
                <span className="ml-auto text-sm font-normal text-muted-foreground">
                  {totalBookings} booking{totalBookings !== 1 ? "s" : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!bookings || bookings.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                  <p className="font-medium">No bookings yet</p>
                  <p className="text-sm text-muted-foreground">
                    This customer has no bookings on record.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Dates</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bookings.map((booking) => {
                      const vehicle = Array.isArray(booking.vehicles)
                        ? booking.vehicles[0]
                        : booking.vehicles;
                      const vehicleLabel = vehicle
                        ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
                        : "Unknown vehicle";

                      return (
                        <TableRow key={booking.id}>
                          <TableCell className="text-sm">
                            <p className="font-medium">
                              {new Date(
                                booking.start_date + "T12:00:00Z"
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-muted-foreground">
                              →{" "}
                              {new Date(
                                booking.end_date + "T12:00:00Z"
                              ).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <Car className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium">
                                {vehicleLabel}
                              </span>
                            </div>
                            {vehicle?.license_plate && (
                              <p className="text-xs text-muted-foreground ml-5">
                                {vehicle.license_plate}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {booking.duration_days} day
                            {booking.duration_days !== 1 ? "s" : ""}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-semibold text-emerald-700">
                              ${Number(booking.total_price).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={
                                STATUS_COLORS[booking.status] ??
                                "bg-gray-100 text-gray-600 border-gray-200"
                              }
                            >
                              {booking.status.charAt(0).toUpperCase() +
                                booking.status.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Link
                              href={`/dashboard/bookings/${booking.id}`}
                            >
                              <Button variant="ghost" size="sm" className="text-[#2EBD6B]">
                                View
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Spending summary */}
          {totalBookings > 0 && (
            <Card className="border-0 bg-white shadow-sm mt-4">
              <CardContent className="py-4">
                <div className="flex items-center justify-between text-sm flex-wrap gap-2">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground">Lifetime Value</p>
                      <p className="font-bold text-emerald-700 text-lg">
                        ${totalSpend.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Booking Count</p>
                      <p className="font-bold text-lg">{totalBookings}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Per Booking</p>
                      <p className="font-bold text-lg">
                        ${avgBookingValue.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  </div>
                  {lastBooking && (
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Last Rental</p>
                      <p className="font-medium text-sm">
                        {new Date(
                          lastBooking.start_date + "T12:00:00Z"
                        ).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
