"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ContractSigning {
  id: string;
  renter_name: string;
  renter_email: string;
  status: "pending" | "signed" | "expired";
  contract_template_id: string;
  operator_id: string;
}

interface ContractTemplate {
  id: string;
  name: string;
  content_text: string;
  operator_id: string;
}

interface Operator {
  id: string;
  business_name: string;
  owner_name: string;
  business_email: string | null;
}

export default function SignContractPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  const token = params.token as string;

  const [signing, setSigning] = useState<ContractSigning | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    signature: "",
    agreeToTerms: false,
  });

  // Load contract signing details
  useEffect(() => {
    async function load() {
      try {
        // Get signing by token
        const { data: signingData, error: signingError } = await supabase
          .from("contract_signings")
          .select("*")
          .eq("token", token)
          .single();

        if (signingError) throw new Error("Contract not found");
        if (!signingData) throw new Error("Invalid contract link");

        const signingInfo = signingData as ContractSigning;
        setSigning(signingInfo);

        // Get template
        const { data: templateData } = await supabase
          .from("contract_templates")
          .select("*")
          .eq("id", signingInfo.contract_template_id)
          .single();

        if (templateData) setTemplate(templateData as ContractTemplate);

        // Get operator
        const { data: operatorData } = await supabase
          .from("operators")
          .select("*")
          .eq("id", signingInfo.operator_id)
          .single();

        if (operatorData) setOperator(operatorData as Operator);

        if (signingInfo.status === "signed") {
          setSigned(true);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    if (token) load();
  }, [token, supabase]);

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();

    if (!signing || !form.signature || !form.agreeToTerms) {
      setError("Please enter your name and agree to the terms");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // Update signing record
      const { error: updateError } = await supabase
        .from("contract_signings")
        .update({
          status: "signed",
          signature_text: form.signature,
          signed_at: new Date().toISOString(),
        })
        .eq("id", signing.id);

      if (updateError) throw updateError;

      // Send confirmation email to operator
      if (operator?.business_email) {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: operator.business_email,
            subject: `Contract signed by ${form.signature}`,
            body: `<p>${form.signature} has signed your contract.</p><p>Email: ${signing.renter_email}</p>`,
            templateType: "contract_signed",
          }),
        });
      }

      setSigned(true);
    } catch (err: any) {
      setError(err.message || "Failed to sign contract");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#2EBD6B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading contract...</p>
        </div>
      </div>
    );
  }

  if (error && !signing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-900 font-semibold">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (signed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-900 mb-2">Contract Signed!</h2>
            <p className="text-green-800 mb-4">
              Thank you for signing the contract. A confirmation has been sent to{" "}
              <span className="font-semibold">{signing?.renter_email}</span>.
            </p>
            <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952] w-full">
              Close
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-0 bg-white shadow-sm">
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {template?.name || "Contract"}
            </h1>
            <p className="text-gray-600">
              From: <span className="font-semibold">{operator?.business_name}</span>
            </p>
          </CardContent>
        </Card>

        {/* Contract Content */}
        <Card className="mb-6 border-0 bg-white shadow-sm">
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none">
              <div
                className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-96 overflow-y-auto font-mono text-sm text-gray-800 whitespace-pre-wrap break-words"
                dangerouslySetInnerHTML={{
                  __html: template?.content_text || "No contract content",
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signature Form */}
        {!signed && (
          <Card className="border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Sign Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSign} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    Full Name (Signature) *
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter your full name"
                    value={form.signature}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, signature: e.target.value }))
                    }
                    className="w-full"
                    disabled={submitting}
                  />
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox
                    id="agree"
                    checked={form.agreeToTerms}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, agreeToTerms: checked as boolean }))
                    }
                    disabled={submitting}
                  />
                  <label htmlFor="agree" className="text-sm text-gray-700 cursor-pointer">
                    I have read and agree to the terms and conditions in this contract *
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952]"
                >
                  {submitting ? "Signing..." : "Sign Contract"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
