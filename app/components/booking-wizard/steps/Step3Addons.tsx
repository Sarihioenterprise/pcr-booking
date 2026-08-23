"use client";

import { useState, useEffect, useMemo } from "react";
import { useWizard } from "../WizardContext";
import { WizardAddon } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, ChevronLeft, ChevronRight } from "lucide-react";
import { AddonCard } from "@/app/components/addons/AddonCard";

interface Step3Props {
  onNext: () => void;
  onBack: () => void;
  operatorId: string;
}

export function Step3Addons({ onNext, onBack, operatorId }: Step3Props) {
  const { state, dispatch } = useWizard();
  const [loading, setLoading] = useState(true);
  const [rawAddons, setRawAddons] = useState<WizardAddon[]>([]);

  useEffect(() => {
    if (!operatorId) return;
    setLoading(true);
    fetch(`/api/addons/public?operator_id=${operatorId}`)
      .then((r) => r.json())
      .then((d) => {
        const addons: WizardAddon[] = (d.addons ?? []).map(
          (a: Omit<WizardAddon, "quantity">) => ({
            ...a,
            quantity: a.required ? 1 : 0,
          })
        );
        setRawAddons(addons);
        // Sync to wizard state if not already set
        if (state.addons.length === 0) {
          const selected = addons.filter((a) => a.required);
          const addons_total = calcTotal(selected, state.duration_days);
          dispatch({
            type: "SET_ADDONS",
            payload: {
              addons: selected,
              addons_total,
              grand_total: state.vehicle_subtotal + addons_total,
            },
          });
        }
      })
      .catch(() => setRawAddons([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [operatorId]);

  function calcTotal(addons: WizardAddon[], days: number): number {
    return addons
      .filter((a) => a.quantity > 0)
      .reduce(
        (sum, a) =>
          sum + (a.pricing_type === "per_day" ? Number(a.price) * days : Number(a.price)),
        0
      );
  }

  function toggle(addonId: string) {
    setRawAddons((prev) =>
      prev.map((a) =>
        a.id === addonId && !a.required
          ? { ...a, quantity: a.quantity > 0 ? 0 : 1 }
          : a
      )
    );
  }

  const selectedAddons = useMemo(
    () => rawAddons.filter((a) => a.quantity > 0),
    [rawAddons]
  );

  const addons_total = useMemo(
    () => calcTotal(selectedAddons, state.duration_days),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedAddons, state.duration_days]
  );

  function handleNext() {
    dispatch({
      type: "SET_ADDONS",
      payload: {
        addons: selectedAddons,
        addons_total,
        grand_total: state.vehicle_subtotal + addons_total,
      },
    });
    onNext();
  }

  if (loading) {
    return (
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Loading add-ons…</p>
        </CardContent>
      </Card>
    );
  }

  const insurance = rawAddons.filter((a) => a.category === "insurance");
  const extras = rawAddons.filter((a) => a.category !== "insurance");

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <Package className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Protections &amp; Add-Ons
          {selectedAddons.length > 0 && (
            <Badge variant="secondary" className="ml-auto bg-[#2EBD6B]/10 text-[#2EBD6B] text-xs">
              {selectedAddons.length} selected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {rawAddons.length === 0 ? (
          <div className="py-8 text-center">
            <Package className="h-8 w-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No add-ons configured for this operator.</p>
          </div>
        ) : (
          <>
            {/* Insurance / Protection section */}
            {insurance.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Protection Plans
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {insurance.map((addon) => (
                    <AddonCard
                      key={addon.id}
                      addon={addon}
                      isSelected={addon.quantity > 0}
                      onToggle={toggle}
                      days={state.duration_days}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Extras section */}
            {extras.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Extras &amp; Services
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {extras.map((addon) => (
                    <AddonCard
                      key={addon.id}
                      addon={addon}
                      isSelected={addon.quantity > 0}
                      onToggle={toggle}
                      days={state.duration_days}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Running total */}
            {addons_total > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-[#F8F9FC] px-4 py-3 border border-gray-100">
                <span className="text-sm text-gray-600">Add-ons subtotal</span>
                <span className="text-base font-bold text-gray-900">
                  +${addons_total.toFixed(2)}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-400">
              Protection plan pricing includes platform service fees.
              You will not be charged until your booking is confirmed.
            </p>
          </>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
          >
            Continue — Customer Info <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
