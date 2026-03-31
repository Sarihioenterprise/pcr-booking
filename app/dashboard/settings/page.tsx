"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Building2,
  Palette,
  CreditCard,
  Users,
  Mail,
  Webhook,
  Code,
  Crown,
  Copy,
  Check,
  Plus,
  Trash2,
  ExternalLink,
  Eye,
  EyeOff,
  Settings,
} from "lucide-react";
import type {
  Operator,
  TeamMember,
  EmailTemplate,
  WebhookEndpoint,
} from "@/lib/types";

const WEBHOOK_EVENTS = [
  "new_booking",
  "payment_received",
  "booking_completed",
  "booking_cancelled",
  "agreement_signed",
  "maintenance_due",
  "deposit_released",
  "lead_qualified",
];

const EMAIL_TEMPLATE_TYPES = [
  "booking_confirmation",
  "payment_receipt",
  "agreement_sent",
  "reminder",
  "welcome",
  "custom",
] as const;

const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  growth: {
    name: "Growth",
    price: "$79/mo",
    features: ["Unlimited leads", "AI bot calling", "Priority support"],
  },
  pro: {
    name: "Pro",
    price: "$149/mo",
    features: ["Everything in Growth", "Multi-location", "Advanced analytics", "Team management"],
  },
  scale: {
    name: "Scale",
    price: "$299/mo",
    features: ["Everything in Pro", "White-label", "API access", "Dedicated support"],
  },
};

export default function SettingsPage() {
  const supabase = createClient();

  // Operator state
  const [operator, setOperator] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);

  // Business profile form
  const [businessName, setBusinessName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [timezone, setTimezone] = useState("America/New_York");
  const [defaultPickupInstructions, setDefaultPickupInstructions] = useState("");

  // Branding
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#2EBD6B");

  // Payment settings
  const [taxRate, setTaxRate] = useState("0");
  const [depositAmount, setDepositAmount] = useState("0");
  const [depositAutoReleaseDays, setDepositAutoReleaseDays] = useState("14");

  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"owner" | "manager" | "staff">("staff");

  // Email templates
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateType, setNewTemplateType] = useState<string>("custom");
  const [newTemplateSubject, setNewTemplateSubject] = useState("");
  const [newTemplateBody, setNewTemplateBody] = useState("");
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);

  // Webhooks
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookSecret, setNewWebhookSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // Widget
  const [copiedEmbed, setCopiedEmbed] = useState(false);

  // Saving state
  const [saving, setSaving] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 3000);
  }, []);

  // Load operator data
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: op } = await supabase
        .from("operators")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (op) {
        setOperator(op as Operator);
        setBusinessName(op.business_name || "");
        setOwnerName(op.owner_name || "");
        setPhone(op.phone || "");
        setBusinessEmail(op.business_email || "");
        setBusinessAddress(op.business_address || "");
        setCity(op.city || "");
        setState(op.state || "");
        setTimezone(op.timezone || "America/New_York");
        setDefaultPickupInstructions(op.default_pickup_instructions || "");
        setLogoUrl(op.logo_url || "");
        setBrandColor(op.brand_color || "#2EBD6B");
        setTaxRate(String(op.tax_rate ?? 0));
        setDepositAmount(String(op.deposit_amount ?? 0));
        setDepositAutoReleaseDays(String(op.deposit_auto_release_days ?? 14));

        // Load related data
        const [teamRes, templatesRes, webhooksRes] = await Promise.all([
          supabase.from("team_members").select("*").eq("operator_id", op.id).order("created_at"),
          supabase.from("email_templates").select("*").eq("operator_id", op.id).order("created_at"),
          supabase.from("webhook_endpoints").select("*").eq("operator_id", op.id).order("created_at"),
        ]);

        setTeamMembers((teamRes.data as TeamMember[]) || []);
        setEmailTemplates((templatesRes.data as EmailTemplate[]) || []);
        setWebhooks((webhooksRes.data as WebhookEndpoint[]) || []);
      }
      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Save business profile
  async function saveBusinessProfile() {
    if (!operator) return;
    setSaving("profile");
    const { error } = await supabase
      .from("operators")
      .update({
        business_name: businessName,
        owner_name: ownerName,
        phone,
        business_email: businessEmail,
        business_address: businessAddress,
        city,
        state,
        timezone,
        default_pickup_instructions: defaultPickupInstructions || null,
      })
      .eq("id", operator.id);

    setSaving("");
    if (!error) showSuccess("Business profile saved");
  }

  // Save branding
  async function saveBranding() {
    if (!operator) return;
    setSaving("branding");
    const { error } = await supabase
      .from("operators")
      .update({
        logo_url: logoUrl || null,
        brand_color: brandColor,
      })
      .eq("id", operator.id);

    setSaving("");
    if (!error) showSuccess("Branding saved");
  }

  // Save payment settings
  async function savePaymentSettings() {
    if (!operator) return;
    setSaving("payment");
    const { error } = await supabase
      .from("operators")
      .update({
        tax_rate: parseFloat(taxRate) || 0,
        deposit_amount: parseFloat(depositAmount) || 0,
        deposit_auto_release_days: parseInt(depositAutoReleaseDays) || 14,
      })
      .eq("id", operator.id);

    setSaving("");
    if (!error) showSuccess("Payment settings saved");
  }

  // Add team member
  async function addTeamMember() {
    if (!newMemberName || !newMemberEmail) return;
    setSaving("team");

    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newMemberName,
        email: newMemberEmail,
        role: newMemberRole,
      }),
    });

    const json = await res.json();
    setSaving("");

    if (json.success) {
      setTeamMembers((prev) => [...prev, json.data]);
      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberRole("staff");
      showSuccess("Team member added");
    }
  }

  // Remove team member
  async function removeTeamMember(id: string) {
    const res = await fetch(`/api/settings/team?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setTeamMembers((prev) => prev.filter((m) => m.id !== id));
      showSuccess("Team member removed");
    }
  }

  // Create email template
  async function createEmailTemplate() {
    if (!newTemplateName || !newTemplateSubject || !newTemplateBody) return;
    setSaving("template");

    const res = await fetch("/api/settings/email-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: newTemplateType,
        name: newTemplateName,
        subject: newTemplateSubject,
        body: newTemplateBody,
      }),
    });

    const json = await res.json();
    setSaving("");

    if (json.success) {
      setEmailTemplates((prev) => [...prev, json.data]);
      setNewTemplateName("");
      setNewTemplateType("custom");
      setNewTemplateSubject("");
      setNewTemplateBody("");
      showSuccess("Email template created");
    }
  }

  // Update email template
  async function updateEmailTemplate() {
    if (!editingTemplate) return;
    setSaving("template-edit");

    const res = await fetch("/api/settings/email-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingTemplate.id,
        name: editingTemplate.name,
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        is_active: editingTemplate.is_active,
      }),
    });

    const json = await res.json();
    setSaving("");

    if (json.success) {
      setEmailTemplates((prev) =>
        prev.map((t) => (t.id === json.data.id ? json.data : t))
      );
      setEditingTemplate(null);
      setTemplateDialogOpen(false);
      showSuccess("Template updated");
    }
  }

  // Delete email template
  async function deleteEmailTemplate(id: string) {
    const res = await fetch(`/api/settings/email-templates?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setEmailTemplates((prev) => prev.filter((t) => t.id !== id));
      showSuccess("Template deleted");
    }
  }

  // Toggle template active
  async function toggleTemplateActive(template: EmailTemplate) {
    const res = await fetch("/api/settings/email-templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: template.id, is_active: !template.is_active }),
    });
    const json = await res.json();
    if (json.success) {
      setEmailTemplates((prev) =>
        prev.map((t) => (t.id === json.data.id ? json.data : t))
      );
    }
  }

  // Create webhook
  async function createWebhook() {
    if (!newWebhookUrl || newWebhookEvents.length === 0) return;
    setSaving("webhook");

    const res = await fetch("/api/settings/webhooks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: newWebhookUrl,
        events: newWebhookEvents,
        secret: newWebhookSecret || null,
        is_active: true,
      }),
    });

    const json = await res.json();
    setSaving("");

    if (json.success) {
      setWebhooks((prev) => [...prev, json.data]);
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
      setNewWebhookSecret("");
      showSuccess("Webhook endpoint added");
    }
  }

  // Toggle webhook active
  async function toggleWebhookActive(webhook: WebhookEndpoint) {
    const res = await fetch("/api/settings/webhooks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: webhook.id, is_active: !webhook.is_active }),
    });
    const json = await res.json();
    if (json.success) {
      setWebhooks((prev) =>
        prev.map((w) => (w.id === json.data.id ? json.data : w))
      );
    }
  }

  // Delete webhook
  async function deleteWebhook(id: string) {
    const res = await fetch(`/api/settings/webhooks?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      showSuccess("Webhook removed");
    }
  }

  // Toggle webhook event
  function toggleWebhookEvent(event: string) {
    setNewWebhookEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  // Copy embed code
  function handleCopyEmbed() {
    if (!operator) return;
    const embedCode = `<script src="https://widget.pcrbooking.com/v1/embed.js" data-operator-id="${operator.id}"></script>`;
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#2EBD6B] border-t-transparent" />
      </div>
    );
  }

  const currentPlan = operator?.plan || "growth";
  const embedCode = operator
    ? `<script src="https://widget.pcrbooking.com/v1/embed.js" data-operator-id="${operator.id}"></script>`
    : "";

  return (
    <div className="space-y-6 max-w-4xl" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#2EBD6B]" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your account, team, and business preferences
        </p>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 font-medium">
          {successMsg}
        </div>
      )}

      <Tabs defaultValue="profile">
        <TabsList className="flex flex-wrap gap-1">
          <TabsTrigger value="profile"><Building2 className="h-3.5 w-3.5 mr-1.5" />Business</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-3.5 w-3.5 mr-1.5" />Branding</TabsTrigger>
          <TabsTrigger value="payment"><CreditCard className="h-3.5 w-3.5 mr-1.5" />Payment</TabsTrigger>
          <TabsTrigger value="team"><Users className="h-3.5 w-3.5 mr-1.5" />Team</TabsTrigger>
          <TabsTrigger value="email"><Mail className="h-3.5 w-3.5 mr-1.5" />Email</TabsTrigger>
          <TabsTrigger value="webhooks"><Webhook className="h-3.5 w-3.5 mr-1.5" />Webhooks</TabsTrigger>
          <TabsTrigger value="widget"><Code className="h-3.5 w-3.5 mr-1.5" />Widget</TabsTrigger>
          <TabsTrigger value="subscription"><Crown className="h-3.5 w-3.5 mr-1.5" />Plan</TabsTrigger>
        </TabsList>

        {/* ── Business Profile ── */}
        <TabsContent value="profile">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Update your business details visible to customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business Name</Label>
                  <Input id="businessName" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input id="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Email</Label>
                  <Input id="businessEmail" type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="businessAddress">Address</Label>
                  <Input id="businessAddress" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                </div>
                <div className="grid gap-4 grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input id="state" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select value={timezone} onValueChange={(v) => { if (v) setTimezone(v); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/New_York">Eastern</SelectItem>
                        <SelectItem value="America/Chicago">Central</SelectItem>
                        <SelectItem value="America/Denver">Mountain</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                        <SelectItem value="America/Anchorage">Alaska</SelectItem>
                        <SelectItem value="Pacific/Honolulu">Hawaii</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupInstructions">Default Pickup Instructions</Label>
                <Textarea
                  id="pickupInstructions"
                  value={defaultPickupInstructions}
                  onChange={(e) => setDefaultPickupInstructions(e.target.value)}
                  placeholder="Instructions sent to renters for vehicle pickup..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveBusinessProfile} disabled={saving === "profile"} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                  {saving === "profile" ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Branding ── */}
        <TabsContent value="branding">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Customize your brand appearance for the booking widget and portal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://example.com/logo.png" />
                {logoUrl && (
                  <div className="mt-2 p-4 border rounded-lg bg-slate-50">
                    <p className="text-xs text-muted-foreground mb-2">Preview:</p>
                    <img src={logoUrl} alt="Logo preview" className="max-h-16 object-contain" />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded border-0 p-0"
                  />
                  <Input
                    id="brandColor"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#2EBD6B"
                    className="max-w-[140px] font-mono"
                  />
                </div>
                <div className="mt-3 p-4 border rounded-lg bg-slate-50">
                  <p className="text-xs text-muted-foreground mb-3">Preview:</p>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg" style={{ backgroundColor: brandColor }} />
                    <button
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                      style={{ backgroundColor: brandColor }}
                    >
                      Book Now
                    </button>
                    <span className="text-sm font-medium" style={{ color: brandColor }}>
                      Link Text
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveBranding} disabled={saving === "branding"} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                  {saving === "branding" ? "Saving..." : "Save Branding"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Payment Settings ── */}
        <TabsContent value="payment">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure tax rates, deposits, and payment processing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Tax Rate (%)</Label>
                  <Input id="taxRate" type="number" step="0.01" min="0" max="100" value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositAmount">Deposit Amount ($)</Label>
                  <Input id="depositAmount" type="number" step="0.01" min="0" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="depositRelease">Deposit Auto-Release (days)</Label>
                  <Input id="depositRelease" type="number" min="1" value={depositAutoReleaseDays} onChange={(e) => setDepositAutoReleaseDays(e.target.value)} />
                  <p className="text-xs text-muted-foreground">Days after booking ends before deposit is automatically released.</p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Stripe Account</Label>
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono text-xs">
                    {operator?.stripe_account_id || "Not connected"}
                  </Badge>
                  {operator?.stripe_account_id && (
                    <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Connected</Badge>
                  )}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={savePaymentSettings} disabled={saving === "payment"} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                  {saving === "payment" ? "Saving..." : "Save Payment Settings"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Team ── */}
        <TabsContent value="team">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage who has access to your dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Team table */}
              {teamMembers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-2 font-medium text-muted-foreground">Name</th>
                        <th className="pb-2 font-medium text-muted-foreground">Email</th>
                        <th className="pb-2 font-medium text-muted-foreground">Role</th>
                        <th className="pb-2 font-medium text-muted-foreground">Status</th>
                        <th className="pb-2 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className="border-b last:border-0">
                          <td className="py-3 font-medium">{member.name}</td>
                          <td className="py-3 text-muted-foreground">{member.email}</td>
                          <td className="py-3">
                            <Badge
                              variant="outline"
                              className={
                                member.role === "owner"
                                  ? "bg-purple-100 text-purple-700 border-purple-200"
                                  : member.role === "manager"
                                  ? "bg-blue-100 text-blue-700 border-blue-200"
                                  : "bg-slate-100 text-slate-700 border-slate-200"
                              }
                            >
                              {member.role}
                            </Badge>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className={member.accepted_at ? "bg-green-100 text-green-700 border-green-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
                              {member.accepted_at ? "Active" : "Pending"}
                            </Badge>
                          </td>
                          <td className="py-3 text-right">
                            {member.role !== "owner" && (
                              <Button variant="ghost" size="sm" onClick={() => removeTeamMember(member.id)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No team members yet. Invite someone below.</p>
              )}

              <Separator />

              {/* Invite form */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Invite Team Member</h3>
                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-1">
                    <Label htmlFor="memberName" className="text-xs">Name</Label>
                    <Input id="memberName" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="John Doe" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="memberEmail" className="text-xs">Email</Label>
                    <Input id="memberEmail" type="email" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} placeholder="john@example.com" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="memberRole" className="text-xs">Role</Label>
                    <Select value={newMemberRole} onValueChange={(v) => { if (v) setNewMemberRole(v as "owner" | "manager" | "staff"); }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="staff">Staff</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addTeamMember} disabled={saving === "team" || !newMemberName || !newMemberEmail} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white w-full">
                      <Plus className="h-4 w-4 mr-1" />
                      {saving === "team" ? "Adding..." : "Invite"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Email Templates ── */}
        <TabsContent value="email">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>Customize automated emails sent to renters.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Templates list */}
              {emailTemplates.length > 0 ? (
                <div className="space-y-2">
                  {emailTemplates.map((template) => (
                    <div key={template.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{template.name}</span>
                          <Badge variant="outline" className="text-xs">{template.type}</Badge>
                          <Badge
                            variant="outline"
                            className={template.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}
                          >
                            {template.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{template.subject}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleTemplateActive(template)}
                        >
                          {template.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingTemplate({ ...template });
                            setTemplateDialogOpen(true);
                          }}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteEmailTemplate(template.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No email templates yet.</p>
              )}

              <Separator />

              {/* Create new template */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Create New Template</h3>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Template Name</Label>
                      <Input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Welcome Email" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Type</Label>
                      <Select value={newTemplateType} onValueChange={(v) => { if (v) setNewTemplateType(v); }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {EMAIL_TEMPLATE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input value={newTemplateSubject} onChange={(e) => setNewTemplateSubject(e.target.value)} placeholder="Your booking is confirmed!" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body</Label>
                    <Textarea value={newTemplateBody} onChange={(e) => setNewTemplateBody(e.target.value)} placeholder="Hello {{renter_name}},..." rows={5} />
                    <p className="text-xs text-muted-foreground">Use variables: {"{{renter_name}}, {{booking_id}}, {{vehicle}}, {{start_date}}, {{end_date}}, {{total_price}}"}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createEmailTemplate} disabled={saving === "template" || !newTemplateName || !newTemplateSubject || !newTemplateBody} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                      <Plus className="h-4 w-4 mr-1" />
                      {saving === "template" ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Edit template dialog */}
          <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Edit Template</DialogTitle>
                <DialogDescription>Modify the email template content.</DialogDescription>
              </DialogHeader>
              {editingTemplate && (
                <div className="space-y-3 py-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={editingTemplate.name} onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Input value={editingTemplate.subject} onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Body</Label>
                    <Textarea value={editingTemplate.body} onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })} rows={8} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <DialogClose>
                  <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button onClick={updateEmailTemplate} disabled={saving === "template-edit"} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                  {saving === "template-edit" ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Webhooks ── */}
        <TabsContent value="webhooks">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle>Webhook Endpoints</CardTitle>
              <CardDescription>Receive real-time event notifications at your endpoints.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Existing webhooks */}
              {webhooks.length > 0 ? (
                <div className="space-y-2">
                  {webhooks.map((wh) => (
                    <div key={wh.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono truncate">{wh.url}</code>
                            <Badge
                              variant="outline"
                              className={wh.is_active ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-500 border-slate-200"}
                            >
                              {wh.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {wh.events.map((e) => (
                              <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                            ))}
                          </div>
                          {wh.last_triggered_at && (
                            <p className="text-xs text-muted-foreground mt-1">Last triggered: {new Date(wh.last_triggered_at).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button variant="ghost" size="sm" onClick={() => toggleWebhookActive(wh)}>
                            {wh.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteWebhook(wh.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No webhook endpoints configured.</p>
              )}

              <Separator />

              {/* Add new webhook */}
              <div>
                <h3 className="text-sm font-semibold mb-3">Add Webhook Endpoint</h3>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Endpoint URL</Label>
                    <Input value={newWebhookUrl} onChange={(e) => setNewWebhookUrl(e.target.value)} placeholder="https://your-app.com/webhook" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Secret (optional)</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showSecret ? "text" : "password"}
                        value={newWebhookSecret}
                        onChange={(e) => setNewWebhookSecret(e.target.value)}
                        placeholder="whsec_..."
                      />
                      <Button variant="outline" size="sm" onClick={() => setShowSecret(!showSecret)}>
                        {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Events</Label>
                    <div className="flex flex-wrap gap-2">
                      {WEBHOOK_EVENTS.map((event) => (
                        <button
                          key={event}
                          type="button"
                          onClick={() => toggleWebhookEvent(event)}
                          className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                            newWebhookEvents.includes(event)
                              ? "bg-[#2EBD6B]/10 border-[#2EBD6B]/30 text-[#2EBD6B] font-medium"
                              : "border-slate-200 text-muted-foreground hover:border-slate-300"
                          }`}
                        >
                          {event}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={createWebhook} disabled={saving === "webhook" || !newWebhookUrl || newWebhookEvents.length === 0} className="bg-[#2EBD6B] hover:bg-[#26a85d] text-white">
                      <Plus className="h-4 w-4 mr-1" />
                      {saving === "webhook" ? "Adding..." : "Add Webhook"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Widget ── */}
        <TabsContent value="widget">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Widget Embed Code
              </CardTitle>
              <CardDescription>Add this script tag to your website to display the PCR Booking widget.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Textarea readOnly value={embedCode} className="font-mono text-xs bg-slate-50 min-h-[60px] pr-20" />
                <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={handleCopyEmbed}>
                  {copiedEmbed ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                  {copiedEmbed ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Your operator ID is <code className="bg-slate-100 px-1 rounded text-xs">{operator?.id || "..."}</code>
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Subscription ── */}
        <TabsContent value="subscription">
          <Card className="border-0 bg-white shadow-sm ring-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
              <CardDescription>Manage your subscription and billing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                {Object.entries(PLAN_DETAILS).map(([key, plan]) => {
                  const isCurrent = key === currentPlan;
                  return (
                    <div
                      key={key}
                      className={`rounded-lg border p-4 ${
                        isCurrent
                          ? "border-[#2EBD6B] ring-2 ring-[#2EBD6B]/20 bg-[#2EBD6B]/5"
                          : "border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{plan.name}</h3>
                        {isCurrent && (
                          <Badge className="bg-[#2EBD6B] text-white">Current</Badge>
                        )}
                      </div>
                      <p className="text-2xl font-bold mb-3">{plan.price}</p>
                      <ul className="space-y-1">
                        {plan.features.map((f) => (
                          <li key={f} className="text-xs text-muted-foreground flex items-start gap-1.5">
                            <Check className="h-3 w-3 mt-0.5 text-[#2EBD6B] shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!isCurrent && (
                        <Button variant="outline" className="w-full mt-4" size="sm">
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />
                          Upgrade
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
