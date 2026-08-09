/**
 * Vercel API helpers for custom domain management.
 * Project: pcr-booking (prj_NAwRSSOFdiUjkgzC8AlFWVZ1Latr)
 */

const VERCEL_API = "https://api.vercel.com";
const PROJECT_ID = "prj_NAwRSSOFdiUjkgzC8AlFWVZ1Latr";
const TEAM_ID = "team_9OS62ADmoMngYczRcGD6166d";

function getToken(): string {
  const token = process.env.VERCEL_TOKEN;
  if (!token) throw new Error("VERCEL_TOKEN not configured");
  return token;
}

function vercelHeaders() {
  return {
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  };
}

/**
 * Add a domain to the Vercel project.
 * Returns the Vercel API response.
 */
export async function addVercelDomain(domain: string): Promise<{
  ok: boolean;
  name?: string;
  error?: string;
  alreadyExists?: boolean;
}> {
  const res = await fetch(
    `${VERCEL_API}/v10/projects/${PROJECT_ID}/domains?teamId=${TEAM_ID}`,
    {
      method: "POST",
      headers: vercelHeaders(),
      body: JSON.stringify({ name: domain }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    // Domain already added to project = not an error
    if (data?.error?.code === "domain_already_in_use" || data?.error?.code === "domain_already_exists") {
      return { ok: true, name: domain, alreadyExists: true };
    }
    return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
  }

  return { ok: true, name: data.name ?? domain };
}

/**
 * Remove a domain from the Vercel project.
 */
export async function removeVercelDomain(domain: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  const res = await fetch(
    `${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/${domain}?teamId=${TEAM_ID}`,
    {
      method: "DELETE",
      headers: vercelHeaders(),
    }
  );

  if (!res.ok && res.status !== 404) {
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
  }

  return { ok: true };
}

/**
 * Check domain verification status from Vercel.
 * Returns verification state and DNS instructions.
 */
export async function checkVercelDomainStatus(domain: string): Promise<{
  ok: boolean;
  verified: boolean;
  status: "active" | "pending" | "error";
  error?: string;
  dnsInstructions?: DnsInstruction[];
}> {
  const res = await fetch(
    `${VERCEL_API}/v6/domains/${domain}/config?teamId=${TEAM_ID}`,
    {
      headers: vercelHeaders(),
    }
  );

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return {
      ok: false,
      verified: false,
      status: "error",
      error: data?.error?.message ?? `HTTP ${res.status}`,
    };
  }

  const data = await res.json();

  // Also check project domain to see if it's verified
  const projRes = await fetch(
    `${VERCEL_API}/v9/projects/${PROJECT_ID}/domains/${domain}?teamId=${TEAM_ID}`,
    {
      headers: vercelHeaders(),
    }
  );

  let verified = false;
  if (projRes.ok) {
    const projData = await projRes.json();
    verified = projData?.verified === true;
  }

  const isApex = !domain.includes(".") || domain.split(".").length === 2;
  const dnsInstructions: DnsInstruction[] = isApex
    ? [{ type: "A", name: "@", value: "76.76.21.21" }]
    : [{ type: "CNAME", name: domain.split(".")[0], value: "cname.vercel-dns.com" }];

  return {
    ok: true,
    verified,
    status: verified ? "active" : "pending",
    dnsInstructions,
  };
}

export interface DnsInstruction {
  type: "A" | "CNAME";
  name: string;
  value: string;
}
