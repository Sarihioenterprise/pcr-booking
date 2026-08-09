"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AlertCircle, CheckCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type SignMode = "rental_agreement" | "new_contract" | "legacy";

interface RentalAgreement {
  id: string;
  operator_id: string;
  booking_id: string;
  sign_token: string;
  content: string;
  status: "draft" | "sent" | "signed";
  renter_signature: string | null;
  signed_at: string | null;
  signer_ip: string | null;
  viewed_at: string | null;
}

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function SignContractPage() {
  const params = useParams();
  const token = params.token as string;
  const supabase = createClient();
  const sigPadRef = useRef<SignatureCanvas>(null);

  // Unified state
  const [mode, setMode] = useState<SignMode | null>(null);
  const [rentalAgreement, setRentalAgreement] = useState<RentalAgreement | null>(null);
  const [contract, setContract] = useState<Contract | null>(null);
  const [signing, setSigning] = useState<ContractSigning | null>(null);
  const [template, setTemplate] = useState<ContractTemplate | null>(null);
  const [operator, setOperator] = useState<Operator | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signed, setSigned] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    typedName: "",
    driversLicense: "",
    phone: "",
    agreeToTerms: false,
  });

  // ── Load agreement by token ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        // 1️⃣ Rental agreement (new e-sign system, linked to bookings)
        const { data: raData } = await supabase
          .from("rental_agreements")
          .select("*")
          .eq("sign_token", token)
          .maybeSingle();

        if (raData) {
          const ra = raData as RentalAgreement;
          setRentalAgreement(ra);
          setMode("rental_agreement");

          if (ra.status === "signed") {
            setSigned(true);
          }

          // Get operator
          const { data: opData } = await supabase
            .from("operators")
            .select("id, business_name, owner_name, business_email")
            .eq("id", ra.operator_id)
            .maybeSingle();
          if (opData) setOperator(opData as Operator);

          // Pre-fill name from booking renter_name
          if (!ra.renter_signature) {
            const { data: bkData } = await supabase
              .from("bookings")
              .select("renter_name, renter_phone")
              .eq("id", ra.booking_id)
              .maybeSingle();
            if (bkData) {
              setForm((prev) => ({
                ...prev,
                typedName: (bkData as { renter_name: string; renter_phone?: string }).renter_name || "",
                phone: (bkData as { renter_name: string; renter_phone?: string }).renter_phone || "",
              }));
            }
          }

          // Mark viewed (fire-and-forget)
          if (ra.status !== "signed") {
            fetch("/api/agreements/sign-by-token", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token, action: "viewed" }),
            }).catch(() => {});
          }

          setLoading(false);
          return;
        }

        // 2️⃣ New contracts table
        const { data: contractData } = await supabase
          .from("contracts")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (contractData) {
          const c = contractData as Contract;
          setContract(c);
          setMode("new_contract");

          setForm((prev) => ({
            ...prev,
            typedName: c.renter_name || "",
            driversLicense: c.renter_dl || "",
            phone: c.renter_phone || "",
          }));

          if (c.status === "signed") setSigned(true);

          const { data: opData } = await supabase
            .from("operators")
            .select("*")
            .eq("id", c.operator_id)
            .maybeSingle();
          if (opData) setOperator(opData as Operator);

          setLoading(false);
          return;
        }

        // 3️⃣ Legacy contract_signings table
        const { data: signingData, error: signingErr } = await supabase
          .from("contract_signings")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (signingErr || !signingData) {
          throw new Error("Signing link not found or invalid");
        }

        const s = signingData as ContractSigning;
        setSigning(s);
        setMode("legacy");

        setForm((prev) => ({ ...prev, typedName: s.renter_name || "" }));
        if (s.status === "signed") setSigned(true);

        const { data: tplData } = await supabase
          .from("contract_templates")
          .select("*")
          .eq("id", s.contract_template_id)
          .maybeSingle();
        if (tplData) setTemplate(tplData as ContractTemplate);

        const { data: opData } = await supabase
          .from("operators")
          .select("*")
          .eq("id", s.operator_id)
          .maybeSingle();
        if (opData) setOperator(opData as Operator);
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to load signing link"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, supabase]);

  function clearSignature() {
    sigPadRef.current?.clear();
  }

  // ── Sign handler ──────────────────────────────────────────────────────────────
  const handleSign = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!form.typedName.trim()) {
        setError("Please enter your full legal name");
        return;
      }
      if (!form.agreeToTerms) {
        setError("You must agree to the terms to continue");
        return;
      }

      // Require drawn signature for new systems
      if (
        (mode === "rental_agreement" || mode === "new_contract") &&
        sigPadRef.current?.isEmpty()
      ) {
        setError("Please draw your signature above");
        return;
      }

      setSubmitting(true);

      try {
        const signatureB64 = sigPadRef.current?.isEmpty()
          ? null
          : sigPadRef.current?.toDataURL("image/png") ?? null;

        // ── Rental Agreement (new booking e-sign system) ──────────────────────
        if (mode === "rental_agreement" && rentalAgreement) {
          const res = await fetch("/api/agreements/sign-by-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              token,
              typed_name: form.typedName.trim(),
              signature_png_b64: signatureB64,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Failed to sign agreement");

          setSigned(true);
          return;
        }

        // ── New contracts system ──────────────────────────────────────────────
        if (mode === "new_contract" && contract) {
          // Update contract record
          const { error: updateError } = await supabase
            .from("contracts")
            .update({
              status: "signed",
              signed_at: new Date().toISOString(),
              renter_name: form.typedName.trim(),
              renter_dl: form.driversLicense || null,
              renter_phone: form.phone || null,
              signature_data: signatureB64,
            })
            .eq("id", contract.id);

          if (updateError) throw updateError;

          // Notify operator
          if (operator?.business_email) {
            fetch("/api/email/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                to: operator.business_email,
                subject: `Contract signed by ${form.typedName.trim()}`,
                body: `<p>${form.typedName.trim()} has signed the rental contract.</p>`,
                templateType: "contract_signed",
              }),
            }).catch(() => {});
          }

          setSigned(true);
          return;
        }

        // ── Legacy system ─────────────────────────────────────────────────────
        if (mode === "legacy" && signing) {
          const { error: updateError } = await supabase
            .from("contract_signings")
            .update({
              status: "signed",
              signature_text: form.typedName.trim(),
              signed_at: new Date().toISOString(),
            })
            .eq("id", signing.id);

          if (updateError) throw updateError;
          setSigned(true);
          return;
        }

        throw new Error("Unknown signing mode — please reload and try again");
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "Failed to sign. Please try again."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [mode, form, rentalAgreement, contract, signing, operator, token, supabase]
  );

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-8 w-8 border-4 border-[#2EBD6B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading agreement...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error && !mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-900 font-semibold">{error}</p>
            <p className="text-sm text-red-700 mt-2">
              This link may have expired or been used already.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Already Signed ─────────────────────────────────────────────────────────
  if (signed) {
    const signerName =
      mode === "rental_agreement"
        ? rentalAgreement?.renter_signature || form.typedName
        : mode === "new_contract"
          ? form.typedName
          : form.typedName;
    const signedAt =
      mode === "rental_agreement" ? rentalAgreement?.signed_at : null;

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-green-900 mb-2">
              Agreement Signed
            </h2>
            {signerName && (
              <p className="text-green-800 mb-1 font-medium">{signerName}</p>
            )}
            {signedAt && (
              <p className="text-sm text-green-700 mb-3">
                Signed on{" "}
                {new Date(signedAt).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            )}
            <p className="text-green-800 text-sm">
              Thank you! Both parties will receive a confirmation email. Your
              electronic signature is legally binding.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Render agreement content ──────────────────────────────────────────────
  const agreementTitle =
    mode === "rental_agreement"
      ? "Rental Agreement"
      : mode === "legacy"
        ? template?.name || "Contract"
        : "Rental Agreement";

  const agreementContent =
    mode === "rental_agreement"
      ? rentalAgreement?.content
      : mode === "legacy"
        ? template?.content_text
        : null;

  const agreementPdfUrl =
    mode === "new_contract" ? contract?.template_url : null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <Card className="mb-6 border-0 bg-white shadow-sm">
          <CardContent className="pt-6 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  {agreementTitle}
                </h1>
                <p className="text-gray-600 text-sm">
                  From:{" "}
                  <span className="font-semibold">{operator?.business_name}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5 mt-1">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure signing
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agreement Content (text) */}
        {agreementContent && (
          <Card className="mb-6 border-0 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Agreement Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5 max-h-[480px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans leading-relaxed">
                  {agreementContent}
                </pre>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Scroll to read the full agreement before signing.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Agreement Content (PDF iframe — new contracts system) */}
        {agreementPdfUrl && (
          <Card className="mb-6 border-0 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Agreement Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-hidden bg-gray-100">
                <iframe
                  src={agreementPdfUrl}
                  className="w-full h-96"
                  title="Agreement PDF"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Signing Form */}
        <Card className="border-0 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Your Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSign} className="space-y-5">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1.5">
                <Label htmlFor="typedName">
                  Full Legal Name{" "}
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="typedName"
                  placeholder="Enter your full legal name"
                  value={form.typedName}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, typedName: e.target.value }))
                  }
                  disabled={submitting}
                  className="text-base"
                />
                <p className="text-xs text-gray-500">
                  Type exactly as it appears on your government-issued ID.
                </p>
              </div>

              {/* Optional fields (contracts + rental agreements) */}
              {(mode === "new_contract" || mode === "rental_agreement") && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="dl">Driver&apos;s License #</Label>
                    <Input
                      id="dl"
                      placeholder="DL12345678"
                      value={form.driversLicense}
                      onChange={(e) =>
                        setForm((p) => ({
                          ...p,
                          driversLicense: e.target.value,
                        }))
                      }
                      disabled={submitting}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="(555) 123-4567"
                      value={form.phone}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, phone: e.target.value }))
                      }
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              {/* Signature Pad */}
              {(mode === "rental_agreement" || mode === "new_contract") && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label>
                      Draw Signature{" "}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSignature}
                      disabled={submitting}
                      className="text-xs h-7 px-2"
                    >
                      <RotateCcw className="h-3.5 w-3.5 mr-1" />
                      Clear
                    </Button>
                  </div>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                    <SignatureCanvas
                      ref={sigPadRef}
                      penColor="#1a1a1a"
                      canvasProps={{
                        className: "w-full",
                        style: { width: "100%", height: "150px", touchAction: "none" },
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Sign above using your mouse or finger (touch-friendly).
                  </p>
                </div>
              )}

              {/* Terms checkbox */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-100">
                <Checkbox
                  id="agree"
                  checked={form.agreeToTerms}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, agreeToTerms: v as boolean }))
                  }
                  disabled={submitting}
                  className="mt-0.5"
                />
                <label
                  htmlFor="agree"
                  className="text-sm text-gray-700 leading-relaxed cursor-pointer"
                >
                  I have read and understood the full agreement above. I agree
                  to all terms and conditions. I understand that my electronic
                  signature (typed name + drawn signature) is{" "}
                  <strong>legally binding</strong> and has the same force as a
                  handwritten signature.{" "}
                  <span className="text-red-500">*</span>
                </label>
              </div>

              {/* Audit disclosure */}
              <p className="text-xs text-gray-400 text-center">
                Your IP address, device info, and timestamp will be recorded
                for the audit trail.
              </p>

              {/* Submit */}
              <Button
                type="submit"
                disabled={submitting || !form.typedName.trim() || !form.agreeToTerms}
                className="w-full bg-[#2EBD6B] text-white hover:bg-[#1a9952] py-5 text-base font-semibold"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing...
                  </span>
                ) : (
                  "✍️ Agree & Sign"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by{" "}
          <a href="https://pcrbooking.com" className="text-[#2EBD6B]">
            PCR Booking
          </a>{" "}
          · Electronic signatures are legally binding under ESIGN Act & UETA
        </p>
      </div>
    </div>
  );
}
