"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  Mail,
  Bell,
  Star,
  ArrowLeft,
  Eye,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailAutomation {
  key: "booking_confirmation" | "return_reminder" | "review_request";
  label: string;
  description: string;
  timing: string;
  icon: React.ReactNode;
  iconBg: string;
  previewSubject: string;
  previewBody: string;
}

const AUTOMATIONS: EmailAutomation[] = [
  {
    key: "booking_confirmation",
    label: "Booking Confirmation",
    description:
      "Sent to the renter immediately when a booking is created or confirmed.",
    timing: "Immediately on booking",
    icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
    iconBg: "bg-emerald-50",
    previewSubject: "Your booking is confirmed! — 2022 Toyota Camry",
    previewBody: `<p>Hi Jane,</p>
<p>Great news — your rental booking is <strong>confirmed</strong>!</p>
<p><strong>Vehicle:</strong> 2022 Toyota Camry<br/>
<strong>Pickup:</strong> Monday, January 6, 2025 at 10:00 AM<br/>
<strong>Return:</strong> Friday, January 10, 2025 at 10:00 AM<br/>
<strong>Total Paid:</strong> <span style="color:#2EBD6B;font-weight:700;">$400.00</span></p>
<p>If you have any questions, contact your rental operator directly.</p>`,
  },
  {
    key: "return_reminder",
    label: "Return Reminder",
    description:
      "Sent to the renter 24 hours before their scheduled return date.",
    timing: "24 hours before return",
    icon: <Bell className="h-5 w-5 text-amber-600" />,
    iconBg: "bg-amber-50",
    previewSubject: "Your rental returns tomorrow — 2022 Toyota Camry",
    previewBody: `<p>Hi Jane,</p>
<p>Your rental with <strong>Acme Auto Rentals</strong> is due back <strong>tomorrow</strong>.</p>
<p><strong>Vehicle:</strong> 2022 Toyota Camry<br/>
<strong>Return Date:</strong> Friday, January 10, 2025 at 10:00 AM<br/>
<strong>Return Location:</strong> 123 Main St, Miami FL</p>
<p><strong>What to bring:</strong> All keys, vehicle in original condition.</p>
<p style="color:#92400e;">Need an extension? Contact us ASAP to avoid late fees.</p>`,
  },
  {
    key: "review_request",
    label: "Review Request",
    description:
      "Sent to the renter 24 hours after they return the vehicle to collect feedback.",
    timing: "24 hours after return",
    icon: <Star className="h-5 w-5 text-purple-600" />,
    iconBg: "bg-purple-50",
    previewSubject: "How was your experience with Acme Auto Rentals?",
    previewBody: `<p>Hi Jane,</p>
<p>Thank you for renting the <strong>2022 Toyota Camry</strong> with <strong>Acme Auto Rentals</strong>! We hope you had a great experience.</p>
<div style="text-align:center;margin:24px 0;">
  <p style="font-size:36px;margin:0 0 8px;">⭐⭐⭐⭐⭐</p>
  <h2 style="margin:0 0 8px;font-size:18px;">How was your experience?</h2>
  <p style="margin:0 0 16px;color:#6b7280;">Your feedback helps us improve.</p>
  <a style="display:inline-block;background:#2EBD6B;color:#fff;padding:12px 28px;border-radius:8px;font-weight:600;text-decoration:none;">Leave a Review</a>
</div>
<p>Thank you again — we hope to see you soon!</p>`,
  },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EmailSettingsPage() {
  const supabase = createClient();

  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    booking_confirmation: true,
    return_reminder: true,
    review_request: true,
  });
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<EmailAutomation | null>(null);

  // Load saved prefs from notification_preferences JSONB on operators
  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: op } = await supabase
        .from("operators")
        .select("notification_preferences")
        .eq("user_id", user.id)
        .single();

      if (op?.notification_preferences) {
        const saved = op.notification_preferences as Record<string, boolean>;
        setPrefs((prev) => ({
          ...prev,
          booking_confirmation:
            saved.email_booking_confirmation !== false,
          return_reminder: saved.email_return_reminder !== false,
          review_request: saved.email_review_request !== false,
        }));
      }
      setLoading(false);
    })();
  }, [supabase]);

  async function togglePref(key: string, value: boolean) {
    setSaving(key);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: op } = await supabase
      .from("operators")
      .select("id, notification_preferences")
      .eq("user_id", user.id)
      .single();

    if (!op) { setSaving(null); return; }

    const existing = (op.notification_preferences as Record<string, unknown>) ?? {};
    const updated = {
      ...existing,
      [`email_${key}`]: value,
    };

    await supabase
      .from("operators")
      .update({ notification_preferences: updated })
      .eq("id", op.id);

    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSaving(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6 text-[#2EBD6B]" />
            Email Automations
          </h1>
          <p className="text-muted-foreground">
            Automated emails sent to renters throughout the rental lifecycle.
          </p>
        </div>
      </div>

      {/* Info card */}
      <Card className="border-0 bg-blue-50 shadow-none">
        <CardContent className="flex gap-3 py-4">
          <Mail className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-0.5">How email automations work</p>
            <p>
              When enabled, emails are triggered automatically at the right
              moment in the rental lifecycle. Return reminders and review
              requests are sent by the daily cron job. Booking confirmations
              can be triggered from the booking detail page or via the API.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Automation cards */}
      <div className="space-y-4">
        {AUTOMATIONS.map((automation) => {
          const enabled = prefs[automation.key] ?? true;
          const isSaving = saving === automation.key;

          return (
            <Card
              key={automation.key}
              className="border-0 bg-white shadow-sm ring-0"
            >
              <CardContent className="py-5">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div
                    className={`shrink-0 w-10 h-10 rounded-full ${automation.iconBg} flex items-center justify-center`}
                  >
                    {automation.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">
                        {automation.label}
                      </h3>
                      <Badge
                        variant="outline"
                        className={
                          enabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }
                      >
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {automation.description}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      ⏱ {automation.timing}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreview(automation)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1.5" />
                      Preview
                    </Button>
                    <Button
                      variant={enabled ? "default" : "outline"}
                      size="sm"
                      disabled={isSaving}
                      onClick={() => togglePref(automation.key, !enabled)}
                      style={enabled ? { backgroundColor: "#2EBD6B" } : {}}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : enabled ? (
                        <>
                          <ToggleRight className="h-3.5 w-3.5 mr-1.5" />
                          On
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="h-3.5 w-3.5 mr-1.5" />
                          Off
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cron info */}
      <Card className="border-0 bg-gray-50 shadow-none">
        <CardContent className="py-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            Cron Schedule
          </h3>
          <div className="space-y-1.5 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Return Reminders + Review Requests</span>
              <code className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                Daily @ 10:00 AM UTC
              </code>
            </div>
            <div className="flex justify-between">
              <span>General Pickup &amp; Return Reminders</span>
              <code className="text-xs bg-gray-200 px-2 py-0.5 rounded">
                Daily @ 9:00 AM UTC
              </code>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Modal */}
      <Dialog open={!!preview} onOpenChange={() => setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Email Preview — {preview?.label}
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Subject line */}
              <div className="bg-gray-50 rounded-lg px-4 py-3 border">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
                  Subject
                </p>
                <p className="text-sm text-gray-900 font-medium">
                  {preview.previewSubject}
                </p>
              </div>

              <Separator />

              {/* Email preview */}
              <div className="bg-[#f4f4f5] rounded-xl p-4">
                <div className="bg-white rounded-xl overflow-hidden shadow-sm max-w-[540px] mx-auto">
                  {/* PCR Header */}
                  <div className="bg-[#2EBD6B] px-8 py-6">
                    <p className="text-white font-bold text-lg m-0">
                      PCR Booking
                    </p>
                    <p className="text-white/80 text-xs mt-1 m-0">
                      Private Car Rental Management
                    </p>
                  </div>

                  {/* Body */}
                  <div className="px-8 py-7">
                    <h2 className="font-semibold text-gray-900 text-base mb-4">
                      {preview.previewSubject}
                    </h2>
                    <div
                      className="text-sm text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: preview.previewBody }}
                    />
                  </div>

                  {/* Footer */}
                  <div className="bg-gray-50 px-8 py-5 border-t border-gray-100">
                    <p className="text-xs text-gray-400 m-0">
                      This email was sent by{" "}
                      <span className="text-[#2EBD6B]">PCR Booking</span>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
