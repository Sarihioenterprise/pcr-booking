import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  HeadphonesIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
} from "lucide-react";

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusLabels: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-600 border-slate-200",
  normal: "bg-blue-100 text-blue-600 border-blue-200",
  high: "bg-orange-100 text-orange-600 border-orange-200",
  urgent: "bg-red-100 text-red-600 border-red-200",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const operator = await getOperator();
  const supabase = await createClient();
  const { status: filterStatus } = await searchParams;

  let query = supabase
    .from("support_tickets")
    .select("*, bookings(id, renter_name)")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  if (filterStatus && filterStatus !== "all") {
    query = query.eq("status", filterStatus);
  }

  const { data: tickets } = await query;
  const safeTickets = (tickets || []) as any[];

  // Count by status
  const { data: allTickets } = await supabase
    .from("support_tickets")
    .select("status")
    .eq("operator_id", operator.id);

  const counts = {
    open: (allTickets || []).filter((t) => t.status === "open").length,
    in_progress: (allTickets || []).filter((t) => t.status === "in_progress")
      .length,
    resolved: (allTickets || []).filter((t) => t.status === "resolved").length,
  };

  const activeFilter = filterStatus || "all";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support Tickets</h1>
        <p className="text-muted-foreground">
          Manage renter support requests
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.open}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.in_progress}</p>
              <p className="text-sm text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{counts.resolved}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { value: "all", label: "All" },
          { value: "open", label: "Open" },
          { value: "in_progress", label: "In Progress" },
          { value: "resolved", label: "Resolved" },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/support${tab.value !== "all" ? `?status=${tab.value}` : ""}`}
          >
            <Button
              variant={activeFilter === tab.value ? "default" : "outline"}
              size="sm"
              style={
                activeFilter === tab.value
                  ? { backgroundColor: "#2EBD6B" }
                  : {}
              }
            >
              {tab.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Tickets Table */}
      {safeTickets.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <HeadphonesIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No tickets</h3>
            <p className="text-sm text-muted-foreground">
              {filterStatus
                ? `No ${statusLabels[filterStatus]?.toLowerCase() || filterStatus} tickets found.`
                : "No support tickets have been submitted yet."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ticket #</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Renter</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {safeTickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-mono text-xs">
                      {ticket.id.slice(0, 8).toUpperCase()}
                    </TableCell>
                    <TableCell className="font-medium">
                      {ticket.subject}
                    </TableCell>
                    <TableCell>{ticket.renter_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {ticket.booking_id
                        ? ticket.booking_id.slice(0, 8).toUpperCase()
                        : "---"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={priorityColors[ticket.priority] || ""}
                      >
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={statusColors[ticket.status] || ""}
                      >
                        {statusLabels[ticket.status] || ticket.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(ticket.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/dashboard/support/${ticket.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
