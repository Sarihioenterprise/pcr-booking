"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Plus,
  FileText,
  Send,
  ExternalLink,
  Copy,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Operator } from "@/lib/types";

interface Contract {
  id: string;
  operator_id: string;
  renter_id: string | null;
  template_url: string | null;
  signed_pdf_url: string | null;
  status: "pending" | "sent" | "signed";
  token: string;
  sent_at: string | null;
  signed_at: string | null;
  renter_name: string | null;
  renter_email: string | null;
  renter_phone: string | null;
  renter_dl: string | null;
  created_at: string;
}

interface Renter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

const statusConfig = {
  pending: {
    label: "Pending",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    icon: Clock,
  },
  sent: {
    label: "Sent",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    icon: Send,
  },
  signed: {
    label: "Signed",
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    icon: CheckCircle,
  },
};

export default function ContractsPage() {
  const supabase = createClient();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [sendMethod, setSendMethod] = useState<"sms" | "copy">("copy");
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: operatorData } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (operatorData) setOperator(operatorData as Operator);

      if (operatorData?.id) {
        // Load contracts
        const { data: contractsData } = await supabase
          .from("contracts")
          .select("*")
          .eq("operator_id", operatorData.id)
          .order("created_at", { ascending: false });
        if (contractsData) setContracts(contractsData as Contract[]);

        // Load renters for reference
        const { data: rentersData } = await supabase
          .from("renters")
          .select("id, name, email, phone")
          .eq("operator_id", operatorData.id);
        if (rentersData) setRenters(rentersData as Renter[]);
      }

      setLoading(false);
    }
    load();
  }, [supabase]);

  function getSigningUrl(token: string) {
    return `${window.location.origin}/sign/${token}`;
  }

  async function handleCopyLink() {
    if (!selectedContract) return;
    const url = getSigningUrl(selectedContract.token);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendSMS() {
    if (!selectedContract || !selectedContract.renter_phone) {
      setError("No phone number available for this contract");
      return;
    }

    setSending(true);
    setError("");

    try {
      const url = getSigningUrl(selectedContract.token);
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: selectedContract.renter_phone,
          message: `Please sign your rental contract: ${url}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send SMS");
      }

      // Update contract status to sent
      await supabase
        .from("contracts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", selectedContract.id);

      // Refresh contracts
      setContracts((prev) =>
        prev.map((c) =>
          c.id === selectedContract.id
            ? { ...c, status: "sent" as const, sent_at: new Date().toISOString() }
            : c
        )
      );

      setShowSendModal(false);
      setSelectedContract(null);
    } catch (err: any) {
      setError(err.message || "Failed to send SMS");
    } finally {
      setSending(false);
    }
  }

  function getRenterName(renterId: string | null, renterName: string | null) {
    if (renterName) return renterName;
    if (renterId) {
      const renter = renters.find((r) => r.id === renterId);
      return renter?.name || "Unknown";
    }
    return "---";
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground">
            {contracts.length} total contract{contracts.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/dashboard/contracts/new">
          <Button style={{ backgroundColor: "#2EBD6B" }}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract
          </Button>
        </Link>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {contracts.length === 0 ? (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No contracts yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first contract to get started
            </p>
            <Link href="/dashboard/contracts/new">
              <Button style={{ backgroundColor: "#2EBD6B" }}>
                Create Contract
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Renter</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((contract) => {
                  const status = statusConfig[contract.status];
                  const StatusIcon = status.icon;
                  return (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {getRenterName(contract.renter_id, contract.renter_name)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contract.renter_email || "---"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contract.renter_phone || "---"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={status.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(contract.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {contract.status !== "signed" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedContract(contract);
                                setShowSendModal(true);
                              }}
                            >
                              <Send className="h-4 w-4 mr-1" />
                              Send
                            </Button>
                          )}
                          {contract.signed_pdf_url && (
                            <a
                              href={contract.signed_pdf_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button variant="outline" size="sm">
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </Button>
                            </a>
                          )}
                          <Link href={`/dashboard/contracts/${contract.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Send Contract Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contract Link</DialogTitle>
            <DialogDescription>
              Share the signing link with{" "}
              {selectedContract?.renter_name || "the renter"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Signing Link</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={selectedContract ? getSigningUrl(selectedContract.token) : ""}
                  className="font-mono text-sm"
                />
                <Button variant="outline" onClick={handleCopyLink}>
                  {copied ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {selectedContract?.renter_phone && (
              <div className="pt-2 border-t">
                <Button
                  onClick={handleSendSMS}
                  disabled={sending}
                  className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending..." : "Send via SMS"}
                </Button>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Will send to {selectedContract.renter_phone}
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSendModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
