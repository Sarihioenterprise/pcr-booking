"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Car, User, Calendar, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import InspectionPhotos from "@/app/components/inspection-photos/InspectionPhotos";
import type { ZonePhoto, Zone } from "@/app/components/inspection-photos/InspectionPhotos";

interface BookingSummary {
  id: string;
  renter_name: string;
  start_date: string;
  end_date: string;
  pickup_inspected: boolean;
  pickup_photos: Record<Zone, string> | null;
  vehicles: {
    year: number;
    make: string;
    model: string;
    color: string;
    plate: string | null;
  } | null;
}

export default function PickupInspectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [booking, setBooking] = useState<BookingSummary | null>(null);
  const [photoState, setPhotoState] = useState<Partial<Record<Zone, ZonePhoto>>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Load booking details
        const [bookingRes, photosRes] = await Promise.all([
          fetch(`/api/bookings/${id}`),
          fetch(`/api/bookings/${id}/zone-photos`),
        ]);

        if (!bookingRes.ok) {
          setError("Booking not found");
          return;
        }

        const bData = await bookingRes.json();
        setBooking(bData);

        if (bData.pickup_inspected) {
          setDone(true);
        }

        if (photosRes.ok) {
          const pData = await photosRes.json();
          // pickup_photos comes back as Record<zone, {path, url}>
          if (pData.pickup_photos && typeof pData.pickup_photos === "object") {
            setPhotoState(pData.pickup_photos as Record<Zone, ZonePhoto>);
          }
        }
      } catch {
        setError("Failed to load booking");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function handleComplete() {
    setDone(true);
    // Redirect to booking detail after short delay
    setTimeout(() => {
      router.push(`/dashboard/bookings/${id}?tab=inspections`);
    }, 2000);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin text-[#2EBD6B]" />
          <p className="text-sm font-medium">Loading inspection…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#F8F9FC] flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-slate-600">{error || "Booking not found"}</p>
          <Link href="/dashboard/bookings">
            <Button variant="outline">Back to Bookings</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/bookings/${id}`}>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              📷 Pickup Inspection
              {done && (
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                  Complete ✓
                </Badge>
              )}
            </h1>
            <p className="text-sm text-slate-500">Photograph all 4 vehicle zones before handoff</p>
          </div>
        </div>

        {/* Booking summary */}
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2EBD6B]/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-[#2EBD6B]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{booking.renter_name}</p>
                <p className="text-xs text-slate-500">Renter</p>
              </div>
            </div>
            {booking.vehicles && (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <Car className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {booking.vehicles.year} {booking.vehicles.make} {booking.vehicles.model}
                  </p>
                  <p className="text-xs text-slate-500">
                    {booking.vehicles.color}
                    {booking.vehicles.plate ? ` · ${booking.vehicles.plate}` : ""}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="h-4 w-4 text-slate-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatDate(booking.start_date)} → {formatDate(booking.end_date)}
                </p>
                <p className="text-xs text-slate-500">Rental period</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inspection photos */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#2EBD6B]" />
              Vehicle Photos — Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InspectionPhotos
              bookingId={id}
              type="pickup"
              onComplete={handleComplete}
              initialPhotos={photoState}
              alreadyComplete={done}
            />
          </CardContent>
        </Card>

        {done && (
          <div className="text-center text-sm text-slate-500">
            Redirecting to booking…
          </div>
        )}
      </div>
    </div>
  );
}
