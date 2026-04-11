import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Car, Gauge, Fuel, BarChart3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import type { Vehicle } from "@/lib/types";

const statusStyles: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  inactive: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  maintenance: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

export default async function FleetPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*, locations(name)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const typedVehicles = (vehicles ?? []) as (Vehicle & {
    locations: { name: string } | null;
  })[];

  const activeCount = typedVehicles.filter((v) => v.status === "active").length;
  const maintenanceCount = typedVehicles.filter(
    (v) => v.status === "maintenance"
  ).length;
  const inactiveCount = typedVehicles.filter(
    (v) => v.status === "inactive"
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fleet</h1>
          <p className="text-muted-foreground">
            {typedVehicles.length} vehicles &middot; {activeCount} active
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/fleet/revenue" className="hidden sm:block">
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Revenue Report
            </Button>
          </Link>
          <Link href="/dashboard/fleet/new">
            <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
              <Plus className="mr-2 h-4 w-4" />
              Add Vehicle
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-emerald-600">{activeCount}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">In Maintenance</p>
            <p className="text-2xl font-bold text-amber-600">
              {maintenanceCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-slate-500">{inactiveCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Grid */}
      {typedVehicles.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="mb-2 text-lg font-medium text-gray-500">
              No vehicles yet
            </p>
            <p className="mb-4 text-sm text-gray-400">
              Add your first vehicle to get started.
            </p>
            <Link href="/dashboard/fleet/new">
              <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                Add Vehicle
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {typedVehicles.map((vehicle) => (
            <Link
              key={vehicle.id}
              href={`/dashboard/fleet/${vehicle.id}`}
              className="group"
            >
              <Card className="border-0 bg-white shadow-sm ring-0 transition-shadow hover:shadow-md">
                {/* Photo */}
                {vehicle.photo_url ? (
                  <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-gray-100">
                    <img
                      src={vehicle.photo_url}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-video w-full items-center justify-center rounded-t-lg bg-gray-50">
                    <Car className="h-12 w-12 text-gray-300" />
                  </div>
                )}

                <CardContent className="pt-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {vehicle.plate || "No plate"}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={statusStyles[vehicle.status]}
                    >
                      {vehicle.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">
                        ${Number(vehicle.daily_rate).toFixed(0)}
                      </span>
                      /day
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3" />
                      {vehicle.mileage?.toLocaleString() ?? "—"}
                    </div>
                    <div className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      {vehicle.fuel_level || "—"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
