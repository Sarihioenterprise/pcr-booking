"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import type { Lead } from "@/lib/types";

const stageColors: Record<string, string> = {
  new: "bg-primary/10 text-primary border-primary/20",
  bot_called: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  hot_lead: "bg-success/10 text-success border-success/20",
  disqualified: "bg-destructive/10 text-destructive border-destructive/20",
};

const stageLabels: Record<string, string> = {
  new: "New",
  bot_called: "Bot Called",
  hot_lead: "Hot Lead",
  disqualified: "Disqualified",
};

export default function LeadDetailPage() {
  const { id } = useParams();
  const supabase = createClient();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single();
      setLead(data as Lead | null);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  if (loading) return <div className="text-muted-foreground">Loading...</div>;
  if (!lead) return <div className="text-muted-foreground">Lead not found</div>;

  function QualBadge({ label, value }: { label: string; value: boolean | null }) {
    if (value === null || value === undefined) return null;
    return (
      <div className="flex items-center gap-2">
        {value ? (
          <CheckCircle className="h-4 w-4 text-success" />
        ) : (
          <XCircle className="h-4 w-4 text-destructive" />
        )}
        <span className="text-sm">{label}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/leads">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{lead.name}</h1>
          <p className="text-muted-foreground">Lead details</p>
        </div>
        <Badge variant="outline" className={stageColors[lead.stage]}>
          {stageLabels[lead.stage]}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-muted-foreground">Name</p>
              <p className="font-medium">{lead.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p className="font-medium">{lead.phone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{lead.email || "—"}</p>
            </div>
            {lead.dates_requested && (
              <div>
                <p className="text-muted-foreground">Dates Requested</p>
                <p className="font-medium">{lead.dates_requested}</p>
              </div>
            )}
            {lead.duration_days && (
              <div>
                <p className="text-muted-foreground">Duration</p>
                <p className="font-medium">{lead.duration_days} days</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Qualification</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <QualBadge label="Uber/Lyft Approved" value={lead.uber_lyft_approved} />
              <QualBadge label="Valid License" value={lead.valid_license} />
              <QualBadge label="Age 25+" value={lead.age_25_plus} />
            </div>

            {lead.disqualify_reason && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground">Disqualify Reason</p>
                <p className="text-sm font-medium text-destructive">
                  {lead.disqualify_reason}
                </p>
              </div>
            )}

            {lead.call_transcript && (
              <div className="pt-3 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">
                  Call Transcript
                </p>
                <div className="bg-secondary p-3 rounded-md text-sm max-h-60 overflow-y-auto whitespace-pre-wrap">
                  {lead.call_transcript}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
