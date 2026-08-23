"use client";

import { Shield, Package, Check } from "lucide-react";

export interface AddonCardAddon {
  id: string;
  name: string;
  description: string | null;
  pricing_type: "per_day" | "flat";
  price: number;
  category: string;
  required: boolean;
  image_url?: string | null;
  highlight_text?: string | null;
}

interface AddonCardProps {
  addon: AddonCardAddon;
  isSelected: boolean;
  onToggle: (id: string) => void;
  /** Optional: number of days to compute per-day totals */
  days?: number;
}

export function AddonCard({ addon, isSelected, onToggle, days }: AddonCardProps) {
  const isInsurance = addon.category === "insurance";
  const lineTotal =
    days && days > 0 && addon.pricing_type === "per_day"
      ? Number(addon.price) * days
      : null;

  return (
    <div
      className={[
        "relative border-2 rounded-xl p-4 transition-all select-none",
        isSelected
          ? isInsurance
            ? "border-blue-500 bg-blue-50"
            : "border-[#2EBD6B] bg-emerald-50"
          : "border-gray-200 bg-white hover:border-gray-300",
        addon.required ? "cursor-default" : "cursor-pointer",
      ].join(" ")}
      onClick={() => !addon.required && onToggle(addon.id)}
      role={addon.required ? undefined : "button"}
      tabIndex={addon.required ? undefined : 0}
      onKeyDown={(e) => {
        if (!addon.required && (e.key === "Enter" || e.key === " ")) onToggle(addon.id);
      }}
      aria-pressed={isSelected}
    >
      {/* Highlight badge (e.g. "Recommended", "Most Popular") */}
      {addon.highlight_text && (
        <span
          className={[
            "absolute -top-2.5 left-4 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full",
            isInsurance ? "bg-blue-500" : "bg-[#2EBD6B]",
          ].join(" ")}
        >
          {addon.highlight_text}
        </span>
      )}

      {/* Image (optional) */}
      {addon.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={addon.image_url}
          alt={addon.name}
          className="w-full h-24 object-cover rounded-lg mb-3"
        />
      ) : (
        /* Default icon area */
        <div
          className={[
            "w-10 h-10 rounded-lg flex items-center justify-center mb-3",
            isInsurance ? "bg-blue-100" : "bg-emerald-100",
          ].join(" ")}
        >
          {isInsurance ? (
            <Shield className={`h-5 w-5 ${isSelected ? "text-blue-600" : "text-blue-400"}`} />
          ) : (
            <Package className={`h-5 w-5 ${isSelected ? "text-[#2EBD6B]" : "text-emerald-400"}`} />
          )}
        </div>
      )}

      {/* Name + Required lock */}
      <div className="flex items-center justify-between mb-1 gap-2">
        <span className="font-semibold text-gray-900 text-sm leading-tight">{addon.name}</span>
        {addon.required && (
          <span className="shrink-0 text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-medium">
            Required
          </span>
        )}
      </div>

      {/* Description */}
      {addon.description && (
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">{addon.description}</p>
      )}

      {/* Price */}
      <div className="flex items-end justify-between gap-2">
        <p className="text-base font-bold text-gray-900">
          ${Number(addon.price).toFixed(2)}
          <span className="text-xs font-normal text-gray-400 ml-0.5">
            {addon.pricing_type === "per_day" ? "/day" : " flat"}
          </span>
        </p>
        {lineTotal !== null && (
          <p className="text-xs text-gray-400 mb-0.5">= ${lineTotal.toFixed(2)} total</p>
        )}
      </div>

      {/* Select button */}
      {!addon.required && (
        <button
          type="button"
          className={[
            "mt-3 w-full py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5",
            isSelected
              ? isInsurance
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200",
          ].join(" ")}
          onClick={(e) => {
            e.stopPropagation();
            onToggle(addon.id);
          }}
        >
          {isSelected && <Check className="h-3.5 w-3.5" />}
          {isSelected ? "Added" : "Add"}
        </button>
      )}
    </div>
  );
}
