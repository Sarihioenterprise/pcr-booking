import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { TicketThread } from "./ticket-thread";

const statusColors: Record<string, string> = {
  open: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  resolved: "bg-emerald-100 text-emerald-700 border-emerald-200",
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
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select(
      "*, ticket_messages(*), bookings(id, renter_name, start_date, end_date, vehicles(make, model, year))"
    )
    .eq("id", id)
    .eq("operator_id", operator.id)
    .single();

  if (error || !ticket) {
    notFound();
  }

  const messages = Array.isArray(ticket.ticket_messages)
    ? ticket.ticket_messages.sort(
        (a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
    : [];

  const booking = ticket.bookings;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/support">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{ticket.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className={statusColors[ticket.status] || ""}
            >
              {ticket.status === "in_progress"
                ? "In Progress"
                : ticket.status.charAt(0).toUpperCase() +
                  ticket.status.slice(1)}
            </Badge>
            <Badge
              variant="outline"
              className={priorityColors[ticket.priority] || ""}
            >
              {ticket.priority}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Opened {formatDate(ticket.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Thread */}
        <div className="lg:col-span-2">
          <TicketThread
            ticketId={ticket.id}
            initialMessages={messages}
            operatorName={operator.owner_name}
            currentStatus={ticket.status}
            currentPriority={ticket.priority}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Ticket Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Renter</p>
                <p className="font-medium">{ticket.renter_name}</p>
              </div>
              {ticket.renter_email && (
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{ticket.renter_email}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">Ticket ID</p>
                <p className="font-mono text-xs">
                  {ticket.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </CardContent>
          </Card>

          {booking && (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardHeader>
                <CardTitle>Linked Booking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Renter</p>
                  <p className="font-medium">{booking.renter_name}</p>
                </div>
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
                <div className="pt-2 border-t">
                  <Link href={`/dashboard/bookings/${booking.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      View Booking
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
