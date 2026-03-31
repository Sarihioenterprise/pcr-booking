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
import { Tag, ToggleLeft, ToggleRight } from "lucide-react";
import type { PromoCode } from "@/lib/types";

interface PaymentsPromoListProps {
  initialPromos: PromoCode[];
}

export function PaymentsPromoList({ initialPromos }: PaymentsPromoListProps) {
  const [promos, setPromos] = useState<PromoCode[]>(initialPromos);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const supabase = createClient();

  async function toggleActive(promo: PromoCode) {
    setTogglingId(promo.id);
    try {
      const newStatus = !promo.is_active;
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active: newStatus })
        .eq("id", promo.id);

      if (!error) {
        setPromos((prev) =>
          prev.map((p) =>
            p.id === promo.id ? { ...p, is_active: newStatus } : p
          )
        );
      }
    } finally {
      setTogglingId(null);
    }
  }

  if (promos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Tag className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p className="font-medium">No promo codes</p>
        <p className="text-sm mt-1">
          Create your first promo code to offer discounts.
        </p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Discount</TableHead>
          <TableHead>Uses</TableHead>
          <TableHead>Min. Days</TableHead>
          <TableHead>Valid Period</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {promos.map((promo) => (
          <TableRow key={promo.id}>
            <TableCell className="font-mono font-semibold">
              {promo.code}
            </TableCell>
            <TableCell className="text-muted-foreground max-w-[200px] truncate">
              {promo.description || "—"}
            </TableCell>
            <TableCell className="font-medium">
              {promo.type === "percentage"
                ? `${promo.value}%`
                : `$${Number(promo.value).toFixed(2)}`}
            </TableCell>
            <TableCell>
              {promo.used_count}
              {promo.max_uses !== null ? ` / ${promo.max_uses}` : " / Unlimited"}
            </TableCell>
            <TableCell>{promo.min_rental_days} day{promo.min_rental_days !== 1 ? "s" : ""}</TableCell>
            <TableCell className="text-muted-foreground">
              {promo.valid_from || promo.valid_until
                ? `${promo.valid_from ? new Date(promo.valid_from).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Any"} - ${promo.valid_until ? new Date(promo.valid_until).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Any"}`
                : "Always"}
            </TableCell>
            <TableCell>
              <Badge
                variant="outline"
                className={
                  promo.is_active
                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                }
              >
                {promo.is_active ? "Active" : "Inactive"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => toggleActive(promo)}
                disabled={togglingId === promo.id}
              >
                {promo.is_active ? (
                  <ToggleRight className="h-4 w-4 mr-1 text-emerald-600" />
                ) : (
                  <ToggleLeft className="h-4 w-4 mr-1" />
                )}
                {promo.is_active ? "Deactivate" : "Activate"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
