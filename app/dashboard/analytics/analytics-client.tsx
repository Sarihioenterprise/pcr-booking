"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AnalyticsClient({
  operatorId,
  operatorPlan,
}: {
  operatorId: string;
  operatorPlan?: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [dateRange, setDateRange] = useState("this_year");

  function getDateRange(): { start: string; end: string } {
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    switch (dateRange) {
      case "this_month": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
        return { start, end: today };
      }
      case "last_month": {
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
        const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split("T")[0];
        return { start, end };
      }
      case "this_quarter": {
        const quarter = Math.floor(now.getMonth() / 3);
        const start = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split("T")[0];
        return { start, end: today };
      }
      case "this_year": {
        const start = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
        return { start, end: today };
      }
      default:
        return { start: "2020-01-01", end: today };
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const { start, end } = getDateRange();
      const response = await fetch(`/api/analytics/export?start=${start}&end=${end}`);
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pcr-bookings-export-${start}-to-${end}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
    }
    setExporting(false);
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={dateRange} onValueChange={(v) => { if (v) setDateRange(v); }}>
        <SelectTrigger className="w-[160px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="this_month">This Month</SelectItem>
          <SelectItem value="last_month">Last Month</SelectItem>
          <SelectItem value="this_quarter">This Quarter</SelectItem>
          <SelectItem value="this_year">This Year</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
      >
        <Download className="h-4 w-4 mr-2" />
        {exporting ? "Exporting..." : "Export CSV"}
      </Button>
    </div>
  );
}
