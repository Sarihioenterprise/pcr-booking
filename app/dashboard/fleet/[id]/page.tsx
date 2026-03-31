import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type {
  Vehicle,
  VehiclePhoto,
  VehicleDocument,
  Booking,
  MaintenanceRecord,
  PricingRule,
  BlackoutDate,
} from "@/lib/types";
import { VehicleDetailTabs } from "./vehicle-detail-tabs";

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select("*, locations(id, name, address, city, state)")
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (!vehicle) notFound();

  const [
    { data: photos },
    { data: documents },
    { data: bookings },
    { data: maintenance },
    { data: pricingRules },
    { data: blackoutDates },
  ] = await Promise.all([
    supabase
      .from("vehicle_photos")
      .select("*")
      .eq("vehicle_id", id)
      .order("sort_order"),
    supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*")
      .eq("vehicle_id", id)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("maintenance_records")
      .select("*")
      .eq("vehicle_id", id)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("pricing_rules")
      .select("*")
      .eq("vehicle_id", id)
      .eq("operator_id", operator.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("blackout_dates")
      .select("*")
      .eq("vehicle_id", id)
      .eq("operator_id", operator.id)
      .order("start_date"),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fleet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
          <p className="text-muted-foreground">
            {vehicle.color} &middot; {vehicle.plate || "No plate"}
          </p>
        </div>
      </div>

      <VehicleDetailTabs
        vehicle={vehicle as Vehicle & { locations: { id: string; name: string; address: string; city: string; state: string } | null }}
        photos={(photos ?? []) as VehiclePhoto[]}
        documents={(documents ?? []) as VehicleDocument[]}
        bookings={(bookings ?? []) as Booking[]}
        maintenance={(maintenance ?? []) as MaintenanceRecord[]}
        pricingRules={(pricingRules ?? []) as PricingRule[]}
        blackoutDates={(blackoutDates ?? []) as BlackoutDate[]}
      />
    </div>
  );
}
