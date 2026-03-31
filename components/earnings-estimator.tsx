"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Car, MapPin } from "lucide-react";

const CITIES = [
  { name: "New York", multiplier: 1.4 },
  { name: "Los Angeles", multiplier: 1.2 },
  { name: "Chicago", multiplier: 1.1 },
  { name: "Houston", multiplier: 0.95 },
  { name: "Phoenix", multiplier: 0.9 },
  { name: "Philadelphia", multiplier: 1.05 },
  { name: "San Antonio", multiplier: 0.85 },
  { name: "San Diego", multiplier: 1.1 },
  { name: "Dallas", multiplier: 1.0 },
  { name: "San Jose", multiplier: 1.25 },
  { name: "Austin", multiplier: 1.0 },
  { name: "Jacksonville", multiplier: 0.85 },
  { name: "Fort Worth", multiplier: 0.9 },
  { name: "Columbus", multiplier: 0.85 },
  { name: "Charlotte", multiplier: 0.9 },
  { name: "Indianapolis", multiplier: 0.8 },
  { name: "San Francisco", multiplier: 1.3 },
  { name: "Seattle", multiplier: 1.2 },
  { name: "Denver", multiplier: 1.05 },
  { name: "Nashville", multiplier: 0.95 },
] as const;

const VEHICLE_TYPES = [
  { value: "sedan", label: "Sedan", weeklyLow: 800, weeklyHigh: 1200 },
  { value: "suv", label: "SUV", weeklyLow: 1000, weeklyHigh: 1500 },
  { value: "luxury", label: "Luxury", weeklyLow: 1200, weeklyHigh: 1800 },
  { value: "minivan", label: "Minivan", weeklyLow: 900, weeklyHigh: 1300 },
] as const;

type Platform = "uber" | "lyft" | "both";

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export function EarningsEstimator() {
  const [city, setCity] = useState<string>(CITIES[0].name);
  const [vehicleType, setVehicleType] = useState<string>("sedan");
  const [platform, setPlatform] = useState<Platform>("both");

  const estimate = useMemo(() => {
    const cityData = CITIES.find((c) => c.name === city) || CITIES[0];
    const vehicleData =
      VEHICLE_TYPES.find((v) => v.value === vehicleType) || VEHICLE_TYPES[0];

    const platformMultiplier =
      platform === "both" ? 1.1 : platform === "uber" ? 1.0 : 0.95;

    const weeklyLow = Math.round(
      vehicleData.weeklyLow * cityData.multiplier * platformMultiplier
    );
    const weeklyHigh = Math.round(
      vehicleData.weeklyHigh * cityData.multiplier * platformMultiplier
    );
    const monthlyLow = Math.round(weeklyLow * 4.33);
    const monthlyHigh = Math.round(weeklyHigh * 4.33);
    const annualLow = weeklyLow * 52;
    const annualHigh = weeklyHigh * 52;

    return {
      weeklyLow,
      weeklyHigh,
      monthlyLow,
      monthlyHigh,
      annualLow,
      annualHigh,
    };
  }, [city, vehicleType, platform]);

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Controls */}
      <Card className="border-0 bg-white shadow-sm ring-0">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
            Earnings Estimator
          </CardTitle>
          <p className="text-sm text-gray-500">
            See how much you could earn driving with Uber or Lyft
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="inline h-4 w-4 mr-1 text-gray-400" />
              City
            </label>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
            >
              {CITIES.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Vehicle Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Car className="inline h-4 w-4 mr-1 text-gray-400" />
              Vehicle Type
            </label>
            <select
              value={vehicleType}
              onChange={(e) => setVehicleType(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
            >
              {VEHICLE_TYPES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Platform Toggle */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Platform
            </label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden">
              {(["uber", "lyft", "both"] as Platform[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPlatform(p)}
                  className={`flex-1 px-4 py-2.5 text-sm font-medium transition-colors ${
                    platform === p
                      ? "bg-[#2EBD6B] text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p === "both" ? "Both" : p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card className="border-0 bg-white shadow-sm ring-0 overflow-hidden">
        <div className="bg-gradient-to-r from-[#2EBD6B] to-[#1a9952] px-6 py-4">
          <h3 className="text-white font-semibold text-lg">
            Estimated Earnings in {city}
          </h3>
          <p className="text-white/80 text-sm">
            {VEHICLE_TYPES.find((v) => v.value === vehicleType)?.label} on{" "}
            {platform === "both"
              ? "Uber & Lyft"
              : platform.charAt(0).toUpperCase() + platform.slice(1)}
          </p>
        </div>
        <CardContent className="pt-6 space-y-5">
          {/* Weekly */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <DollarSign className="h-5 w-5 text-[#2EBD6B]" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Weekly</p>
                <p className="text-xs text-gray-500">Estimated range</p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(estimate.weeklyLow)} -{" "}
              {formatCurrency(estimate.weeklyHigh)}
            </p>
          </div>

          {/* Monthly */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Monthly</p>
                <p className="text-xs text-gray-500">Estimated range</p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(estimate.monthlyLow)} -{" "}
              {formatCurrency(estimate.monthlyHigh)}
            </p>
          </div>

          {/* Annual */}
          <div className="flex items-center justify-between border-t border-gray-100 pt-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Annual</p>
                <p className="text-xs text-gray-500">Projected earnings</p>
              </div>
            </div>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(estimate.annualLow)} -{" "}
              {formatCurrency(estimate.annualHigh)}
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4 border-t border-gray-100">
            <a
              href="/"
              className="block w-full text-center bg-[#2EBD6B] hover:bg-[#1a9952] text-white font-semibold py-3 rounded-lg transition-colors"
            >
              Start driving today
            </a>
            <p className="text-center text-xs text-gray-400 mt-2">
              Earnings vary based on hours driven, demand, and location.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
