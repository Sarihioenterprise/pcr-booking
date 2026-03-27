"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Users } from "lucide-react";

type Stage = "new" | "bot_called" | "hot_lead" | "disqualified";

interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  dates_requested: string;
  stage: Stage;
  created_at: string;
}

const stageColors: Record<Stage, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  bot_called: "bg-blue-100 text-blue-700 border-blue-200",
  hot_lead: "bg-green-100 text-green-700 border-green-200",
  disqualified: "bg-red-100 text-red-700 border-red-200",
};

const stageLabels: Record<Stage, string> = {
  new: "New",
  bot_called: "Bot Called",
  hot_lead: "Hot Lead",
  disqualified: "Disqualified",
};

const placeholderLeads: Lead[] = [
  {
    id: "1",
    name: "Marcus Johnson",
    phone: "(404) 555-0123",
    email: "marcus.j@gmail.com",
    dates_requested: "Apr 5 - Apr 12, 2026",
    stage: "new",
    created_at: "2026-03-25T14:30:00Z",
  },
  {
    id: "2",
    name: "Tamika Williams",
    phone: "(770) 555-0456",
    email: "tamika.w@yahoo.com",
    dates_requested: "Apr 1 - Apr 8, 2026",
    stage: "bot_called",
    created_at: "2026-03-24T09:15:00Z",
  },
  {
    id: "3",
    name: "Darius Mitchell",
    phone: "(678) 555-0789",
    email: "d.mitchell@outlook.com",
    dates_requested: "Mar 30 - Apr 6, 2026",
    stage: "hot_lead",
    created_at: "2026-03-23T16:45:00Z",
  },
  {
    id: "4",
    name: "Crystal Davis",
    phone: "(404) 555-0321",
    email: "crystal.d@gmail.com",
    dates_requested: "Apr 10 - Apr 14, 2026",
    stage: "disqualified",
    created_at: "2026-03-22T11:00:00Z",
  },
];

function EmptyState({ stage }: { stage: string }) {
  const label =
    stage === "all"
      ? ""
      : ` in "${stageLabels[stage as Stage]}"`;
  return (
    <Card className="bg-white">
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">No leads{label}</h3>
        <p className="text-sm text-muted-foreground">
          Leads will appear here when submitted through your booking widget.
        </p>
      </CardContent>
    </Card>
  );
}

function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <Card className="bg-white">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Dates Requested</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => (
              <TableRow key={lead.id}>
                <TableCell className="font-medium">{lead.name}</TableCell>
                <TableCell>{lead.phone}</TableCell>
                <TableCell>{lead.email}</TableCell>
                <TableCell>{lead.dates_requested}</TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={stageColors[lead.stage]}
                  >
                    {stageLabels[lead.stage]}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(lead.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function LeadsPage() {
  const stages = ["all", "new", "bot_called", "hot_lead", "disqualified"] as const;

  function filterLeads(stage: string): Lead[] {
    if (stage === "all") return placeholderLeads;
    return placeholderLeads.filter((l) => l.stage === stage);
  }

  return (
    <div className="space-y-6" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      <div>
        <h1 className="text-2xl font-bold">Leads</h1>
        <p className="text-muted-foreground">
          {placeholderLeads.length} total leads
        </p>
      </div>

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="bot_called">Bot Called</TabsTrigger>
          <TabsTrigger value="hot_lead">Hot Lead</TabsTrigger>
          <TabsTrigger value="disqualified">Disqualified</TabsTrigger>
        </TabsList>

        {stages.map((stage) => {
          const filtered = filterLeads(stage);
          return (
            <TabsContent key={stage} value={stage}>
              {filtered.length === 0 ? (
                <EmptyState stage={stage} />
              ) : (
                <LeadsTable leads={filtered} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
