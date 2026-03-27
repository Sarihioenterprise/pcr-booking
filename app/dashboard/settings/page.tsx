"use client";

import { useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, ExternalLink, CreditCard, Code, Globe } from "lucide-react";

export default function SettingsPage() {
  const supabase = createClient();

  const [businessName, setBusinessName] = useState("Atlanta Premium Rentals");
  const [ownerName, setOwnerName] = useState("Marcus Johnson");
  const [phone, setPhone] = useState("(404) 555-0100");
  const [city, setCity] = useState("Atlanta");
  const [state, setState] = useState("GA");
  const [smsNumber, setSmsNumber] = useState("(404) 555-0100");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const operatorId = "op_abc123xyz";
  const embedCode = `<script src="https://widget.pcrbooking.com/v1/embed.js" data-operator-id="${operatorId}"></script>`;
  const webhookUrl = `https://api.pcrbooking.com/v1/webhooks/${operatorId}`;

  function handleCopyEmbed() {
    navigator.clipboard.writeText(embedCode);
    setCopiedEmbed(true);
    setTimeout(() => setCopiedEmbed(false), 2000);
  }

  function handleCopyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  }

  async function handleSave() {
    setSaving(true);
    // Placeholder — wire up supabase update here
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl" style={{ background: "#F8F9FC", minHeight: "100%" }}>
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and business preferences
        </p>
      </div>

      {/* Business Info */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Update your business details visible to customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Owner Name</Label>
              <Input
                id="ownerName"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
          <CardDescription>
            Get notified when a hot lead is ready for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="smsNumber">SMS Number for Hot Lead Alerts</Label>
            <Input
              id="smsNumber"
              value={smsNumber}
              onChange={(e) => setSmsNumber(e.target.value)}
              placeholder="(555) 000-0000"
            />
            <p className="text-xs text-muted-foreground">
              You will receive an SMS whenever a lead is qualified as a hot lead.
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Plan */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Subscription Plan
          </CardTitle>
          <CardDescription>
            Manage your current subscription.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Growth Plan</span>
                <Badge
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-200"
                >
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                $79/mo &middot; Unlimited leads, AI bot calling, priority support
              </p>
            </div>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Widget Embed Code */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Widget Embed Code
          </CardTitle>
          <CardDescription>
            Add this script tag to your website to display the PCR Booking widget.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Textarea
              readOnly
              value={embedCode}
              className="font-mono text-xs bg-slate-50 min-h-[60px] pr-20"
            />
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleCopyEmbed}
            >
              {copiedEmbed ? (
                <Check className="h-3.5 w-3.5 mr-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 mr-1" />
              )}
              {copiedEmbed ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Replace <code className="bg-slate-100 px-1 rounded text-xs">data-operator-id</code> with
            your actual operator ID if different.
          </p>
        </CardContent>
      </Card>

      {/* API / Webhook */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            API
          </CardTitle>
          <CardDescription>
            Use this webhook URL to receive lead events in your own systems.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs bg-slate-50"
              />
              <Button variant="outline" size="sm" onClick={handleCopyWebhook}>
                {copiedWebhook ? (
                  <Check className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Copy className="h-3.5 w-3.5 mr-1" />
                )}
                {copiedWebhook ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              POST requests will be sent to this URL when lead events occur.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
