"use client";

import { Shield, Package } from "lucide-react";
import type { AddonSnapshot } from "@/lib/types";

interface Props {
  addons: AddonSnapshot[];
  addons_total?: number | null;
  className?: string;
}

/**
 * AddonBreakdown — shows itemized add-ons snapshot stored in leads/bookings.
 * Used in dashboard lead detail and booking detail views.
 */
export function AddonsBreakdown({ addons, addons_total, className = "" }: Props) {
  if (!addons || addons.length === 0) return null;

  const total =
    addons_total !== undefined && addons_total !== null
      ? addons_total
      : addons.reduce((sum, a) => sum + a.amount, 0);

  return (
    <div className={`rounded-xl border border-gray-100 bg-gray-50 overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <Shield className="h-4 w-4 text-gray-500" />
        <span className="text-sm font-semibold text-gray-800">
          Selected Add-ons
        </span>
        <span className="ml-auto text-sm font-semibold text-gray-900">
          +${total.toFixed(2)}
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {addons.map((addon, i) => (
          <div key={addon.id ?? i} className="flex items-center justify-between px-4 py-2.5">
            <div className="flex items-center gap-2 min-w-0">
              {addon.category === "insurance" ? (
                <Shield className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              ) : (
                <Package className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-900 font-medium truncate">{addon.name}</p>
                <p className="text-xs text-gray-400">
                  {addon.pricing_type === "per_day"
                    ? `${addon.days} day${addon.days !== 1 ? "s" : ""} × $${Number(addon.price).toFixed(2)}/day`
                    : "Flat fee"}
                </p>
              </div>
            </div>
            <span className="ml-4 text-sm font-semibold text-gray-800 shrink-0">
              ${Number(addon.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
