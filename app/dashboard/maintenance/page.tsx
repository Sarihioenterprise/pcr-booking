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
  Wrench,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlayCircle,
} from "lucide-react";
import type { MaintenanceRecord } from "@/lib/types";

const statusColors: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  overdue: "bg-red-500/10 text-red-600 border-red-500/20",
};

type MaintenanceWithVehicle = MaintenanceRecord & {
  vehicles: { make: string; model: string; year: number; plate: string | null } | null;
};

function MaintenanceTable({
  records,
}: {
  records: MaintenanceWithVehicle[];
}) {
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Wrench className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">No maintenance records found.</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Vehicle</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Cost</TableHead>
          <TableHead>Due Date</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {records.map((record) => (
          <TableRow key={record.id}>
            <TableCell className="font-medium">
              {record.vehicles
                ? `${record.vehicles.year} ${record.vehicles.make} ${record.vehicles.model}`
                : "—"}
            </TableCell>
            <TableCell>{record.type}</TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={statusColors[record.status] || ""}
              >
                {record.status.replace("_", " ")}
              </Badge>
            </TableCell>
            <TableCell>
              {record.cost ? `$${Number(record.cost).toFixed(2)}` : "—"}
            </TableCell>
            <TableCell>
              {record.date_due
                ? new Date(record.date_due).toLocaleDateString()
                : "—"}
            </TableCell>
            <TableCell>{record.vendor || "—"}</TableCell>
            <TableCell>
              <Link href={`/dashboard/maintenance/${record.id}`}>
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

export default async function MaintenancePage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: records } = await supabase
    .from("maintenance_records")
    .select("*, vehicles(make, model, year, plate)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const typedRecords = (records ?? []) as MaintenanceWithVehicle[];

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const scheduledCount = typedRecords.filter(
    (r) => r.status === "scheduled"
  ).length;
  const inProgressCount = typedRecords.filter(
    (r) => r.status === "in_progress"
  ).length;
  const overdueCount = typedRecords.filter(
    (r) => r.status === "overdue"
  ).length;
  const completedThisMonth = typedRecords.filter(
    (r) =>
      r.status === "completed" &&
      r.date_performed &&
      new Date(r.date_performed) >= startOfMonth
  ).length;

  const scheduled = typedRecords.filter((r) => r.status === "scheduled");
  const inProgress = typedRecords.filter((r) => r.status === "in_progress");
  const overdue = typedRecords.filter((r) => r.status === "overdue");
  const completed = typedRecords.filter((r) => r.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">
            Track vehicle service and maintenance
          </p>
        </div>
        <Link href="/dashboard/maintenance/new">
          <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
            <Plus className="mr-2 h-4 w-4" />
            Add Service Record
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Scheduled</p>
              <p className="text-2xl font-bold text-amber-600">
                {scheduledCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
              <PlayCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">
                {inProgressCount}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                Completed (Month)
              </p>
              <p className="text-2xl font-bold text-emerald-600">
                {completedThisMonth}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({typedRecords.length})</TabsTrigger>
          <TabsTrigger value="scheduled">
            Scheduled ({scheduled.length})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress ({inProgress.length})
          </TabsTrigger>
          <TabsTrigger value="overdue">Overdue ({overdue.length})</TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <MaintenanceTable records={typedRecords} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scheduled">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <MaintenanceTable records={scheduled} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="in_progress">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <MaintenanceTable records={inProgress} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overdue">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <MaintenanceTable records={overdue} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardContent className="pt-6">
              <MaintenanceTable records={completed} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
