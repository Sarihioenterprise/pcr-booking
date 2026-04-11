"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  AlertCircle,
  DollarSign,
  Users,
  TrendingUp,
  Clock,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type OverduePayment = {
  id: string;
  booking_id: string;
  amount: number;
  late_fee_amount: number;
  due_date: string;
  status: string;
  dunning_stage: string | null;
  last_reminder_sent_at: string | null;
  pay_link: string | null;
  renter_name: string;
  vehicle_label: string;
};

type DunningLogRow = {
  id: string;
  stage: string;
  channel: string;
  message_sent: string | null;
  sent_at: string;
  renter_name: string;
};

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)));
}

function overdueColor(days: number): string {
  if (days >= 7) return "text-red-400";
  if (days >= 4) return "text-orange-400";
  return "text-amber-400";
}

function stageLabel(stage: string | null): string {
  switch (stage) {
    case "reminder_1": return "1st Reminder";
    case "reminder_2": return "2nd Reminder";
    case "reminder_3": return "Final Warning";
    case "final": return "Final Stage";
    case "collections": return "Collections";
    default: return "Pending";
  }
}

function stageBadgeVariant(stage: string | null): "default" | "secondary" | "destructive" | "outline" {
  if (stage === "final" || stage === "collections") return "destructive";
  if (stage === "reminder_3") return "destructive";
  if (stage === "reminder_2") return "secondary";
  return "outline";
}

export function CollectionsClient() {
  const [overdue, setOverdue] = useState<OverduePayment[]>([]);
  const [dunningLog, setDunningLog] = useState<DunningLogRow[]>([]);
  const [paidThisMonth, setPaidThisMonth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    // Fetch overdue payments with booking + vehicle info
    const { data: payments } = await supabase
      .from("payment_schedule")
      .select(`
        id, booking_id, amount, late_fee_amount, due_date, status, dunning_stage, last_reminder_sent_at, pay_link,
        bookings(renter_name, vehicles(year, make, model))
      `)
      .or(`status.eq.overdue,and(status.eq.pending,due_date.lt.${today})`)
      .order("due_date", { ascending: true });

    if (payments) {
      const mapped: OverduePayment[] = payments.map((p: unknown) => {
        const row = p as {
          id: string;
          booking_id: string;
          amount: number;
          late_fee_amount: number;
          due_date: string;
          status: string;
          dunning_stage: string | null;
          last_reminder_sent_at: string | null;
          pay_link: string | null;
          bookings: {
            renter_name: string;
            vehicles: { year: number | null; make: string | null; model: string | null } | null;
          } | null;
        };
        const v = row.bookings?.vehicles;
        return {
          id: row.id,
          booking_id: row.booking_id,
          amount: Number(row.amount),
          late_fee_amount: Number(row.late_fee_amount ?? 0),
          due_date: row.due_date,
          status: row.status,
          dunning_stage: row.dunning_stage,
          last_reminder_sent_at: row.last_reminder_sent_at,
          pay_link: row.pay_link,
          renter_name: row.bookings?.renter_name ?? "Unknown",
          vehicle_label: v ? `${v.year ?? ""} ${v.make ?? ""} ${v.model ?? ""}`.trim() : "Unknown Vehicle",
        };
      });
      setOverdue(mapped);
    }

    // Fetch dunning log
    const { data: logs } = await supabase
      .from("dunning_log")
      .select(`
        id, stage, channel, message_sent, sent_at,
        bookings(renter_name)
      `)
      .order("sent_at", { ascending: false })
      .limit(50);

    if (logs) {
      setDunningLog(logs.map((l: unknown) => {
        const row = l as {
          id: string;
          stage: string;
          channel: string;
          message_sent: string | null;
          sent_at: string;
          bookings: { renter_name: string } | null;
        };
        return {
          id: row.id,
          stage: row.stage,
          channel: row.channel,
          message_sent: row.message_sent,
          sent_at: row.sent_at,
          renter_name: row.bookings?.renter_name ?? "Unknown",
        };
      }));
    }

    // Paid this month
    const firstOfMonth = new Date();
    firstOfMonth.setDate(1);
    firstOfMonth.setHours(0, 0, 0, 0);
    const { data: paidRows } = await supabase
      .from("payment_schedule")
      .select("amount")
      .eq("status", "paid")
      .gte("paid_at", firstOfMonth.toISOString());

    if (paidRows) {
      setPaidThisMonth(paidRows.reduce((sum: number, r: { amount: number }) => sum + Number(r.amount), 0));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleSendSMS(paymentScheduleId: string) {
    setSendingId(paymentScheduleId);
    try {
      await fetch("/api/collections/send-manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentScheduleId }),
      });
      await fetchData();
    } finally {
      setSendingId(null);
    }
  }

  async function handleMarkPaid(paymentScheduleId: string) {
    setMarkingPaidId(paymentScheduleId);
    try {
      const supabase = createClient();
      await supabase
        .from("payment_schedule")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", paymentScheduleId);
      await fetchData();
    } finally {
      setMarkingPaidId(null);
    }
  }

  const totalOverdue = overdue.reduce((sum, p) => sum + p.amount + p.late_fee_amount, 0);
  const avgDaysOverdue = overdue.length > 0
    ? Math.round(overdue.reduce((sum, p) => sum + daysOverdue(p.due_date), 0) / overdue.length)
    : 0;

  return (
    <div className="space-y-6" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Collections</h1>
        <p className="text-sm text-gray-500 mt-1">Track and manage overdue payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-100">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">${totalOverdue.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Total Overdue</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overdue.length}</p>
              <p className="text-sm text-gray-500">Overdue Accounts</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">${paidThisMonth.toFixed(2)}</p>
              <p className="text-sm text-gray-500">Collected This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-white shadow-sm">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
              <Clock className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{avgDaysOverdue}</p>
              <p className="text-sm text-gray-500">Avg Days Overdue</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Payments Table */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-base flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" /> Overdue Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : overdue.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No overdue payments — you&apos;re all caught up!</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-gray-500">Renter</TableHead>
                    <TableHead className="text-gray-500">Vehicle</TableHead>
                    <TableHead className="text-gray-500">Amount Due</TableHead>
                    <TableHead className="text-gray-500">Days Overdue</TableHead>
                    <TableHead className="text-gray-500">Late Fee</TableHead>
                    <TableHead className="text-gray-500">Stage</TableHead>
                    <TableHead className="text-gray-500">Last Reminder</TableHead>
                    <TableHead className="text-gray-500">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overdue.map((p) => {
                    const days = daysOverdue(p.due_date);
                    return (
                      <TableRow key={p.id} className="border-gray-100 hover:bg-gray-50">
                        <TableCell className="text-gray-900 font-medium">{p.renter_name}</TableCell>
                        <TableCell className="text-gray-600">{p.vehicle_label}</TableCell>
                        <TableCell className="text-gray-900 font-semibold">
                          ${(p.amount + p.late_fee_amount).toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <span className={`font-semibold ${overdueColor(days)}`}>{days}d</span>
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {p.late_fee_amount > 0 ? `$${p.late_fee_amount.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stageBadgeVariant(p.dunning_stage)}>
                            {stageLabel(p.dunning_stage)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {p.last_reminder_sent_at
                            ? new Date(p.last_reminder_sent_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              disabled={sendingId === p.id}
                              onClick={() => handleSendSMS(p.id)}
                            >
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {sendingId === p.id ? "Sending…" : "Send SMS"}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
                              disabled={markingPaidId === p.id}
                              onClick={() => handleMarkPaid(p.id)}
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              {markingPaidId === p.id ? "Saving…" : "Mark Paid"}
                            </Button>
                            <Link href={`/dashboard/bookings/${p.booking_id}`}>
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-400 hover:text-gray-700">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dunning Log */}
      <Card className="border-0 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-gray-900 text-base">Recent Dunning Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {dunningLog.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400 text-sm">No messages sent yet</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-100 hover:bg-transparent">
                    <TableHead className="text-gray-500">Renter</TableHead>
                    <TableHead className="text-gray-500">Stage</TableHead>
                    <TableHead className="text-gray-500">Channel</TableHead>
                    <TableHead className="text-gray-500">Message</TableHead>
                    <TableHead className="text-gray-500">Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dunningLog.map((log) => (
                    <TableRow key={log.id} className="border-gray-100 hover:bg-gray-50">
                      <TableCell className="text-gray-900 font-medium">{log.renter_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{stageLabel(log.stage)}</Badge>
                      </TableCell>
                      <TableCell className="text-gray-600 text-sm capitalize">{log.channel}</TableCell>
                      <TableCell className="text-gray-500 text-xs max-w-xs truncate">
                        {log.message_sent ?? "—"}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {new Date(log.sent_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
