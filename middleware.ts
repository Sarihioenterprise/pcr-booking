import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Hosts that are "native" pcrbooking.com hosts — do NOT apply custom-domain routing
const NATIVE_HOSTS = new Set([
  "pcrbooking.com",
  "www.pcrbooking.com",
]);

function isNativeHost(host: string): boolean {
  if (NATIVE_HOSTS.has(host)) return true;
  // Vercel preview/internal domains
  if (host.endsWith(".vercel.app")) return true;
  // localhost variants (dev)
  if (host === "localhost" || host.startsWith("localhost:")) return true;
  if (host === "127.0.0.1" || host.startsWith("127.0.0.1:")) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { nextUrl, headers } = request;

  // Strip port for host comparison
  const host = (headers.get("host") ?? "").split(":")[0];

  // ── Custom domain routing ──────────────────────────────────────────────────
  // If the incoming host is NOT a native pcrbooking.com host, treat it as a
  // custom domain and rewrite to the operator's /book/[slug] page.
  // We look up the operator by custom_domain in Supabase (admin/service role).
  if (!isNativeHost(host)) {
    // Only handle public-facing paths; let API routes, _next, etc. through normally
    const pathname = nextUrl.pathname;

    // Pass through Next.js internals and API routes unchanged
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/") ||
      pathname === "/favicon.ico" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml"
    ) {
      return NextResponse.next();
    }

    // Look up operator by custom_domain using Supabase REST API (service role)
    // We use fetch directly here because we can't import server-side Supabase
    // clients into middleware (Edge Runtime constraint).
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        const lookupRes = await fetch(
          `${supabaseUrl}/rest/v1/operators?custom_domain=eq.${encodeURIComponent(host)}&select=id,booking_slug&limit=1`,
          {
            headers: {
              apikey: serviceKey,
              Authorization: `Bearer ${serviceKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (lookupRes.ok) {
          const operators = await lookupRes.json();
          const operator = operators?.[0];

          if (operator?.booking_slug) {
            // Rewrite to /book/[slug] + preserve the path (for sub-paths like /book/[slug]/confirm)
            // If visitor is at root (/), rewrite to /book/[slug]
            // If visitor is at /somepath, rewrite to /book/[slug]/somepath
            let rewritePath: string;
            if (pathname === "/" || pathname === "") {
              rewritePath = `/book/${operator.booking_slug}`;
            } else {
              // Sub-paths: e.g. /confirm → /book/[slug]/confirm
              rewritePath = `/book/${operator.booking_slug}${pathname}`;
            }

            const url = request.nextUrl.clone();
            url.pathname = rewritePath;
            return NextResponse.rewrite(url);
          }
        }
      } catch (err) {
        console.error("[middleware] custom domain lookup error:", err);
        // Fall through to normal 404 handling
      }
    }

    // Unknown custom domain → let Next.js render a 404
    return NextResponse.next();
  }

  // ── Standard auth session handling (pcrbooking.com routes) ──────────────
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (svg, png, jpg, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
