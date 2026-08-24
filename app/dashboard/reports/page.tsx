"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart3,
  Car,
  DollarSign,
  AlertTriangle,
  Users,
  TrendingUp,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DateRange { start: string; end: string; label: string }

type ReportType = "fleet_utilization" | "revenue" | "no_shows" | "top_renters" | "booking_source";

interface FleetRow {
  id: string; label: string; status: string;
  rented_days: number; total_days: number; utilization_pct: number;
}

interface WeeklyRevenue { week: string; revenue: number }
interface VehicleMakeRevenue { make: string; revenue: number }
interface WeeklyNoShow { week: string; count: number }
interface NoShowRow { renter_name: string; start_date: string; total_price: number }
interface RenterRow {
  name: string; email: string | null;
  total_spend: number; booking_count: number; last_rental: string;
}
interface SourceRow { source: string; count: number; pct: number }

interface ReportData {
  // fleet
  vehicles?: FleetRow[];
  avg_utilization?: number;
  period_days?: number;
  // revenue
  total_revenue?: number;
  total_bookings?: number;
  avg_revenue_per_booking?: number;
  weekly_revenue?: WeeklyRevenue[];
  by_vehicle_make?: VehicleMakeRevenue[];
  // no shows
  no_show_count?: number;
  no_show_rate?: number;
  estimated_loss?: number;
  weekly_no_shows?: WeeklyNoShow[];
  recent?: NoShowRow[];
  // top renters
  top_renters?: RenterRow[];
  // source
  total_leads?: number;
  source_breakdown?: SourceRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function getPresets(): DateRange[] {
  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];

  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];

  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const thirtyAgo = new Date(now); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const ninetyAgo = new Date(now); ninetyAgo.setDate(ninetyAgo.getDate() - 90);

  // This week Mon→Sun
  const dow = now.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() + mondayOffset);
  const thisWeekEnd = new Date(thisWeekStart); thisWeekEnd.setDate(thisWeekStart.getDate() + 6);

  return [
    { label: "This Week", start: thisWeekStart.toISOString().split("T")[0], end: thisWeekEnd.toISOString().split("T")[0] },
    { label: "This Month", start: thisMonthStart, end: thisMonthEnd },
    { label: "Last Month", start: lastMonthStart, end: lastMonthEnd },
    { label: "Last 30 Days", start: thirtyAgo.toISOString().split("T")[0], end: todayStr },
    { label: "Last 90 Days", start: ninetyAgo.toISOString().split("T")[0], end: todayStr },
    { label: "Last 7 Days", start: weekAgo.toISOString().split("T")[0], end: todayStr },
  ];
}

function BarViz({ value, max, color = "#2EBD6B" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function downloadCsv(rows: string[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Sub-report components ────────────────────────────────────────────────────

function FleetUtilizationReport({ data, range }: { data: ReportData; range: DateRange }) {
  const vehicles = data.vehicles || [];
  const maxPct = 100;

  function exportCsv() {
    const rows = [
      ["Vehicle", "Rented Days", "Period Days", "Utilization %"],
      ...vehicles.map((v) => [v.label, String(v.rented_days), String(v.total_days), `${v.utilization_pct}%`]),
    ];
    downloadCsv(rows, `fleet-utilization-${range.start}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">
            Period: {range.start} → {range.end} ({data.period_days} days)
          </p>
          <p className="text-lg font-bold text-[#2EBD6B]">
            Fleet Avg: {data.avg_utilization}% utilized
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>
      {vehicles.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No vehicle data for this period.</p>
      ) : (
        <div className="space-y-3">
          {vehicles
            .sort((a, b) => b.utilization_pct - a.utilization_pct)
            .map((v) => (
              <div key={v.id} className="rounded-xl border bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-medium text-sm text-gray-900">{v.label}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${v.status === "available" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                      {v.status}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-gray-900">{v.utilization_pct}%</span>
                </div>
                <BarViz
                  value={v.utilization_pct}
                  max={maxPct}
                  color={v.utilization_pct >= 70 ? "#2EBD6B" : v.utilization_pct >= 40 ? "#f59e0b" : "#e5e7eb"}
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  {v.rented_days} rented / {v.total_days} available days
                </p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

function RevenueReport({ data, range }: { data: ReportData; range: DateRange }) {
  const weekly = data.weekly_revenue || [];
  const byMake = data.by_vehicle_make || [];
  const maxWeekly = Math.max(...weekly.map((w) => w.revenue), 1);
  const maxMake = Math.max(...byMake.map((m) => m.revenue), 1);

  function exportCsv() {
    const rows = [
      ["Week Starting", "Revenue"],
      ...weekly.map((w) => [w.week, String(w.revenue.toFixed(2))]),
      ["", ""],
      ["Vehicle Make", "Revenue"],
      ...byMake.map((m) => [m.make, String(m.revenue.toFixed(2))]),
    ];
    downloadCsv(rows, `revenue-${range.start}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{fmt$(data.total_revenue || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{data.total_bookings}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Avg / Booking</p>
            <p className="text-2xl font-bold text-gray-900">{fmt$(data.avg_revenue_per_booking || 0)}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly breakdown */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Week</h3>
          {weekly.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-2">
              {weekly.map((w) => (
                <div key={w.week}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Week of {w.week}</span>
                    <span className="font-semibold">{fmt$(w.revenue)}</span>
                  </div>
                  <BarViz value={w.revenue} max={maxWeekly} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By vehicle make */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Vehicle Make</h3>
          {byMake.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No data</p>
          ) : (
            <div className="space-y-2">
              {byMake.map((m) => (
                <div key={m.make}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{m.make}</span>
                    <span className="font-semibold">{fmt$(m.revenue)}</span>
                  </div>
                  <BarViz value={m.revenue} max={maxMake} color="#6366f1" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NoShowReport({ data, range }: { data: ReportData; range: DateRange }) {
  const weekly = data.weekly_no_shows || [];
  const recent = data.recent || [];
  const maxWeekly = Math.max(...weekly.map((w) => w.count), 1);

  function exportCsv() {
    const rows = [
      ["Renter", "Scheduled Date", "Est. Revenue Lost"],
      ...recent.map((r) => [r.renter_name, r.start_date, String((r.total_price || 0).toFixed(2))]),
    ];
    downloadCsv(rows, `no-shows-${range.start}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-6">
          <div>
            <p className="text-xs text-gray-500">No-Shows</p>
            <p className="text-2xl font-bold text-red-600">{data.no_show_count}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">No-Show Rate</p>
            <p className="text-2xl font-bold text-gray-900">{data.no_show_rate}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Estimated Lost Revenue</p>
            <p className="text-2xl font-bold text-gray-900">{fmt$(data.estimated_loss || 0)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Bookings</p>
            <p className="text-2xl font-bold text-gray-900">{data.total_bookings}</p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">No-Shows by Week</h3>
          {weekly.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No no-shows in this period 🎉</p>
          ) : (
            <div className="space-y-2">
              {weekly.map((w) => (
                <div key={w.week}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Week of {w.week}</span>
                    <span className="font-semibold">{w.count} no-show{w.count !== 1 ? "s" : ""}</span>
                  </div>
                  <BarViz value={w.count} max={maxWeekly} color="#ef4444" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Recent No-Shows</h3>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">None in period 🎉</p>
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Renter</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Date</th>
                    <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600">Lost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {recent.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{r.renter_name}</td>
                      <td className="px-3 py-2 text-gray-500">{r.start_date}</td>
                      <td className="px-3 py-2 text-right text-red-600 font-medium">{fmt$(r.total_price || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TopRentersReport({ data, range }: { data: ReportData; range: DateRange }) {
  const renters = data.top_renters || [];
  const maxSpend = Math.max(...renters.map((r) => r.total_spend), 1);

  function exportCsv() {
    const rows = [
      ["Name", "Email", "Bookings", "Total Spend", "Last Rental"],
      ...renters.map((r) => [
        r.name, r.email || "", String(r.booking_count),
        String(r.total_spend.toFixed(2)), r.last_rental,
      ]),
    ];
    downloadCsv(rows, `top-renters-${range.start}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">
          Top {renters.length} renters by spend — {range.start} → {range.end}
        </p>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {renters.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No bookings in this period.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600">Renter</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600">Bookings</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Total Spend</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-600">Last Rental</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-600 w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {renters.map((r, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-400 font-medium">#{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{r.name}</div>
                    {r.email && <div className="text-xs text-gray-400">{r.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{r.booking_count}</td>
                  <td className="px-4 py-3 text-right font-bold text-[#2EBD6B]">{fmt$(r.total_spend)}</td>
                  <td className="px-4 py-3 text-right text-gray-500">{r.last_rental}</td>
                  <td className="px-4 py-3">
                    <BarViz value={r.total_spend} max={maxSpend} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BookingSourceReport({ data, range }: { data: ReportData; range: DateRange }) {
  const sources = data.source_breakdown || [];
  const maxCount = Math.max(...sources.map((s) => s.count), 1);

  const colors = ["#2EBD6B", "#6366f1", "#f59e0b", "#ef4444"];

  function exportCsv() {
    const rows = [
      ["Source", "Count", "Percentage"],
      ...sources.map((s) => [s.source, String(s.count), `${s.pct}%`]),
    ];
    downloadCsv(rows, `booking-source-${range.start}.csv`);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">
            {range.start} → {range.end}
          </p>
          <p className="text-sm font-medium text-gray-700">
            {data.total_bookings} bookings · {data.total_leads} leads
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export CSV
        </Button>
      </div>

      {sources.filter((s) => s.count > 0).length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">No data for this period.</p>
      ) : (
        <div className="space-y-4">
          {sources.map((s, i) => (
            <div key={s.source} className="rounded-xl border bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} />
                  <span className="font-semibold text-sm text-gray-900">{s.source}</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-gray-900">{s.count}</span>
                  <span className="text-sm text-gray-400 ml-1">({s.pct}%)</span>
                </div>
              </div>
              <BarViz value={s.count} max={maxCount} color={colors[i % colors.length]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const REPORTS: { key: ReportType; label: string; icon: React.ElementType; description: string }[] = [
  { key: "fleet_utilization", label: "Fleet Utilization", icon: Car, description: "% of days each vehicle was on rent" },
  { key: "revenue", label: "Revenue", icon: DollarSign, description: "Revenue by week and vehicle type" },
  { key: "no_shows", label: "No-Shows", icon: AlertTriangle, description: "No-show rate and estimated losses" },
  { key: "top_renters", label: "Top Renters", icon: Users, description: "Customers ranked by total spend" },
  { key: "booking_source", label: "Booking Source", icon: TrendingUp, description: "Where bookings come from" },
];

export default function ReportsPage() {
  const presets = getPresets();
  const [activeReport, setActiveReport] = useState<ReportType>("revenue");
  const [preset, setPreset] = useState<DateRange>(presets[1]); // This Month default
  const [customRange, setCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const effectiveRange: DateRange = customRange
    ? { ...customRange, label: "Custom" }
    : preset;

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/reports?report=${activeReport}&start=${effectiveRange.start}&end=${effectiveRange.end}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load report");
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error loading report");
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeReport, effectiveRange.start, effectiveRange.end]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2EBD6B]/10">
          <BarChart3 className="h-5 w-5 text-[#2EBD6B]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500">Fleet analytics and business insights</p>
        </div>
      </div>

      {/* Report tabs */}
      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const active = activeReport === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setActiveReport(r.key)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#2EBD6B] text-white shadow-sm"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-[#2EBD6B]/40 hover:text-[#2EBD6B]"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-500">Period:</span>
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => { setPreset(p); setCustomRange(null); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !customRange && preset.label === p.label
                ? "bg-gray-900 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-1.5 ml-1">
          <input
            type="date"
            value={customRange?.start ?? preset.start}
            onChange={(e) => setCustomRange({ start: e.target.value, end: customRange?.end ?? preset.end })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={customRange?.end ?? preset.end}
            onChange={(e) => setCustomRange({ start: customRange?.start ?? preset.start, end: e.target.value })}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
          />
        </div>
        <button
          onClick={fetchReport}
          className="flex items-center gap-1 text-xs text-[#2EBD6B] hover:underline font-medium"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>

      {/* Report card */}
      <div className="rounded-2xl border bg-white shadow-sm p-6">
        {/* Report header */}
        <div className="flex items-center gap-2 mb-6 pb-4 border-b">
          {(() => {
            const r = REPORTS.find((x) => x.key === activeReport);
            if (!r) return null;
            const Icon = r.icon;
            return (
              <>
                <Icon className="h-5 w-5 text-[#2EBD6B]" />
                <div>
                  <h2 className="font-bold text-gray-900">{r.label}</h2>
                  <p className="text-xs text-gray-500">{r.description}</p>
                </div>
              </>
            );
          })()}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#2EBD6B]" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button onClick={fetchReport} className="mt-3 text-sm text-[#2EBD6B] hover:underline">
              Try again
            </button>
          </div>
        ) : data ? (
          <>
            {activeReport === "fleet_utilization" && (
              <FleetUtilizationReport data={data} range={effectiveRange} />
            )}
            {activeReport === "revenue" && (
              <RevenueReport data={data} range={effectiveRange} />
            )}
            {activeReport === "no_shows" && (
              <NoShowReport data={data} range={effectiveRange} />
            )}
            {activeReport === "top_renters" && (
              <TopRentersReport data={data} range={effectiveRange} />
            )}
            {activeReport === "booking_source" && (
              <BookingSourceReport data={data} range={effectiveRange} />
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
