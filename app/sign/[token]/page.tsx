"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, RotateCcw, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Contract {
  id: string;
  operator_id: string;
  renter_id: string | null;
  template_url: string | null;
  status: "pending" | "sent" | "signed";
  token: string;
  renter_name: string | null;
  renter_email: string | null;
  renter_phone: string | null;
  renter_dl: string | null;
}

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
  const token = params.token as string;
  const supabase = createClient();
  const sigPadRef = useRef<SignatureCanvas>(null);

  // State for new contracts system
  const [contract, setContract] = useState<Contract | null>(null);
  // State for legacy contract_signings system
  const [signing, setSigning] = useState<ContractSigning | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);

  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
  const [useLegacySystem, setUseLegacySystem] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    driversLicense: "",
    phone: "",
    agreeToTerms: false,
  });

  useEffect(() => {
    async function load() {
      try {
        // First try new contracts table
        const { data: contractData } = await supabase
          .from("contracts")
          .select("*")
          .eq("token", token)
          .single();

        if (contractData) {
          const contractInfo = contractData as Contract;
          setContract(contractInfo);

          // Pre-fill form
          setForm((prev) => ({
            ...prev,
            fullName: contractInfo.renter_name || "",
            driversLicense: contractInfo.renter_dl || "",
            phone: contractInfo.renter_phone || "",
          }));

          if (contractInfo.status === "signed") {
            setSigned(true);
          }

          // Get operator
          const { data: operatorData } = await supabase
            .from("operators")
            .select("*")
            .eq("id", contractInfo.operator_id)
            .single();
          if (operatorData) setOperator(operatorData as Operator);

          setLoading(false);
          return;
        }

        // Fall back to legacy contract_signings table
        const { data: signingData, error: signingError } = await supabase
          .from("contract_signings")
          .select("*")
          .eq("token", token)
          .single();

        if (signingError || !signingData) {
          throw new Error("Contract not found or invalid link");
        }

        const signingInfo = signingData as ContractSigning;
        setSigning(signingInfo);
        setUseLegacySystem(true);

        setForm((prev) => ({
          ...prev,
          fullName: signingInfo.renter_name || "",
        }));

        if (signingInfo.status === "signed") {
          setSigned(true);
        }

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
      } catch (err: any) {
        setError(err.message || "Failed to load contract");
      } finally {
        setLoading(false);
      }
    }

    if (token) load();
  }, [token, supabase]);

  function clearSignature() {
    sigPadRef.current?.clear();
  }

  async function generateSignedPDF(signatureDataUrl: string): Promise<Blob> {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();

    // Title
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("RENTAL AGREEMENT", pageWidth / 2, 25, { align: "center" });

    // Business Info
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text(operator?.business_name || "Rental Company", pageWidth / 2, 35, {
      align: "center",
    });

    // Divider
    pdf.setDrawColor(200, 200, 200);
    pdf.line(20, 45, pageWidth - 20, 45);

    // Renter Information Section
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Renter Information", 20, 60);

    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    let y = 70;

    pdf.text(`Full Name: ${form.fullName}`, 20, y);
    y += 8;
    pdf.text(`Driver's License: ${form.driversLicense || "N/A"}`, 20, y);
    y += 8;
    pdf.text(`Phone: ${form.phone || "N/A"}`, 20, y);
    y += 8;
    pdf.text(`Email: ${contract?.renter_email || signing?.renter_email || "N/A"}`, 20, y);
    y += 15;

    // Contract Date
    pdf.text(`Date Signed: ${new Date().toLocaleDateString()}`, 20, y);
    y += 8;
    pdf.text(`Time: ${new Date().toLocaleTimeString()}`, 20, y);
    y += 20;

    // Terms Section
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Terms and Conditions", 20, y);
    y += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    const terms = [
      "1. The renter agrees to return the vehicle in the same condition as received.",
      "2. The renter is responsible for all traffic violations during the rental period.",
      "3. The renter agrees to maintain proper insurance coverage.",
      "4. Smoking in the vehicle is prohibited.",
      "5. The renter acknowledges receipt of the vehicle in good working condition.",
      "6. Any damage to the vehicle will be the responsibility of the renter.",
      "7. The rental company reserves the right to charge for excess mileage.",
      "8. The renter agrees to fuel charges if the vehicle is not returned full.",
    ];

    terms.forEach((term) => {
      if (y > 250) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(term, 20, y);
      y += 7;
    });

    y += 15;

    // Signature Section
    if (y > 200) {
      pdf.addPage();
      y = 30;
    }

    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Signature", 20, y);
    y += 10;

    // Add signature image
    try {
      pdf.addImage(signatureDataUrl, "PNG", 20, y, 80, 40);
      y += 45;
    } catch (e) {
      console.error("Error adding signature image:", e);
    }

    // Signature line and date
    pdf.setDrawColor(0, 0, 0);
    pdf.line(20, y, 100, y);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(form.fullName, 20, y + 5);
    pdf.text(`Signed: ${new Date().toLocaleDateString()}`, 20, y + 10);

    // Footer
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      "This document was electronically signed via PCR Booking",
      pageWidth / 2,
      285,
      { align: "center" }
    );

    return pdf.output("blob");
  }

  async function handleSign(e: React.FormEvent) {
    e.preventDefault();

    if (!form.fullName.trim()) {
      setError("Please enter your full name");
      return;
    }

    if (!form.agreeToTerms) {
      setError("Please agree to the terms and conditions");
      return;
    }

    // Check signature for new system
    if (!useLegacySystem && sigPadRef.current?.isEmpty()) {
      setError("Please provide your signature");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      if (useLegacySystem && signing) {
        // Legacy system: just update the signing record
        const { error: updateError } = await supabase
          .from("contract_signings")
          .update({
            status: "signed",
            signature_text: form.fullName,
            signed_at: new Date().toISOString(),
          })
          .eq("id", signing.id);

        if (updateError) throw updateError;
      } else if (contract) {
        // New system: generate PDF and upload
        const signatureDataUrl = sigPadRef.current?.toDataURL("image/png") || "";

        // Generate PDF
        const pdfBlob = await generateSignedPDF(signatureDataUrl);

        // Upload signed PDF to storage
        const fileName = `${contract.id}-signed-${Date.now()}.pdf`;
        const filePath = `${contract.operator_id}/signed/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("contracts")
          .upload(filePath, pdfBlob, {
            contentType: "application/pdf",
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          // Continue anyway - we can save without the PDF URL
        }

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("contracts").getPublicUrl(filePath);

        // Update contract record
        const { error: updateError } = await supabase
          .from("contracts")
          .update({
            status: "signed",
            signed_at: new Date().toISOString(),
            renter_name: form.fullName,
            renter_dl: form.driversLicense || null,
            renter_phone: form.phone || null,
            signature_data: signatureDataUrl,
            signed_pdf_url: publicUrl,
          })
          .eq("id", contract.id);

        if (updateError) throw updateError;

        setSignedPdfUrl(publicUrl);
      }

      // Send email notification to operator
      if (operator?.business_email) {
        await fetch("/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: operator.business_email,
            subject: `Contract signed by ${form.fullName}`,
            body: `<p>${form.fullName} has signed the rental contract.</p><p>You can view the signed contract in your dashboard.</p>`,
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

  if (error && !contract && !signing) {
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
            <h2 className="text-xl font-bold text-green-900 mb-2">
              Contract Signed!
            </h2>
            <p className="text-green-800 mb-4">
              Thank you for signing the rental agreement. The operator has been
              notified.
            </p>
            {signedPdfUrl && (
              <a href={signedPdfUrl} target="_blank" rel="noopener noreferrer">
                <Button className="bg-[#2EBD6B] text-white hover:bg-[#1a9952]">
                  <Download className="h-4 w-4 mr-2" />
                  Download Signed Contract
                </Button>
              </a>
            )}
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
              {useLegacySystem ? template?.name || "Contract" : "Rental Agreement"}
            </h1>
            <p className="text-gray-600">
              From:{" "}
              <span className="font-semibold">{operator?.business_name}</span>
            </p>
          </CardContent>
        </Card>

        {/* Contract Preview - Legacy System */}
        {useLegacySystem && template && (
          <Card className="mb-6 border-0 bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="prose prose-sm max-w-none">
                <div
                  className="bg-gray-50 p-6 rounded-lg border border-gray-200 h-96 overflow-y-auto font-mono text-sm text-gray-800 whitespace-pre-wrap break-words"
                  dangerouslySetInnerHTML={{
                    __html: template.content_text || "No contract content",
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contract Preview - New System with PDF */}
        {!useLegacySystem && contract?.template_url && (
          <Card className="mb-6 border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Contract Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={contract.template_url}
                  className="w-full h-96"
                  title="Contract PDF"
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Please review the contract above before signing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Signing Form */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Sign Contract</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSign} className="space-y-6">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Renter Info Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={form.fullName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, fullName: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="driversLicense">Driver&apos;s License #</Label>
                  <Input
                    id="driversLicense"
                    placeholder="DL12345678"
                    value={form.driversLicense}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        driversLicense: e.target.value,
                      }))
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="(555) 123-4567"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Signature Pad - New System Only */}
              {!useLegacySystem && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Signature *</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      disabled={submitting}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-gray-200 rounded-lg bg-white">
                    <SignatureCanvas
                      ref={sigPadRef}
                      penColor="black"
                      canvasProps={{
                        className: "w-full h-40 cursor-crosshair",
                        style: { width: "100%", height: "160px" },
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Draw your signature above using your mouse or finger
                  </p>
                </div>
              )}

              {/* Terms Agreement */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="agree"
                  checked={form.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setForm((prev) => ({
                      ...prev,
                      agreeToTerms: checked as boolean,
                    }))
                  }
                  disabled={submitting}
                />
                <label
                  htmlFor="agree"
                  className="text-sm text-gray-700 cursor-pointer"
                >
                  I have read and agree to the terms and conditions of this
                  rental agreement. I understand that my electronic signature is
                  legally binding. *
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952] py-6 text-lg"
              >
                {submitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Signing...
                  </>
                ) : (
                  "Sign Contract"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by PCR Booking
        </p>
      </div>
    </div>
  );
}
