"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Clock, AlertTriangle, XCircle } from "lucide-react";
import type { PaymentScheduleItem } from "@/lib/types";

const statusConfig: Record<
  PaymentScheduleItem["status"],
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    icon: Clock,
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    icon: CheckCircle,
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: AlertTriangle,
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/10 text-red-600 border-red-500/20",
    icon: XCircle,
  },
};

interface PaymentScheduleTableProps {
  items: (PaymentScheduleItem & {
    booking_renter_name?: string;
    booking_vehicle?: string;
  })[];
  showBookingInfo?: boolean;
}

export function PaymentScheduleTable({
  items: initialItems,
  showBookingInfo = false,
}: PaymentScheduleTableProps) {
  const [items, setItems] = useState(initialItems);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const supabase = createClient();

  async function markAsPaid(itemId: string) {
    setLoadingId(itemId);
    try {
      const { error } = await supabase
        .from("payment_schedule")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", itemId);

      if (!error) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? { ...item, status: "paid" as const, paid_at: new Date().toISOString() }
              : item
          )
        );
      }
    } finally {
      setLoadingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No payment schedule items found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showBookingInfo && <TableHead>Renter</TableHead>}
          {showBookingInfo && <TableHead>Vehicle</TableHead>}
          <TableHead>Due Date</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Paid At</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => {
          const config = statusConfig[item.status];
          const StatusIcon = config.icon;
          return (
            <TableRow key={item.id}>
              {showBookingInfo && (
                <TableCell className="font-medium">
                  {item.booking_renter_name || "—"}
                </TableCell>
              )}
              {showBookingInfo && (
                <TableCell className="text-muted-foreground">
                  {item.booking_vehicle || "—"}
                </TableCell>
              )}
              <TableCell>
                {new Date(item.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </TableCell>
              <TableCell className="font-semibold">
                ${Number(item.amount).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={config.className}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {item.paid_at
                  ? new Date(item.paid_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </TableCell>
              <TableCell className="text-right">
                {item.status !== "paid" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => markAsPaid(item.id)}
                    disabled={loadingId === item.id}
                  >
                    {loadingId === item.id ? "Saving..." : "Mark Paid"}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
