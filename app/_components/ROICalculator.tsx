"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TrendingUp } from "lucide-react";

export function ROICalculator() {
  const [vehicles, setVehicles] = useState(5);
  const [weeklyRate, setWeeklyRate] = useState(350);
  const [adminHours, setAdminHours] = useState(8);

  // Calculate metrics
  const hourlyRate = 25;
  const weeksPerMonth = 4.33;
  const monthlyRevenue = vehicles * weeklyRate * weeksPerMonth;
  const monthlyCost = monthlyRevenue > 0 && vehicles >= 3 ? 79 : 0;
  const hoursSavedPerMonth = adminHours * 4; // 4 weeks per month
  const hoursSavedValue = hoursSavedPerMonth * hourlyRate;
  const latePaymentRecovery = monthlyRevenue * 0.34; // 34% improvement
  const totalMonthlyBenefit = hoursSavedValue + latePaymentRecovery;
  const roi = totalMonthlyBenefit - monthlyCost;

  return (
    <div className="py-16 px-4 sm:px-6 lg:px-8 bg-[#F8F9FC]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-10 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <TrendingUp className="h-8 w-8 text-[#2EBD6B]" />
            <h2 className="text-3xl font-bold text-[#080812]">See Your ROI</h2>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Use our calculator to understand how much time and money you can save with PCR Booking.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Interactive ROI Calculator</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Input Section */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="vehicles" className="text-sm font-medium">
                  How many vehicles do you rent?
                </Label>
                <Input
                  id="vehicles"
                  type="number"
                  min="1"
                  max="100"
                  value={vehicles}
                  onChange={(e) => setVehicles(parseInt(e.target.value) || 1)}
                  className="bg-white border-gray-200"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rate" className="text-sm font-medium">
                  Average weekly rate per vehicle
                </Label>
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">$</span>
                  <Input
                    id="rate"
                    type="number"
                    min="1"
                    step="10"
                    value={weeklyRate}
                    onChange={(e) => setWeeklyRate(parseInt(e.target.value) || 0)}
                    className="bg-white border-gray-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours" className="text-sm font-medium">
                  Hours per week on admin/paperwork
                </Label>
                <Input
                  id="hours"
                  type="number"
                  min="1"
                  max="168"
                  value={adminHours}
                  onChange={(e) => setAdminHours(parseInt(e.target.value) || 1)}
                  className="bg-white border-gray-200"
                />
              </div>
            </div>

            {/* Results Section */}
            <div className="border-t pt-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-[#080812]">
                    ${monthlyRevenue.toFixed(0)}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">PCR Booking Cost</p>
                  <p className="text-2xl font-bold text-[#080812]">
                    ${monthlyCost.toFixed(0)}/mo
                  </p>
                  {monthlyCost === 0 && (
                    <p className="text-xs text-gray-500 mt-1">Free for 3 cars</p>
                  )}
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Hours Saved Per Month</p>
                  <p className="text-2xl font-bold text-[#080812]">
                    ~{hoursSavedPerMonth} hrs
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    ${hoursSavedValue.toFixed(0)} value
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">Late Payments Recovered</p>
                  <p className="text-2xl font-bold text-[#2EBD6B]">
                    ${latePaymentRecovery.toFixed(0)}/mo
                  </p>
                  <p className="text-xs text-gray-500 mt-1">34% avg improvement</p>
                </div>
              </div>

              {/* ROI Highlight */}
              <div className="mt-6 bg-[#0c0c1c] rounded-lg p-6 text-center border border-[#2EBD6B]/20">
                <p className="text-sm text-gray-400 mb-2">Your Monthly ROI</p>
                <p className="text-4xl font-bold text-[#2EBD6B]">
                  ${roi.toFixed(0)}
                </p>
                <p className="text-gray-400 text-sm mt-3">
                  Total monthly savings vs. PCR Booking cost
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
