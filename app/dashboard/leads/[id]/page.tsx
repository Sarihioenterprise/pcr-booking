"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  MessageSquare,
  Clock,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import type { Lead } from "@/lib/types";

const followupLabels: Record<string, string> = {
  none: "New",
  "1st_contact": "1st Contact",
  "2nd_followup": "2nd Follow-up",
  "3rd_followup": "3rd Follow-up",
  final_attempt: "Final Attempt",
  converted: "Converted",
  lost: "Lost",
};

const followupColors: Record<string, string> = {
  none: "bg-slate-100 text-slate-700 border-slate-200",
  "1st_contact": "bg-blue-100 text-blue-700 border-blue-200",
  "2nd_followup": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "3rd_followup": "bg-purple-100 text-purple-700 border-purple-200",
  final_attempt: "bg-amber-100 text-amber-700 border-amber-200",
  converted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  lost: "bg-red-100 text-red-700 border-red-200",
};

const stageOrder = [
  "none",
  "1st_contact",
  "2nd_followup",
  "3rd_followup",
  "final_attempt",
  "converted",
];

export default function LeadDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [converting, setConverting] = useState(false);
  const [markingLost, setMarkingLost] = useState(false);
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const loadLead = useCallback(async () => {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (data) {
      setLead(data as Lead);
      setNotes(data.notes || "");
    }
    setLoading(false);
  }, [id, supabase]);

  useEffect(() => {
    loadLead();
  }, [loadLead]);

  async function handleAdvance() {
    setAdvancing(true);
    try {
      const res = await fetch(`/api/leads/${id}/advance`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setLead(data.lead as Lead);
      }
    } catch {
      // handle error silently
    }
    setAdvancing(false);
  }

  async function handleConvert() {
    setConverting(true);
    try {
      const res = await fetch(`/api/leads/${id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        window.location.href = `/dashboard/bookings/${data.booking_id}`;
      }
    } catch {
      // handle error silently
    }
    setConverting(false);
  }

  async function handleMarkLost() {
    setMarkingLost(true);
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("leads")
      .update({
        followup_status: "lost",
        next_followup_at: null,
        updated_at: now,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (data) setLead(data as Lead);
    setMarkingLost(false);
  }

  async function handleSaveNotes() {
    setSavingNotes(true);
    const { data } = await supabase
      .from("leads")
      .update({ notes, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();
    if (data) setLead(data as Lead);
    setSavingNotes(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-[#2EBD6B] rounded-full animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20 text-gray-500">Lead not found</div>
    );
  }

  const canAdvance =
    lead.followup_status !== "converted" &&
    lead.followup_status !== "lost" &&
    stageOrder.indexOf(lead.followup_status) < stageOrder.length - 1;

  const canConvert =
    lead.followup_status !== "converted" && lead.followup_status !== "lost";

  const canMarkLost =
    lead.followup_status !== "converted" && lead.followup_status !== "lost";

  // Build follow-up timeline
  const timeline: { label: string; date: string | null; active: boolean }[] = [];
  const currentIdx = stageOrder.indexOf(lead.followup_status);
  for (let i = 0; i < stageOrder.length; i++) {
    timeline.push({
      label: followupLabels[stageOrder[i]],
      date:
        i <= currentIdx && i > 0
          ? lead.last_followup_at
          : i === currentIdx + 1
            ? lead.next_followup_at
            : null,
      active: i <= currentIdx,
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <p className="text-gray-500">Lead details</p>
        </div>
        <Badge
          variant="outline"
          className={followupColors[lead.followup_status]}
        >
          {followupLabels[lead.followup_status]}
        </Badge>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        {canAdvance && (
          <Button
            onClick={handleAdvance}
            disabled={advancing}
            className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
          >
            {advancing ? (
              "Advancing..."
            ) : (
              <>
                <ArrowRight className="h-4 w-4 mr-1" />
                Advance Stage
              </>
            )}
          </Button>
        )}
        {canConvert && (
          <Button
            onClick={handleConvert}
            disabled={converting}
            variant="outline"
            className="border-[#2EBD6B] text-[#2EBD6B] hover:bg-emerald-50"
          >
            {converting ? (
              "Converting..."
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-1" />
                Convert to Booking
              </>
            )}
          </Button>
        )}
        {canMarkLost && (
          <Button
            onClick={handleMarkLost}
            disabled={markingLost}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            {markingLost ? (
              "Marking..."
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" />
                Mark as Lost
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <Phone className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Phone</p>
                <p className="font-medium">{lead.phone || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <Mail className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium">{lead.email || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <MapPin className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">City</p>
                <p className="font-medium">{lead.city || "Not provided"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <Calendar className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Dates Requested</p>
                <p className="font-medium">
                  {lead.dates_requested || "Not specified"}
                </p>
              </div>
            </div>
            {lead.duration_days && (
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                  <Clock className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Duration</p>
                  <p className="font-medium">{lead.duration_days} days</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <DollarSign className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Estimated Value</p>
                <p className="font-medium">
                  {lead.estimated_value
                    ? new Intl.NumberFormat("en-US", {
                        style: "currency",
                        currency: "USD",
                        maximumFractionDigits: 0,
                      }).format(lead.estimated_value)
                    : "Not set"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50">
                <MessageSquare className="h-4 w-4 text-gray-500" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Source</p>
                <p className="font-medium">{lead.source || "Unknown"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualification */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Qualification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <QualBadge
                label="Uber/Lyft Approved"
                value={lead.uber_lyft_approved}
              />
              <QualBadge label="Valid License" value={lead.valid_license} />
              <QualBadge label="Age 25+" value={lead.age_25_plus} />
            </div>

            {lead.disqualify_reason && (
              <div className="pt-3 border-t border-gray-100">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-medium text-red-600">
                    Disqualification Reason
                  </p>
                </div>
                <p className="text-sm text-red-600 ml-6">
                  {lead.disqualify_reason}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Follow-up Timeline */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Follow-up Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {timeline.map((step, i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                        step.active
                          ? "bg-[#2EBD6B] text-white"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {step.active ? (
                        <CheckCircle className="h-3.5 w-3.5" />
                      ) : (
                        i + 1
                      )}
                    </div>
                    {i < timeline.length - 1 && (
                      <div
                        className={`w-0.5 h-8 ${step.active ? "bg-[#2EBD6B]" : "bg-gray-200"}`}
                      />
                    )}
                  </div>
                  <div className="pb-6">
                    <p
                      className={`text-sm font-medium ${step.active ? "text-gray-900" : "text-gray-400"}`}
                    >
                      {step.label}
                    </p>
                    {step.date && (
                      <p className="text-xs text-gray-500">
                        {new Date(step.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {lead.next_followup_at && lead.followup_status !== "converted" && lead.followup_status !== "lost" && (
              <div className="mt-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-xs font-medium text-amber-700">
                  Next follow-up scheduled:
                </p>
                <p className="text-sm font-semibold text-amber-800">
                  {new Date(lead.next_followup_at).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B]/30 focus:border-[#2EBD6B] resize-none"
              placeholder="Add notes about this lead..."
            />
            <Button
              onClick={handleSaveNotes}
              disabled={savingNotes || notes === (lead.notes || "")}
              size="sm"
              className="bg-[#2EBD6B] hover:bg-[#1a9952] text-white"
            >
              {savingNotes ? "Saving..." : "Save Notes"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Call Transcript */}
      {lead.call_transcript && (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="text-base">Call Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 p-4 rounded-lg text-sm max-h-80 overflow-y-auto whitespace-pre-wrap font-mono text-gray-700 leading-relaxed">
              {lead.call_transcript}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function QualBadge({
  label,
  value,
}: {
  label: string;
  value: boolean | null;
}) {
  if (value === null || value === undefined) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
        <div className="h-5 w-5 rounded-full bg-gray-200" />
        <span className="text-sm text-gray-400">{label} — Unknown</span>
      </div>
    );
  }
  return (
    <div
      className={`flex items-center gap-3 p-2 rounded-lg ${value ? "bg-emerald-50" : "bg-red-50"}`}
    >
      {value ? (
        <CheckCircle className="h-5 w-5 text-[#2EBD6B]" />
      ) : (
        <XCircle className="h-5 w-5 text-red-500" />
      )}
      <span
        className={`text-sm font-medium ${value ? "text-emerald-700" : "text-red-700"}`}
      >
        {label}
      </span>
    </div>
  );
}
