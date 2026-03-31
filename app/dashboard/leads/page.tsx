"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  Users,
  LayoutGrid,
  List,
  Plus,
  Phone,
  DollarSign,
  Clock,
  TrendingUp,
  Filter,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Lead } from "@/lib/types";

type FollowupStatus = Lead["followup_status"];
type ViewMode = "pipeline" | "table";

const PIPELINE_STAGES: {
  key: FollowupStatus;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
}[] = [
  {
    key: "none",
    label: "New",
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
  },
  {
    key: "1st_contact",
    label: "1st Contact",
    color: "text-blue-700",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  {
    key: "2nd_followup",
    label: "2nd Follow-up",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
  },
  {
    key: "3rd_followup",
    label: "3rd Follow-up",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
  },
  {
    key: "final_attempt",
    label: "Final Attempt",
    color: "text-amber-700",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  {
    key: "converted",
    label: "Converted",
    color: "text-emerald-700",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
  },
  {
    key: "lost",
    label: "Lost",
    color: "text-red-700",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
];

const stageLabels: Record<FollowupStatus, string> = {
  none: "New",
  "1st_contact": "1st Contact",
  "2nd_followup": "2nd Follow-up",
  "3rd_followup": "3rd Follow-up",
  final_attempt: "Final Attempt",
  converted: "Converted",
  lost: "Lost",
};

const stageColors: Record<FollowupStatus, string> = {
  none: "bg-slate-100 text-slate-700 border-slate-200",
  "1st_contact": "bg-blue-100 text-blue-700 border-blue-200",
  "2nd_followup": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "3rd_followup": "bg-purple-100 text-purple-700 border-purple-200",
  final_attempt: "bg-amber-100 text-amber-700 border-amber-200",
  converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / 86400000);
}

function formatCurrency(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("pipeline");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const supabase = createClient();

  const fetchLeads = useCallback(async () => {
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setLeads(data as Lead[]);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const filteredLeads =
    sourceFilter === "all"
      ? leads
      : leads.filter((l) => l.source === sourceFilter);

  const sources = [...new Set(leads.map((l) => l.source).filter(Boolean))];

  // Stats
  const totalLeads = leads.length;
  const convertedCount = leads.filter(
    (l) => l.followup_status === "converted"
  ).length;
  const conversionRate =
    totalLeads > 0 ? ((convertedCount / totalLeads) * 100).toFixed(1) : "0";
  const pipelineValue = leads
    .filter((l) => l.followup_status !== "lost" && l.followup_status !== "converted")
    .reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const avgResponseDays =
    leads.filter((l) => l.last_followup_at).length > 0
      ? (
          leads
            .filter((l) => l.last_followup_at)
            .reduce((sum, l) => {
              const created = new Date(l.created_at).getTime();
              const firstContact = new Date(l.last_followup_at!).getTime();
              return sum + (firstContact - created) / 86400000;
            }, 0) / leads.filter((l) => l.last_followup_at).length
        ).toFixed(1)
      : "—";

  function LeadCard({ lead }: { lead: Lead }) {
    const days = daysSince(lead.last_followup_at);
    return (
      <a
        href={`/dashboard/leads/${lead.id}`}
        className="block rounded-lg border border-gray-100 bg-white p-3 hover:shadow-md transition-shadow cursor-pointer"
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {lead.name}
          </p>
          {lead.estimated_value && (
            <span className="text-xs font-medium text-emerald-600 shrink-0">
              {formatCurrency(lead.estimated_value)}
            </span>
          )}
        </div>
        {lead.phone && (
          <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
            <Phone className="h-3 w-3" />
            {lead.phone}
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          {lead.source && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {lead.source}
            </Badge>
          )}
          {days !== null && (
            <span className="text-[10px] text-gray-400">
              {days === 0 ? "Today" : `${days}d ago`}
            </span>
          )}
        </div>
      </a>
    );
  }

  // Add Lead Modal
  function AddLeadModal() {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [source, setSource] = useState("manual");
    const [estimatedValue, setEstimatedValue] = useState("");
    const [saving, setSaving] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setSaving(true);
      const { error } = await supabase.from("leads").insert({
        name,
        phone: phone || null,
        email: email || null,
        source,
        estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
        followup_status: "none",
        followup_count: 0,
        stage: "new",
      });
      if (!error) {
        setShowAddModal(false);
        fetchLeads();
      }
      setSaving(false);
    }

    return (
      <>
        <div
          className="fixed inset-0 z-40 bg-black/30"
          onClick={() => setShowAddModal(false)}
        />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Lead
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                  placeholder="(555) 123-4567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                >
                  <option value="manual">Manual</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="social_media">Social Media</option>
                  <option value="ad">Ad Campaign</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Value
                </label>
                <input
                  type="number"
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B]"
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving || !name}
                  className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
                >
                  {saving ? "Adding..." : "Add Lead"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-[#2EBD6B] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="space-y-6"
      style={{ background: "#F8F9FC", minHeight: "100%" }}
    >
      {showAddModal && <AddLeadModal />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500">{totalLeads} total leads</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Source filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30"
            >
              <option value="all">All Sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode("pipeline")}
              className={`px-3 py-2 ${
                viewMode === "pipeline"
                  ? "bg-[#2EBD6B] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 ${
                viewMode === "table"
                  ? "bg-[#2EBD6B] text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Lead
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalLeads}</p>
                <p className="text-xs text-gray-500">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                <TrendingUp className="h-5 w-5 text-[#2EBD6B]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {conversionRate}%
                </p>
                <p className="text-xs text-gray-500">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-50">
                <DollarSign className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(pipelineValue)}
                </p>
                <p className="text-xs text-gray-500">Pipeline Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {avgResponseDays}
                </p>
                <p className="text-xs text-gray-500">Avg Response (days)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline View */}
      {viewMode === "pipeline" && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STAGES.map((stage) => {
            const stageLeads = filteredLeads.filter(
              (l) => l.followup_status === stage.key
            );
            return (
              <div key={stage.key} className="flex-shrink-0 w-64">
                <div
                  className={`rounded-t-lg px-3 py-2 border-b-2 ${stage.borderColor} ${stage.bgColor}`}
                >
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm font-semibold ${stage.color}`}
                    >
                      {stage.label}
                    </h3>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${stage.color} border-current`}
                    >
                      {stageLeads.length}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2 mt-2 min-h-[200px]">
                  {stageLeads.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-xs text-gray-400">
                      No leads
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <LeadCard key={lead.id} lead={lead} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            {filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Users className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-1">No leads</h3>
                <p className="text-sm text-gray-500">
                  Leads will appear here when submitted through your booking
                  widget.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Est. Value</TableHead>
                    <TableHead>Last Contact</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => {
                    const days = daysSince(lead.last_followup_at);
                    return (
                      <TableRow
                        key={lead.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() =>
                          (window.location.href = `/dashboard/leads/${lead.id}`)
                        }
                      >
                        <TableCell className="font-medium">
                          {lead.name}
                        </TableCell>
                        <TableCell>{lead.phone || "—"}</TableCell>
                        <TableCell>{lead.source || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={stageColors[lead.followup_status]}
                          >
                            {stageLabels[lead.followup_status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {formatCurrency(lead.estimated_value)}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {days !== null
                            ? days === 0
                              ? "Today"
                              : `${days}d ago`
                            : "Never"}
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {new Date(lead.created_at).toLocaleDateString(
                            "en-US",
                            { month: "short", day: "numeric", year: "numeric" }
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
