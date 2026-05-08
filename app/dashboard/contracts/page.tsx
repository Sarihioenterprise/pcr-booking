"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Trash2, Send, FileText, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Operator } from "@/lib/types";

interface ContractTemplate {
  id: string;
  name: string;
  content_text: string;
  file_url?: string;
  created_at: string;
}

interface ContractSigning {
  id: string;
  contract_template_id: string;
  renter_name: string;
  renter_email: string;
  status: "pending" | "signed" | "expired";
  token: string;
  signed_at?: string;
  created_at: string;
}

export default function ContractsPage() {
  const supabase = createClient();
  const [operator, setOperator] = useState<Operator | null>(null);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [signings, setSignings] = useState<ContractSigning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ContractTemplate | null>(null);

  const [uploadForm, setUploadForm] = useState({
    name: "",
    contentType: "paste" as "paste" | "upload",
    contentText: "",
  });

  const [sendForm, setSendForm] = useState({
    renterName: "",
    renterEmail: "",
    renterPhone: "",
  });

  // Load operator and contracts
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get operator
      const { data: operatorData } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (operatorData) setOperator(operatorData as Operator);

      if (operatorData?.id) {
        // Get templates
        const { data: templatesData } = await supabase
          .from("contract_templates")
          .select("*")
          .eq("operator_id", operatorData.id)
          .order("created_at", { ascending: false });
        if (templatesData) setTemplates(templatesData as ContractTemplate[]);

        // Get signings
        const { data: signingsData } = await supabase
          .from("contract_signings")
          .select("*")
          .eq("operator_id", operatorData.id)
          .order("created_at", { ascending: false });
        if (signingsData) setSignings(signingsData as ContractSigning[]);
      }

      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleUploadContract(e: React.FormEvent) {
    e.preventDefault();
    if (!operator || !uploadForm.name || !uploadForm.contentText) {
      setError("Name and content are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("contract_templates")
        .insert({
          operator_id: operator.id,
          name: uploadForm.name,
          content_text: uploadForm.contentText,
        });

      if (insertError) throw insertError;

      // Reload templates
      const { data: templatesData } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("operator_id", operator.id)
        .order("created_at", { ascending: false });
      if (templatesData) setTemplates(templatesData as ContractTemplate[]);

      setUploadForm({ name: "", contentType: "paste", contentText: "" });
      setShowUploadModal(false);
    } catch (err: any) {
      setError(err.message || "Failed to upload contract");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendContract(e: React.FormEvent) {
    e.preventDefault();
    if (!operator || !selectedTemplate || !sendForm.renterEmail) {
      setError("All required fields must be filled");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Create contract signing record
      const { error: insertError } = await supabase
        .from("contract_signings")
        .insert({
          operator_id: operator.id,
          contract_template_id: selectedTemplate.id,
          renter_name: sendForm.renterName,
          renter_email: sendForm.renterEmail,
          renter_phone: sendForm.renterPhone || null,
          status: "pending",
        });

      if (insertError) throw insertError;

      // Send email notification to renter
      const signingUrl = `${window.location.origin}/sign/${selectedTemplate.id}`;
      await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: sendForm.renterEmail,
          subject: `Contract from ${operator.business_name}`,
          body: `<p>Hello ${sendForm.renterName},</p><p>Please review and sign the contract:</p><p><a href="${signingUrl}">Sign Contract</a></p>`,
          templateType: "contract_sent",
        }),
      });

      // Reload signings
      const { data: signingsData } = await supabase
        .from("contract_signings")
        .select("*")
        .eq("operator_id", operator.id)
        .order("created_at", { ascending: false });
      if (signingsData) setSignings(signingsData as ContractSigning[]);

      setSendForm({ renterName: "", renterEmail: "", renterPhone: "" });
      setShowSendModal(false);
      setSelectedTemplate(null);
    } catch (err: any) {
      setError(err.message || "Failed to send contract");
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this contract template?")) return;

    try {
      const { error: deleteError } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      setTemplates(templates.filter((t) => t.id !== id));
    } catch (err: any) {
      setError(err.message || "Failed to delete template");
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contracts & E-Signatures</h1>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-[#2EBD6B] text-white hover:bg-[#1a9952] flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Upload Contract
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Contract Templates Section */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Contract Templates</h2>
        {templates.length === 0 ? (
          <Card className="border-dashed border-2 border-gray-200 bg-gray-50">
            <CardContent className="pt-6 text-center text-gray-600">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No contract templates yet</p>
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(true)}
                className="mt-4"
              >
                Upload Your First Contract
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map((template) => (
              <Card key={template.id} className="border-0 bg-white shadow-sm">
                <CardContent className="pt-6 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{template.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">
                      Created {new Date(template.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setSelectedTemplate(template);
                        setShowSendModal(true);
                      }}
                      className="bg-[#2EBD6B] text-white hover:bg-[#1a9952] flex items-center gap-2"
                      size="sm"
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </Button>
                    <Button
                      onClick={() => deleteTemplate(template.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Signings Status Section */}
      {signings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Signing Status</h2>
          <div className="space-y-2 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="border-b border-gray-200">
                <tr className="text-gray-600">
                  <th className="text-left py-2 px-3 font-medium">Renter</th>
                  <th className="text-left py-2 px-3 font-medium">Email</th>
                  <th className="text-left py-2 px-3 font-medium">Status</th>
                  <th className="text-left py-2 px-3 font-medium">Signed At</th>
                </tr>
              </thead>
              <tbody>
                {signings.map((signing) => (
                  <tr key={signing.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-3">{signing.renter_name}</td>
                    <td className="py-3 px-3">{signing.renter_email}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          signing.status === "signed"
                            ? "bg-green-100 text-green-700"
                            : signing.status === "expired"
                            ? "bg-gray-100 text-gray-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {signing.status.charAt(0).toUpperCase() + signing.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {signing.signed_at
                        ? new Date(signing.signed_at).toLocaleDateString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Contract Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Contract Template</DialogTitle>
            <DialogDescription>
              Create a contract template that can be sent to renters for signature
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUploadContract} className="space-y-4">
            <div>
              <Label htmlFor="template_name">Contract Name *</Label>
              <Input
                id="template_name"
                placeholder="e.g., Standard Rental Agreement"
                value={uploadForm.name}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label>Contract Content *</Label>
              <textarea
                placeholder="Paste your contract text or HTML here..."
                value={uploadForm.contentText}
                onChange={(e) =>
                  setUploadForm((prev) => ({ ...prev, contentText: e.target.value }))
                }
                className="w-full h-48 p-3 border border-gray-200 rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#2EBD6B] resize-none"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUploadModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              >
                {loading ? "Uploading..." : "Upload Contract"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Send Contract Modal */}
      <Dialog open={showSendModal} onOpenChange={setShowSendModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Contract for Signature</DialogTitle>
            <DialogDescription>
              Enter renter details to send the contract
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendContract} className="space-y-4">
            <div>
              <Label htmlFor="renter_name">Renter Name *</Label>
              <Input
                id="renter_name"
                placeholder="John Doe"
                value={sendForm.renterName}
                onChange={(e) =>
                  setSendForm((prev) => ({ ...prev, renterName: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="renter_email">Email *</Label>
              <Input
                id="renter_email"
                type="email"
                placeholder="john@example.com"
                value={sendForm.renterEmail}
                onChange={(e) =>
                  setSendForm((prev) => ({ ...prev, renterEmail: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="renter_phone">Phone</Label>
              <Input
                id="renter_phone"
                placeholder="555-0100"
                value={sendForm.renterPhone}
                onChange={(e) =>
                  setSendForm((prev) => ({ ...prev, renterPhone: e.target.value }))
                }
                className="mt-1"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowSendModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
              >
                {loading ? "Sending..." : "Send Contract"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
