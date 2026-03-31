import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Send, Copy } from "lucide-react";
import Link from "next/link";
import { AgreementActions } from "./agreement-actions";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-amber-100 text-amber-700 border-amber-200",
  signed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: agreement, error } = await supabase
    .from("rental_agreements")
    .select(
      "*, bookings(id, renter_name, renter_email, start_date, end_date, duration_days, total_price, daily_rate, status, vehicles(make, model, year))"
    )
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (error || !agreement) {
    notFound();
  }

  const booking = agreement.bookings;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agreements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Agreement Details</h1>
          <p className="text-muted-foreground">
            {booking?.renter_name || "Unknown renter"}
          </p>
        </div>
        <Badge
          variant="outline"
          className={statusStyles[agreement.status] || ""}
        >
          {agreement.status.charAt(0).toUpperCase() +
            agreement.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agreement Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Agreement Content</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-sm bg-slate-50 rounded-lg p-6 whitespace-pre-wrap font-sans leading-relaxed max-h-[500px] overflow-y-auto border">
                {agreement.content}
              </pre>
            </CardContent>
          </Card>

          {/* Signature */}
          {agreement.status === "signed" && agreement.renter_signature && (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="p-6">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="font-medium text-emerald-800">
                      Signed by Renter
                    </p>
                  </div>
                  <p
                    className="text-3xl text-emerald-700 italic"
                    style={{ fontFamily: "cursive" }}
                  >
                    {agreement.renter_signature}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Signed on {formatDate(agreement.signed_at!)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(agreement.status === "draft" || agreement.status === "sent") && (
            <AgreementActions
              agreementId={agreement.id}
              bookingId={agreement.booking_id}
              currentStatus={agreement.status}
            />
          )}
        </div>

        {/* Booking Sidebar */}
        <div>
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {booking && (
                <>
                  <div>
                    <p className="text-muted-foreground">Renter</p>
                    <p className="font-medium">{booking.renter_name}</p>
                  </div>
                  {booking.renter_email && (
                    <div>
                      <p className="text-muted-foreground">Email</p>
                      <p className="font-medium">{booking.renter_email}</p>
                    </div>
                  )}
                  {booking.vehicles && (
                    <div>
                      <p className="text-muted-foreground">Vehicle</p>
                      <p className="font-medium">
                        {booking.vehicles.year} {booking.vehicles.make}{" "}
                        {booking.vehicles.model}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-muted-foreground">Dates</p>
                    <p className="font-medium">
                      {booking.start_date} - {booking.end_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Duration</p>
                    <p className="font-medium">{booking.duration_days} days</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-medium text-[#2EBD6B]">
                      ${Number(booking.total_price).toLocaleString()}
                    </p>
                  </div>
                  <div className="pt-3 border-t">
                    <Link href={`/dashboard/bookings/${booking.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Booking
                      </Button>
                    </Link>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 bg-white shadow-sm ring-0 mt-4">
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">
                  {formatDate(agreement.created_at)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">
                  {formatDate(agreement.updated_at)}
                </p>
              </div>
              {agreement.signed_at && (
                <div>
                  <p className="text-muted-foreground">Signed</p>
                  <p className="font-medium">
                    {formatDate(agreement.signed_at)}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
