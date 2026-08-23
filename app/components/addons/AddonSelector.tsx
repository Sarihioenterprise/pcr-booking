"use client";

import { AddonCard, AddonCardAddon } from "./AddonCard";

interface SelectedAddon extends AddonCardAddon {
  quantity: number;
}

interface AddonSelectorProps {
  addons: SelectedAddon[];
  days?: number;
  onChange: (selected: SelectedAddon[]) => void;
}

function calcTotal(addons: SelectedAddon[], days: number): number {
  return addons
    .filter((a) => a.quantity > 0)
    .reduce(
      (sum, a) =>
        sum + (a.pricing_type === "per_day" ? Number(a.price) * days : Number(a.price)),
      0
    );
}

export function AddonSelector({ addons, days = 1, onChange }: AddonSelectorProps) {
  function handleToggle(id: string) {
    const updated = addons.map((a) =>
      a.id === id ? { ...a, quantity: a.quantity > 0 ? 0 : 1 } : a
    );
    onChange(updated);
  }

  const insurance = addons.filter((a) => a.category === "insurance");
  const extras = addons.filter((a) => a.category !== "insurance");
  const selectedTotal = calcTotal(addons, days);

  if (addons.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-gray-400">No add-ons configured for this operator.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Insurance / Protection section */}
      {insurance.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-full bg-blue-500" />
            Protection Plans
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insurance.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addon.quantity > 0}
                onToggle={handleToggle}
                days={days}
              />
            ))}
          </div>
        </div>
      )}

      {/* Extras section */}
      {extras.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
            <span className="inline-block w-1 h-3.5 rounded-full bg-[#2EBD6B]" />
            Extras &amp; Services
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {extras.map((addon) => (
              <AddonCard
                key={addon.id}
                addon={addon}
                isSelected={addon.quantity > 0}
                onToggle={handleToggle}
                days={days}
              />
            ))}
          </div>
        </div>
      )}

      {/* Running total */}
      {selectedTotal > 0 && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-4 py-3">
          <span className="text-sm text-gray-600">Add-ons subtotal</span>
          <span className="text-base font-bold text-gray-900">
            +${selectedTotal.toFixed(2)}
          </span>
        </div>
      )}

      {/* Platform fee note */}
      <p className="text-xs text-gray-400">
        Protection plan pricing includes platform service fees.
        You will not be charged until your booking is confirmed.
      </p>
    </div>
  );
}
