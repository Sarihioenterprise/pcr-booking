import { createClient } from "@/lib/supabase/server";
import { getOperator } from "@/lib/get-operator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  FileText,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Star,
  FilePlus2,
} from "lucide-react";
import Link from "next/link";
import type { AgreementTemplate, RentalAgreement } from "@/lib/types";

const statusStyles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700 border-slate-200",
  sent: "bg-amber-100 text-amber-700 border-amber-200",
  signed: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  signed: "Signed",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AgreementsPage() {
  const operator = await getOperator();
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("agreement_templates")
    .select("*")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const { data: agreements } = await supabase
    .from("rental_agreements")
    .select("*, bookings(id, renter_name, start_date, end_date, vehicles(make, model, year))")
    .eq("operator_id", operator.id)
    .order("created_at", { ascending: false });

  const safeTemplates = (templates || []) as AgreementTemplate[];
  const safeAgreements = (agreements || []) as (RentalAgreement & {
    bookings?: {
      id: string;
      renter_name: string;
      start_date: string;
      end_date: string;
      vehicles?: { make: string; model: string; year: number };
    };
  })[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Digital Rental Agreements</h1>
          <p className="text-muted-foreground">
            {safeAgreements.length} agreements &middot;{" "}
            {safeTemplates.length} templates
          </p>
        </div>
      </div>

      <Tabs defaultValue="agreements">
        <TabsList>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        {/* AGREEMENTS TAB */}
        <TabsContent value="agreements">
          {safeAgreements.length === 0 ? (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">No agreements yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Generate your first rental agreement to get started.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Booking</TableHead>
                      <TableHead>Renter</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {safeAgreements.map((agr) => (
                      <TableRow key={agr.id}>
                        <TableCell className="font-medium">
                          {agr.booking_id.slice(0, 8).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          {agr.bookings?.renter_name || "Unknown"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {agr.bookings?.vehicles
                            ? `${agr.bookings.vehicles.year} ${agr.bookings.vehicles.make} ${agr.bookings.vehicles.model}`
                            : "---"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(agr.created_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={statusStyles[agr.status] || ""}
                          >
                            {statusLabels[agr.status] || agr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/dashboard/agreements/${agr.id}`}
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="gap-1.5"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Manage your agreement templates. The default template is used
              when generating new agreements.
            </p>
            <Link href="/dashboard/agreements/templates/new">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Template
              </Button>
            </Link>
          </div>

          {safeTemplates.length === 0 ? (
            <Card className="border-0 bg-white shadow-sm ring-0">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-1">No templates yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first agreement template.
                </p>
                <Link href="/dashboard/agreements/templates/new">
                  <Button style={{ backgroundColor: "#2EBD6B" }}>
                    Create Template
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {safeTemplates.map((tpl) => (
                <Card
                  key={tpl.id}
                  className="border-0 bg-white shadow-sm ring-0"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: "rgba(46,189,107,0.1)",
                          }}
                        >
                          <FileText
                            className="h-5 w-5"
                            style={{ color: "#2EBD6B" }}
                          />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {tpl.name}
                            {tpl.is_default && (
                              <Badge
                                variant="outline"
                                className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs"
                              >
                                Default
                              </Badge>
                            )}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last updated {formatDate(tpl.updated_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/dashboard/agreements/templates/new?edit=${tpl.id}`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            className="gap-1.5"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-4 max-h-32 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                      {tpl.content.slice(0, 300)}
                      {tpl.content.length > 300 ? "..." : ""}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
