"use client";

import { useState, useEffect } from "react";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Renders a timestamp in the browser's local timezone.
 * Defers rendering to after mount so SSR (UTC) and client (local) always agree.
 */
export function ClientDateTime({ iso }: { iso: string }) {
  const [display, setDisplay] = useState<string | null>(null);
  useEffect(() => {
    setDisplay(fmt(iso));
  }, [iso]);
  // Render nothing until mounted — avoids SSR/hydration timezone mismatch
  if (!display) return null;
  return <>{display}</>;
}
