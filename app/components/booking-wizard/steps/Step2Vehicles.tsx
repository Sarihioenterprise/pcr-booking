"use client";

import { useState, useEffect } from "react";
import { useWizard } from "../WizardContext";
import { WizardVehicle } from "../types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Car, ChevronLeft, ChevronRight, Check, Star } from "lucide-react";

interface Step2Props {
  onNext: () => void;
  onBack: () => void;
}

function calcRate(v: WizardVehicle, days: number): number {
  if (days >= 30 && v.monthly_rate) return v.monthly_rate / 30;
  if (days >= 7 && v.weekly_rate) return v.weekly_rate / 7;
  return v.daily_rate;
}

export function Step2Vehicles({ onNext, onBack }: Step2Props) {
  const { state, dispatch } = useWizard();
  const [vehicles, setVehicles] = useState<WizardVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch("/api/vehicles")
      .then((r) => r.json())
      .then((d) => {
        const all: WizardVehicle[] = d.vehicles ?? [];
        setVehicles(all.filter((v) => v.status === "active"));
      })
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  }, []);

  // Group by category
  const categories = Array.from(new Set(vehicles.map((v) => v.category || "Other")));

  function selectVehicle(v: WizardVehicle) {
    const rate = calcRate(v, state.duration_days);
    const vehicle_subtotal = rate * state.duration_days;
    const grand_total = vehicle_subtotal + state.addons_total;
    dispatch({
      type: "SET_VEHICLE",
      payload: { vehicle: v, vehicle_subtotal, grand_total },
    });
  }

  function handleNext() {
    if (!state.vehicle) {
      setError("Please select a vehicle to continue.");
      return;
    }
    setError("");
    onNext();
  }

  if (loading) {
    return (
      <Card className="border-0 bg-white shadow-sm">
        <CardContent className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
          <p className="mt-3 text-sm text-gray-500">Loading available vehicles…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-white shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#2EBD6B]/10">
            <Car className="h-3.5 w-3.5 text-[#2EBD6B]" />
          </div>
          Select a Vehicle
          {state.duration_days > 0 && (
            <span className="ml-auto text-xs text-gray-400 font-normal">
              {state.duration_days} day{state.duration_days !== 1 ? "s" : ""}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <Car className="h-10 w-10 text-gray-200" />
            <p className="text-sm text-gray-500">No active vehicles found in your fleet.</p>
            <a href="/dashboard/fleet/new" className="text-sm text-[#2EBD6B] hover:underline">
              Add a vehicle →
            </a>
          </div>
        ) : (
          categories.map((cat) => (
            <div key={cat} className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                {cat}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {vehicles
                  .filter((v) => (v.category || "Other") === cat)
                  .map((v) => {
                    const isSelected = state.vehicle?.id === v.id;
                    const rate = calcRate(v, state.duration_days);
                    const subtotal = rate * Math.max(1, state.duration_days);
                    const isWeekly = state.duration_days >= 7 && !!v.weekly_rate;
                    const isMonthly = state.duration_days >= 30 && !!v.monthly_rate;

                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => selectVehicle(v)}
                        className={`relative rounded-xl border-2 text-left transition-all overflow-hidden ${
                          isSelected
                            ? "border-[#2EBD6B] shadow-md"
                            : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                        }`}
                      >
                        {/* Photo */}
                        {v.photo_url ? (
                          <div className="h-32 overflow-hidden bg-gray-50">
                            <img
                              src={v.photo_url}
                              alt={`${v.year} ${v.make} ${v.model}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-20 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                            <Car className="h-8 w-8 text-gray-300" />
                          </div>
                        )}

                        {/* Selected badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 flex h-6 w-6 items-center justify-center rounded-full bg-[#2EBD6B] shadow">
                            <Check className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}

                        <div className="p-3 space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {v.year} {v.make} {v.model}
                            </p>
                            {v.color && (
                              <p className="text-xs text-gray-400">{v.color}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-lg font-bold text-gray-900">
                                ${rate.toFixed(0)}
                              </span>
                              <span className="text-xs text-gray-400">/day</span>
                              {(isWeekly || isMonthly) && (
                                <Badge
                                  variant="secondary"
                                  className={`ml-2 text-[9px] ${isMonthly ? "bg-purple-50 text-purple-600" : "bg-blue-50 text-blue-600"}`}
                                >
                                  {isMonthly ? "Monthly rate" : "Weekly rate"}
                                </Badge>
                              )}
                            </div>
                            {state.duration_days > 0 && (
                              <span className="text-sm font-semibold text-[#2EBD6B]">
                                ${subtotal.toFixed(0)} total
                              </span>
                            )}
                          </div>

                          {v.minimum_rental_days > 1 && (
                            <p className="text-[10px] text-amber-600 flex items-center gap-1">
                              <Star className="h-2.5 w-2.5" />
                              Min {v.minimum_rental_days} day rental
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          ))
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1 border-gray-200">
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <Button
            onClick={handleNext}
            className="flex-1 bg-[#2EBD6B] text-white hover:bg-[#27a85e]"
          >
            Continue — Add-ons <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
