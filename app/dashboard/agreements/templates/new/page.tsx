"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function NewTemplatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const supabase = createClient();

  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      async function loadTemplate() {
        const { data } = await supabase
          .from("agreement_templates")
          .select("*")
          .eq("id", editId)
          .single();

        if (data) {
          setName(data.name);
          setContent(data.content);
          setIsDefault(data.is_default);
        }
        setLoading(false);
      }
      loadTemplate();
    }
  }, [editId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !content.trim()) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: operator } = await supabase
        .from("operators")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!operator) return;

      // If setting as default, unset other defaults
      if (isDefault) {
        await supabase
          .from("agreement_templates")
          .update({ is_default: false })
          .eq("operator_id", operator.id);
      }

      if (editId) {
        await supabase
          .from("agreement_templates")
          .update({
            name: name.trim(),
            content: content.trim(),
            is_default: isDefault,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editId);
      } else {
        await supabase.from("agreement_templates").insert({
          operator_id: operator.id,
          name: name.trim(),
          content: content.trim(),
          is_default: isDefault,
        });
      }

      router.push("/dashboard/agreements");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-muted-foreground">Loading template...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agreements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {editId ? "Edit Template" : "Create Template"}
          </h1>
          <p className="text-muted-foreground">
            {editId
              ? "Update your agreement template"
              : "Create a new agreement template for your rentals"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 bg-white shadow-sm ring-0">
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., Standard Rental Agreement"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Agreement Content</Label>
              <p className="text-xs text-muted-foreground">
                Available variables: {"{{renter_name}}"}, {"{{vehicle}}"},
                {"{{start_date}}"}, {"{{end_date}}"}, {"{{total_price}}"},
                {"{{deposit_amount}}"}
              </p>
              <Textarea
                id="content"
                placeholder="Enter the full agreement text..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={16}
                className="font-mono text-xs leading-relaxed"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is-default"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is-default" className="font-normal">
                Set as default template
              </Label>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/agreements">
            <Button variant="outline">Cancel</Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || !name.trim() || !content.trim()}
            style={{ backgroundColor: "#2EBD6B" }}
          >
            {saving
              ? "Saving..."
              : editId
              ? "Save Changes"
              : "Create Template"}
          </Button>
        </div>
      </form>
    </div>
  );
}
