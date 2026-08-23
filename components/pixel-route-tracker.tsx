"use client";

/**
 * PixelRouteTracker — fires Meta Pixel PageView on every client-side route change.
 *
 * Problem: Next.js App Router does NOT re-fire the base pixel's fbq('track', 'PageView')
 * on client-side navigation. The initial PageView fires on hard load (in app/layout.tsx),
 * but navigating between pages (e.g., / → /pricing → /blog/...) does NOT fire additional
 * PageViews. This is a silent but impactful gap in attribution.
 *
 * Solution: Use the Next.js usePathname hook to detect route changes and fire PageView
 * on every navigation. The initial PageView from layout.tsx fires on mount; subsequent
 * navigations fire via the useEffect dependency on pathname.
 *
 * This component renders null (no DOM output) and is placed in the root layout.
 */

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export default function PixelRouteTracker() {
  const pathname = usePathname();
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip the first render: the initial PageView is already fired by the inline
    // script in app/layout.tsx <head>. Firing it again here would double-count
    // the first page load.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Subsequent route changes: fire PageView for the new page
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [pathname]);

  return null;
}
