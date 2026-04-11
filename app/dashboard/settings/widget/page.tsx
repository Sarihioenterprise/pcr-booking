"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";

export default function WidgetPage() {
  const [operatorId, setOperatorId] = useState("");
  const [bookingSlug, setBookingSlug] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function load() {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("operators")
        .select("id, booking_slug")
        .eq("user_id", user.id)
        .single();
      if (data) {
        setOperatorId(data.id);
        setBookingSlug(data.booking_slug || "");
      }
    }
    load();
  }, []);

  const embedCode = `<script src="${process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com"}/widget.js" data-operator="${operatorId}"></script>`;
  const bookingLink = `${process.env.NEXT_PUBLIC_APP_URL || "https://pcrbooking.com"}/rent/${bookingSlug}`;

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/settings">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Booking Widget</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Direct Booking Link</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Share this link with renters on WhatsApp, Facebook, or by text. No website needed.
          </p>
          {bookingSlug ? (
            <div className="relative">
              <div className="bg-secondary p-4 rounded-md font-mono text-sm overflow-x-auto pr-12 break-all">
                {bookingLink}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => handleCopy(bookingLink)}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Booking slug not yet configured. Please complete your profile setup.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Embed Code</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Copy and paste this code into your website&apos;s HTML, just before
            the closing &lt;/body&gt; tag.
          </p>
          <div className="relative">
            <div className="bg-secondary p-4 rounded-md font-mono text-sm overflow-x-auto pr-12">
              {embedCode}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => handleCopy(embedCode)}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How it works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>1. Paste the embed code on your website</p>
          <p>2. Visitors see your available vehicles and can request a booking</p>
          <p>3. New leads appear in your Leads dashboard</p>
          <p>4. Our AI bot calls and qualifies leads automatically</p>
          <p>5. Hot leads get flagged — you get an SMS notification</p>
        </CardContent>
      </Card>
    </div>
  );
}
