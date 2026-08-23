"use client";

import { useWizard } from "../WizardContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { CheckCircle2, ArrowRight, CalendarDays, Car } from "lucide-react";

export function Step9Confirmation() {
  const { state } = useWizard();

  const vehicleName = state.vehicle
    ? `${state.vehicle.year} ${state.vehicle.make} ${state.vehicle.model}`
    : "—";
  const renterName = `${state.first_name} ${state.last_name}`.trim();

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardContent className="py-10 flex flex-col items-center text-center gap-6">
        {/* Big check */}
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#2EBD6B]/10">
          <CheckCircle2 className="h-12 w-12 text-[#2EBD6B]" />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-gray-900">Booking Created!</h2>
          {state.booking_id && (
            <p className="mt-1 text-sm text-gray-500 font-mono">
              #{state.booking_id.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>

        {/* Quick details */}
        <div className="w-full max-w-sm rounded-xl bg-[#F8F9FC] border border-gray-100 p-5 space-y-3 text-left">
          <div className="flex items-center gap-2 text-sm">
            <Car className="h-4 w-4 text-[#2EBD6B] shrink-0" />
            <span className="text-gray-500">Vehicle</span>
            <span className="ml-auto font-medium text-gray-900 text-right">{vehicleName}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="h-4 w-4 text-[#2EBD6B] shrink-0" />
            <span className="text-gray-500">Period</span>
            <span className="ml-auto font-medium text-gray-900 text-right">
              {state.start_date} → {state.end_date}
            </span>
          </div>
          {renterName && (
            <div className="flex items-center gap-2 text-sm">
              <span className="h-4 w-4 shrink-0" />
              <span className="text-gray-500">Renter</span>
              <span className="ml-auto font-medium text-gray-900 text-right">{renterName}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-sm border-t border-gray-200 pt-3 mt-2">
            <span className="text-gray-500">Total</span>
            <span className="ml-auto text-lg font-bold text-[#2EBD6B]">
              ${state.grand_total.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap gap-2 justify-center">
          {state.agreement_id && (
            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 className="h-3 w-3" /> Agreement signed
            </span>
          )}
          {state.payment_status === "succeeded" && (
            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 className="h-3 w-3" /> Payment collected
            </span>
          )}
          {state.payment_status === "pending_auth" && (
            <span className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-full font-medium">
              Deposit request sent
            </span>
          )}
          {state.pickup_inspection_id && (
            <span className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium">
              <CheckCircle2 className="h-3 w-3" /> Pickup photos saved
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          {state.booking_id && (
            <Link href={`/dashboard/bookings/${state.booking_id}`} className="flex-1">
              <Button className="w-full bg-[#2EBD6B] text-white hover:bg-[#27a85e]">
                View Booking <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          )}
          <Link href="/dashboard/bookings" className="flex-1">
            <Button variant="outline" className="w-full border-gray-200">
              All Bookings
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
