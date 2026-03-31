import { createClient } from "@/lib/supabase/server";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ClipboardCheck,
  Plus,
  Clock,
  CheckCircle2,
} from "lucide-react";
import type { Inspection } from "@/lib/types";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

const typeColors: Record<string, string> = {
  pre_rental: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  post_rental: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

type InspectionWithVehicle = Inspection & {
  vehicles: { make: string; model: string; year: number } | null;
};

function InspectionTable({
  inspections,
}: {
  inspections: InspectionWithVehicle[];
}) {
  if (inspections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <ClipboardCheck className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No inspections found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Vehicle</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Mileage</TableHead>
          <TableHead>Fuel</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {inspections.map((inspection) => (
          <TableRow key={inspection.id}>
            <TableCell>
              {new Date(inspection.created_at).toLocaleDateString()}
            </TableCell>
            <TableCell className="font-medium">
              {inspection.vehicles
                ? `${inspection.vehicles.year} ${inspection.vehicles.make} ${inspection.vehicles.model}`
                : "—"}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={typeColors[inspection.type] || ""}
              >
                {inspection.type.replace("_", "-")}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={statusColors[inspection.status] || ""}
              >
                {inspection.status}
              </Badge>
            </TableCell>
            <TableCell>
              {inspection.mileage
                ? inspection.mileage.toLocaleString()
                : "—"}
            </TableCell>
            <TableCell>{inspection.fuel_level || "—"}</TableCell>
            <TableCell>
              <Link href={`/dashboard/inspections/${inspection.id}`}>
                <Button variant="ghost" size="sm">
                  View
                </Button>
              </Link>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function InspectionsPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: inspections } = await supabase
    .from("inspections")
    .select("*, vehicles(make, model, year)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const typedInspections = (inspections ?? []) as InspectionWithVehicle[];

  const totalCount = typedInspections.length;
  const pendingCount = typedInspections.filter(
    (i) => i.status === "pending"
  ).length;
  const completedCount = typedInspections.filter(
    (i) => i.status === "completed"
  ).length;

  const preRentalInspections = typedInspections.filter(
    (i) => i.type === "pre_rental"
  );
  const postRentalInspections = typedInspections.filter(
    (i) => i.type === "post_rental"
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inspections</h1>
          <p className="text-muted-foreground">
            Vehicle condition tracking and damage reporting
          </p>
        </div>
        <Link href="/dashboard/inspections/new">
          <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
            <Plus className="mr-2 h-4 w-4" />
            New Inspection
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <ClipboardCheck className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Total Inspections
              </p>
              <p className="text-2xl font-bold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold text-amber-600">
                {pendingCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Completed</p>
              <p className="text-2xl font-bold text-emerald-600">
                {completedCount}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({totalCount})</TabsTrigger>
          <TabsTrigger value="pre_rental">
            Pre-Rental ({preRentalInspections.length})
          </TabsTrigger>
          <TabsTrigger value="post_rental">
            Post-Rental ({postRentalInspections.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <InspectionTable inspections={typedInspections} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pre_rental">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <InspectionTable inspections={preRentalInspections} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="post_rental">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <InspectionTable inspections={postRentalInspections} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
