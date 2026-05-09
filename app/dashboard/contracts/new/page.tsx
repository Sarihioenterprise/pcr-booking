"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Upload, FileText, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Operator } from "@/lib/types";

interface Renter {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  drivers_license_number: string | null;
}

export default function NewContractPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [operator, setOperator] = useState<Operator | null>(null);
  const [renters, setRenters] = useState<Renter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [uploadingTemplate, setUploadingTemplate] = useState(false);

  const [form, setForm] = useState({
    renterId: "",
    renterName: "",
    renterEmail: "",
    renterPhone: "",
    renterDl: "",
    templateUrl: "",
    useExistingRenter: true,
  });

  const [templateFile, setTemplateFile] = useState<File | null>(null);

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
        const { data: rentersData } = await supabase
          .from("renters")
          .select("id, name, email, phone, drivers_license_number")
          .eq("operator_id", operatorData.id)
          .order("name");
        if (rentersData) setRenters(rentersData as Renter[]);
      }

      setLoading(false);
    }
    load();
  }, [supabase]);

  function handleRenterSelect(renterId: string | null) {
    if (!renterId) return;
    const renter = renters.find((r) => r.id === renterId);
    if (renter) {
      setForm((prev) => ({
        ...prev,
        renterId,
        renterName: renter.name,
        renterEmail: renter.email || "",
        renterPhone: renter.phone || "",
        renterDl: renter.drivers_license_number || "",
      }));
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        setError("Please upload a PDF file");
        return;
      }
      setTemplateFile(file);
      setError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!operator) return;

    if (form.useExistingRenter && !form.renterId) {
      setError("Please select a renter");
      return;
    }

    if (!form.useExistingRenter && !form.renterName) {
      setError("Please enter renter name");
      return;
    }

    setSaving(true);
    setError("");

    try {
      let templateUrl = "";

      // Upload template PDF if provided
      if (templateFile) {
        setUploadingTemplate(true);
        const fileName = `${Date.now()}-${templateFile.name}`;
        const filePath = `${operator.id}/templates/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("contracts")
          .upload(filePath, templateFile);

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("contracts").getPublicUrl(filePath);

        templateUrl = publicUrl;
        setUploadingTemplate(false);
      }

      // Create contract
      const { error: insertError } = await supabase.from("contracts").insert({
        operator_id: operator.id,
        renter_id: form.useExistingRenter ? form.renterId : null,
        renter_name: form.renterName,
        renter_email: form.renterEmail || null,
        renter_phone: form.renterPhone || null,
        renter_dl: form.renterDl || null,
        template_url: templateUrl || null,
        status: "pending",
      });

      if (insertError) throw insertError;

      router.push("/dashboard/contracts");
    } catch (err: any) {
      setError(err.message || "Failed to create contract");
    } finally {
      setSaving(false);
      setUploadingTemplate(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/contracts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">New Contract</h1>
          <p className="text-muted-foreground">
            Create a contract for a renter to sign
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Renter Selection */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Renter Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button
                type="button"
                variant={form.useExistingRenter ? "default" : "outline"}
                onClick={() =>
                  setForm((prev) => ({ ...prev, useExistingRenter: true }))
                }
                className={form.useExistingRenter ? "bg-[#2EBD6B]" : ""}
              >
                Select Existing Renter
              </Button>
              <Button
                type="button"
                variant={!form.useExistingRenter ? "default" : "outline"}
                onClick={() =>
                  setForm((prev) => ({ ...prev, useExistingRenter: false }))
                }
                className={!form.useExistingRenter ? "bg-[#2EBD6B]" : ""}
              >
                Enter New Renter
              </Button>
            </div>

            {form.useExistingRenter ? (
              <div className="space-y-2">
                <Label>Select Renter *</Label>
                <Select value={form.renterId} onValueChange={handleRenterSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a renter..." />
                  </SelectTrigger>
                  <SelectContent>
                    {renters.map((renter) => (
                      <SelectItem key={renter.id} value={renter.id}>
                        {renter.name} {renter.email ? `(${renter.email})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {renters.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No renters found.{" "}
                    <Link
                      href="/dashboard/renters/new"
                      className="text-[#2EBD6B] hover:underline"
                    >
                      Add a renter first
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="renterName">Full Name *</Label>
                  <Input
                    id="renterName"
                    placeholder="John Doe"
                    value={form.renterName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, renterName: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterEmail">Email</Label>
                  <Input
                    id="renterEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={form.renterEmail}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, renterEmail: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterPhone">Phone</Label>
                  <Input
                    id="renterPhone"
                    placeholder="(555) 123-4567"
                    value={form.renterPhone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, renterPhone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="renterDl">Driver&apos;s License #</Label>
                  <Input
                    id="renterDl"
                    placeholder="DL12345678"
                    value={form.renterDl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, renterDl: e.target.value }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Show selected renter info */}
            {form.useExistingRenter && form.renterId && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2">Selected Renter:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {form.renterName}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>{" "}
                    {form.renterEmail || "---"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>{" "}
                    {form.renterPhone || "---"}
                  </div>
                  <div>
                    <span className="text-muted-foreground">DL#:</span>{" "}
                    {form.renterDl || "---"}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Template */}
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Contract Template (Optional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a PDF contract template. The renter will view this and sign
              it digitally. If no template is uploaded, a blank contract will be
              created.
            </p>

            <div
              className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center hover:border-[#2EBD6B] transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              {templateFile ? (
                <div className="flex items-center justify-center gap-3">
                  <FileText className="h-8 w-8 text-[#2EBD6B]" />
                  <div className="text-left">
                    <p className="font-medium">{templateFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(templateFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setTemplateFile(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="font-medium">Click to upload PDF template</p>
                  <p className="text-sm text-muted-foreground">
                    or drag and drop
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/contracts">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={saving}
            style={{ backgroundColor: "#2EBD6B" }}
          >
            {saving
              ? uploadingTemplate
                ? "Uploading..."
                : "Creating..."
              : "Create Contract"}
          </Button>
        </div>
      </form>
    </div>
  );
}
