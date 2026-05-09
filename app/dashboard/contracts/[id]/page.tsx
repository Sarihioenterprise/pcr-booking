"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Send,
  Download,
  Copy,
  CheckCircle,
  Clock,
  ExternalLink,
  FileText,
  User,
  Calendar,
  Phone,
  Mail,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  signature_data: string | null;
  created_at: string;
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

export default function ContractDetailPage() {
  const { id } = useParams();
  const supabase = createClient();

  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error: fetchError } = await supabase
        .from("contracts")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        setError("Contract not found");
      } else {
        setContract(data as Contract);
      }
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  function getSigningUrl() {
    if (!contract) return "";
    return `${window.location.origin}/sign/${contract.token}`;
  }

  async function handleCopyLink() {
    const url = getSigningUrl();
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleSendSMS() {
    if (!contract?.renter_phone) {
      setError("No phone number available");
      return;
    }

    setSending(true);
    setError("");

    try {
      const url = getSigningUrl();
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: contract.renter_phone,
          message: `Please sign your rental contract: ${url}`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to send SMS");
      }

      // Update contract status
      const { data: updated } = await supabase
        .from("contracts")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", contract.id)
        .select()
        .single();

      if (updated) setContract(updated as Contract);
      setShowSendModal(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!contract)
    return <div className="text-center py-8 text-red-600">{error}</div>;

  const status = statusConfig[contract.status];
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/contracts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Contract Details</h1>
            <p className="text-muted-foreground">
              Created {new Date(contract.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Badge variant="outline" className={`${status.color} text-sm px-3 py-1`}>
          <StatusIcon className="h-4 w-4 mr-1" />
          {status.label}
        </Badge>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Renter Information */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Renter Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">
                {contract.renter_name || "---"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{contract.renter_email || "---"}</span>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{contract.renter_phone || "---"}</span>
            </div>
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span>DL# {contract.renter_dl || "---"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Contract Actions */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Contract Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contract.status !== "signed" && (
              <Button
                onClick={() => setShowSendModal(true)}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              >
                <Send className="h-4 w-4 mr-2" />
                Send to Renter
              </Button>
            )}

            {contract.template_url && (
              <a
                href={contract.template_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Template PDF
                </Button>
              </a>
            )}

            {contract.signed_pdf_url && (
              <a
                href={contract.signed_pdf_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Signed Contract
                </Button>
              </a>
            )}

            <div className="pt-2 border-t">
              <Label className="text-sm text-muted-foreground">Signing Link</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  readOnly
                  value={getSigningUrl()}
                  className="font-mono text-xs"
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
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="border-0 bg-white shadow-sm ring-0 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Contract Created</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(contract.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {contract.sent_at && (
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Send className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Sent to Renter</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(contract.sent_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {contract.signed_at && (
                <div className="flex items-center gap-4">
                  <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Contract Signed</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(contract.signed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {!contract.sent_at && !contract.signed_at && (
                <div className="flex items-center gap-4 opacity-50">
                  <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium">Waiting to be sent</p>
                    <p className="text-sm text-muted-foreground">
                      Send the contract link to the renter
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Signature Preview */}
        {contract.signature_data && (
          <Card className="border-0 bg-white shadow-sm ring-0 lg:col-span-2">
            <CardHeader>
              <CardTitle>Signature</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 bg-gray-50">
                <img
                  src={contract.signature_data}
                  alt="Renter Signature"
                  className="max-h-32"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Send Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contract</DialogTitle>
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
                  value={getSigningUrl()}
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

            {contract.renter_phone && (
              <Button
                onClick={handleSendSMS}
                disabled={sending}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              >
                <Send className="h-4 w-4 mr-2" />
                {sending ? "Sending..." : `Send SMS to ${contract.renter_phone}`}
              </Button>
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
