import { createAdminClient } from "@/lib/supabase/admin";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Clock, Eye, MapPin, Monitor } from "lucide-react";
import Link from "next/link";
import { AgreementActions } from "./agreement-actions";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com";

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

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default async function AgreementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = createAdminClient();

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

  const booking = agreement.bookings as {
    id: string;
    renter_name: string;
    renter_email: string | null;
    start_date: string;
    end_date: string;
    duration_days: number;
    total_price: number;
    daily_rate: number;
    status: string;
    vehicles?: { make: string; model: string; year: number };
  } | null;

  const signUrl = agreement.sign_token
    ? `${BASE_URL}/sign/${agreement.sign_token}`
    : null;

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

          {/* ── Signed state: signature + audit trail ── */}
          {agreement.status === "signed" && (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Signed
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Typed name */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-xs text-emerald-600 mb-2 font-medium uppercase tracking-wide">
                    Electronic Signature
                  </p>
                  <p
                    className="text-3xl text-emerald-800 italic"
                    style={{ fontFamily: "cursive" }}
                  >
                    {agreement.renter_signature}
                  </p>
                </div>

                {/* Drawn signature image */}
                {agreement.signature_png_b64 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                      Drawn Signature
                    </p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={agreement.signature_png_b64}
                      alt="Drawn signature"
                      className="border rounded-lg bg-white max-h-24 w-auto"
                    />
                  </div>
                )}

                {/* Audit trail */}
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
                    Audit Trail
                  </p>
                  <div className="space-y-2">
                    {agreement.sent_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Clock className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div>
                          <span className="font-medium">Sent</span>
                          <span className="text-muted-foreground ml-2">
                            {formatDateTime(agreement.sent_at)}
                          </span>
                        </div>
                      </div>
                    )}
                    {agreement.viewed_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                          <Eye className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <div>
                          <span className="font-medium">Viewed by renter</span>
                          <span className="text-muted-foreground ml-2">
                            {formatDateTime(agreement.viewed_at)}
                          </span>
                        </div>
                      </div>
                    )}
                    {agreement.signed_at && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        </div>
                        <div>
                          <span className="font-medium">Signed</span>
                          <span className="text-muted-foreground ml-2">
                            {formatDateTime(agreement.signed_at)}
                          </span>
                        </div>
                      </div>
                    )}
                    {agreement.signer_ip && (
                      <div className="flex items-center gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                          <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <span className="font-medium">IP Address</span>
                          <span className="text-muted-foreground ml-2 font-mono text-xs">
                            {agreement.signer_ip}
                          </span>
                        </div>
                      </div>
                    )}
                    {agreement.signer_ua && (
                      <div className="flex items-start gap-3 text-sm">
                        <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Monitor className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                        <div>
                          <span className="font-medium">Device</span>
                          <span className="text-muted-foreground ml-2 text-xs break-all">
                            {agreement.signer_ua}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Send / Resend Actions (draft or sent) ── */}
          {(agreement.status === "draft" || agreement.status === "sent") && (
            <AgreementActions
              agreementId={agreement.id}
              bookingId={agreement.booking_id}
              currentStatus={agreement.status}
              signToken={agreement.sign_token}
            />
          )}
        </div>

        {/* Booking Sidebar */}
        <div className="space-y-4">
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
                      {booking.start_date} → {booking.end_date}
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

          <Card className="border-0 bg-white shadow-sm ring-0">
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
              {agreement.sent_at && (
                <div>
                  <p className="text-muted-foreground">Sent</p>
                  <p className="font-medium">
                    {formatDate(agreement.sent_at)}
                  </p>
                </div>
              )}
              {agreement.viewed_at && (
                <div>
                  <p className="text-muted-foreground">Viewed</p>
                  <p className="font-medium">
                    {formatDate(agreement.viewed_at)}
                  </p>
                </div>
              )}
              {agreement.signed_at && (
                <div>
                  <p className="text-muted-foreground">Signed</p>
                  <p className="font-medium">
                    {formatDate(agreement.signed_at)}
                  </p>
                </div>
              )}

              {/* Sign link (if not yet signed) */}
              {signUrl && agreement.status !== "signed" && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground text-xs mb-1">
                    Signing Link
                  </p>
                  <a
                    href={signUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#2EBD6B] underline break-all"
                  >
                    {signUrl}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
