"use client";

import { useState } from "react";
import { Globe, CheckCircle, ArrowRight, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Paste a YouTube/Vimeo/Loom embed URL here when the video is ready
const VIDEO_EMBED_URL = "";

const FEATURES = [
  "Home page with your branding and colors",
  "About, Contact, and Fleet pages",
  "All your vehicles added for you",
  "Professional design matching your logo",
  "Mobile-optimized and fast",
  "Live within 24–72 hours",
];

export default function WebsitePage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/website-checkout", { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Globe className="h-7 w-7 text-[#2EBD6B]" />
        <h1 className="text-2xl font-bold text-gray-900">Get a Custom Website</h1>
      </div>

      {/* Video section */}
      <div className="mb-5 rounded-xl overflow-hidden bg-[#0c0c1c] border border-white/10 aspect-video flex items-center justify-center">
        {VIDEO_EMBED_URL ? (
          <iframe
            src={VIDEO_EMBED_URL}
            className="w-full h-full"
            allow="autoplay; fullscreen"
            allowFullScreen
          />
        ) : (
          <div className="flex flex-col items-center gap-3 text-white/30">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20">
              <Play className="h-6 w-6 ml-1" />
            </div>
            <p className="text-sm">Video coming soon</p>
          </div>
        )}
      </div>

      {/* Pricing card */}
      <Card className="bg-[#0c0c1c] border border-white/10 mb-5">
        <CardContent className="p-6">
          <p className="text-white/60 text-sm uppercase tracking-widest font-medium mb-1">
            One-Time Payment
          </p>
          <div className="flex items-baseline gap-2 mb-5">
            <span className="text-white text-4xl font-bold">$997</span>
          </div>

          <ul className="space-y-3 mb-6">
            {FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-white/80 text-sm">
                <CheckCircle className="h-4 w-4 text-[#2EBD6B] shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <p className="text-red-400 text-sm mb-4">{error}</p>
          )}

          <Button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full bg-[#2EBD6B] hover:bg-[#27a85e] text-white font-semibold py-3 text-base flex items-center justify-center gap-2"
          >
            {loading ? "Redirecting to checkout..." : (
              <>
                Get My Website — $997
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          <p className="text-center text-white/30 text-xs mt-3">
            Secure checkout powered by Stripe
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
