"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type DocumentType =
  | "insurance"
  | "registration"
  | "state_inspection"
  | "city_inspection"
  | "tlc_inspection"
  | "other";

interface VehicleDocument {
  id: string;
  document_type: DocumentType;
  document_name: string | null;
  expiry_date: string;
  file_url: string | null;
  notes: string | null;
  alert_sent_30: boolean;
  alert_sent_14: boolean;
  alert_sent_7: boolean;
  created_at: string;
}

interface Props {
  vehicleId: string;
  operatorId: string;
}

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  insurance: "Insurance",
  registration: "Registration",
  state_inspection: "State Inspection",
  city_inspection: "City Inspection",
  tlc_inspection: "TLC Inspection",
  other: "Other",
};

function getDaysUntil(expiryDate: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate + "T00:00:00");
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function StatusBadge({ daysUntil }: { daysUntil: number }) {
  if (daysUntil < 0) {
    return (
      <Badge className="bg-red-600 text-white border-0 text-xs font-semibold">
        EXPIRED
      </Badge>
    );
  }
  if (daysUntil <= 7) {
    return (
      <Badge className="bg-red-600 text-white border-0 text-xs font-semibold">
        {daysUntil}d — CRITICAL
      </Badge>
    );
  }
  if (daysUntil <= 14) {
    return (
      <Badge className="bg-orange-500 text-white border-0 text-xs font-semibold">
        {daysUntil}d — WARNING
      </Badge>
    );
  }
  if (daysUntil <= 30) {
    return (
      <Badge className="bg-yellow-500 text-slate-900 border-0 text-xs font-semibold">
        {daysUntil}d — SOON
      </Badge>
    );
  }
  return (
    <Badge className="bg-emerald-600 text-white border-0 text-xs font-semibold">
      {daysUntil}d — OK
    </Badge>
  );
}

const EMPTY_FORM = {
  document_type: "" as DocumentType | "",
  document_name: "",
  expiry_date: "",
  notes: "",
  file_url: "",
};

export default function ComplianceVault({ vehicleId, operatorId }: Props) {
  const supabase = createClient();

  const [docs, setDocs] = useState<VehicleDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchDocs() {
    const { data, error } = await supabase
      .from("vehicle_documents")
      .select("*")
      .eq("vehicle_id", vehicleId)
      .order("expiry_date", { ascending: true });

    if (error) {
      setError("Failed to load documents.");
    } else {
      setDocs(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchDocs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleId]);

  async function handleAdd() {
    if (!form.document_type || !form.expiry_date) {
      setError("Document type and expiry date are required.");
      return;
    }
    setSaving(true);
    setError(null);

    const { error } = await supabase.from("vehicle_documents").insert({
      vehicle_id: vehicleId,
      operator_id: operatorId,
      document_type: form.document_type,
      document_name: form.document_name || null,
      expiry_date: form.expiry_date,
      notes: form.notes || null,
      file_url: form.file_url || null,
    });

    if (error) {
      setError("Failed to save document.");
    } else {
      setForm({ ...EMPTY_FORM });
      setShowForm(false);
      await fetchDocs();
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    await supabase.from("vehicle_documents").delete().eq("id", id);
    setDocs((prev) => prev.filter((d) => d.id !== id));
    setDeletingId(null);
  }

  return (
    <Card className="bg-slate-800 border-slate-700 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-slate-100 font-semibold text-base">
          Compliance Vault
        </h3>
        {!showForm && (
          <Button
            size="sm"
            onClick={() => { setShowForm(true); setError(null); }}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
          >
            + Add Document
          </Button>
        )}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Add Document Form */}
      {showForm && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-3">
          <p className="text-slate-300 text-sm font-medium">New Document</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Type *</Label>
              <Select
                value={form.document_type}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, document_type: v as DocumentType }))
                }
              >
                <SelectTrigger className="bg-slate-800 border-slate-600 text-slate-100 text-sm h-9">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(DOC_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem
                      key={value}
                      value={value}
                      className="text-slate-100 focus:bg-slate-700"
                    >
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Expiry Date *</Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiry_date: e.target.value }))
                }
                className="bg-slate-800 border-slate-600 text-slate-100 text-sm h-9"
              />
            </div>
          </div>

          {form.document_type === "other" && (
            <div className="space-y-1">
              <Label className="text-slate-400 text-xs">Document Name</Label>
              <Input
                placeholder="e.g. Commercial Auto Policy"
                value={form.document_name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, document_name: e.target.value }))
                }
                className="bg-slate-800 border-slate-600 text-slate-100 text-sm h-9"
              />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">File URL (optional)</Label>
            <Input
              placeholder="https://..."
              value={form.file_url}
              onChange={(e) =>
                setForm((f) => ({ ...f, file_url: e.target.value }))
              }
              className="bg-slate-800 border-slate-600 text-slate-100 text-sm h-9"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-slate-400 text-xs">Notes (optional)</Label>
            <Textarea
              placeholder="Policy number, carrier, etc."
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              rows={2}
              className="bg-slate-800 border-slate-600 text-slate-100 text-sm resize-none"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => { setShowForm(false); setError(null); setForm({ ...EMPTY_FORM }); }}
              className="text-slate-400 hover:text-slate-200 text-xs"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Document List */}
      {loading ? (
        <p className="text-slate-500 text-sm">Loading...</p>
      ) : docs.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No documents tracked yet. Add insurance, registration, and inspection
          documents to get expiry alerts.
        </p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const daysUntil = getDaysUntil(doc.expiry_date);
            const label =
              doc.document_type === "other" && doc.document_name
                ? doc.document_name
                : DOC_TYPE_LABELS[doc.document_type];

            return (
              <div
                key={doc.id}
                className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 gap-3"
              >
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-slate-100 text-sm font-medium truncate">
                    {label}
                  </p>
                  <p className="text-slate-500 text-xs">
                    Expires {doc.expiry_date}
                  </p>
                  {doc.notes && (
                    <p className="text-slate-600 text-xs truncate">{doc.notes}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge daysUntil={daysUntil} />

                  {doc.file_url && (
                    <a
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 text-xs underline"
                    >
                      View
                    </a>
                  )}

                  <button
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="text-slate-600 hover:text-red-400 transition-colors text-xs disabled:opacity-50"
                    aria-label="Delete document"
                  >
                    {deletingId === doc.id ? "..." : "✕"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
