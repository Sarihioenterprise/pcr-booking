import { NextRequest, NextResponse } from "next/server";
import { getKeywordOpportunities } from "@/lib/ahrefs";
import OpenAI from "openai";

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = "Sarihioenterprise/pcr-booking";
const GITHUB_BRANCH = "main";
const BLOG_POSTS_PATH = "lib/blog-posts.ts";

const seedKeywords = [
  "private rental car software",
  "car rental management software",
  "turo alternative",
  "rental car booking system",
  "fleet management rental cars",
  "rideshare rental car software",
  "independent car rental software",
  "rent centric alternative",
  "car rental software small business",
  "booking software rental cars",
  "how to manage rental car fleet",
  "car rental payment software",
  "rental car agreement template",
  "car rental inspection checklist",
  "rental car late fee policy",
  "private car rental vs turo",
  "uber lyft rental car program",
  "rideshare car rental weekly",
  "car rental business profit margin",
  "how to price rental cars",
  "car rental deposit policy",
  "rental car insurance requirements",
  "fleet maintenance tracking software",
  "car rental customer management",
  "how to get more rental car bookings",
  "car rental booking website",
  "rental car business plan",
  "car rental terms and conditions",
  "how to scale a car rental business",
  "car rental software free trial",
  // High Priority Keywords (Ahrefs-validated)
  "uber car rental",
  "uber car rental program",
  "uber car rental requirements",
  "lyft car rental",
  "lyft car rental requirements",
  "lyft driver car rental",
  "rental car insurance",
  "rental car insurance coverage",
  "commercial rental car insurance",
  "renters insurance for car rentals",
  "car rental agreement template",
  "vehicle rental agreement template",
  "rental agreement template free",
  "vehicle inspection checklist",
  "car inspection checklist",
  "rental car inspection checklist",
  "vehicle inspection form",
  "pre-rental inspection checklist",
  "car rental for uber drivers",
  "car rental for lyft drivers",
  "car rental for doordash drivers",
  "car rental for gig drivers",
  "rideshare rental requirements",
  "rideshare insurance rental",
  "no credit check car rental",
  "car rental no credit check",
  "no credit check vehicle rental",
  "no credit check rentals",
  "car rental monthly",
  "monthly car rental",
  "monthly car rental cost",
  "monthly vehicle rental",
  "weekly car rental",
  "weekly vehicle rental",
  "weekly car rental cost",
  "car rental no deposit",
  "vehicle rental no deposit",
  "car rental deposit requirements",
  "security deposit car rental",
  "rideshare car rental insurance",
  "uber lyft rental insurance",
  "car rental business",
  "car rental business plan",
  "car rental business ideas",
  "car rental business software",
  "how to start car rental business",
  "starting a car rental business",
  "how to start rental car company",
  "car rental business profitability",
  "car rental company profit margin",
  "rental car business profit",
  "fleet management software",
  "fleet management system",
  "rental fleet management",
  "car fleet management software",
  "vehicle fleet management system",
  "fleet management for rental cars",
  "rental car management system",
  "car rental management system",
  "rental vehicle management",
  "rental management system",
  "fleet tracking software",
  "vehicle tracking software",
  "gps fleet tracking",
  "fleet tracking system",
  "rental car tracking",
  "vehicle fleet tracking",
  "private car rental",
  "private rental car",
  "private vehicle rental",
  "independent car rental",
  "independent vehicle rental",
  "private car rental platform",
  "turo competitor",
  "turo like apps",
  "alternatives to turo",
  "turo clone",
  "car rental for gig economy",
  "gig economy car rental",
  "gig worker car rental",
  "delivery driver car rental",
  "instacart driver car rental",
  "uber eats driver car rental",
  "amazon flex car rental",
  "car rental software features",
  "best car rental software",
  "cheapest car rental software",
  "free car rental software",
  "car rental software comparison",
  "car rental software pricing",
  "affordable car rental software",
  "rental car dispatch system",
  "car rental dispatch software",
  "fleet dispatch software",
  "vehicle dispatch system",
  "customer relationship management car rental",
  "crm for car rental",
  "rental car crm software",
  "customer management system rental",
  "rental car payment processing",
  "payment software car rental",
  "online payment car rental",
  "stripe car rental",
  "payment gateway car rental",
  "rental car damage liability",
  "damage waiver car rental",
  "rental car damage policy",
  "rental car damage assessment",
  "vehicle damage report",
  "rental car maintenance software",
  "fleet maintenance management",
  "maintenance tracking system",
  "preventive maintenance rental cars",
  "vehicle maintenance software",
  "rental car pricing strategy",
  "rental car pricing software",
  "dynamic pricing car rental",
  "car rental rate management",
  "rental car pricing algorithm",
  "car rental legal forms",
  "rental car compliance",
  "rental agreement legal",
  "car rental business license",
  "rental car business registration",
  "auto rental business license",
  "car rental regulatory requirements",
  "rental car insurance requirements by state",
  "rental car liability insurance",
  "gap insurance car rental",
  "comprehensive car rental insurance",
  "commercial auto insurance car rental",
  "rental car business tax deductions",
  "car rental business taxes",
  "rental car revenue tracking",
  "car rental financial management",
  "rental car profitability analysis",
  // City-based Keywords (20 cities)
  "car rental for uber drivers atlanta",
  "car rental for uber drivers houston",
  "car rental for uber drivers dallas",
  "car rental for uber drivers miami",
  "car rental for uber drivers new york",
  "car rental for uber drivers chicago",
  "car rental for uber drivers los angeles",
  "car rental for uber drivers phoenix",
  "car rental for uber drivers las vegas",
  "car rental for uber drivers detroit",
  "car rental for uber drivers newark",
  "car rental for uber drivers philadelphia",
  "car rental for uber drivers baltimore",
  "car rental for uber drivers washington dc",
  "car rental for uber drivers charlotte",
  "car rental for uber drivers orlando",
  "car rental for uber drivers tampa",
  "car rental for uber drivers jacksonville",
  "car rental for uber drivers memphis",
  "car rental for uber drivers nashville",
  "car rental for lyft drivers atlanta",
  "car rental for lyft drivers houston",
  "car rental for lyft drivers dallas",
  "car rental for lyft drivers miami",
  "car rental for lyft drivers chicago",
  "car rental for lyft drivers new york",
  "uber rental car monthly cost",
  "uber rental car weekly price",
  "uber car rental near me",
  "affordable uber rental car",
  "cheapest uber rental car",
  "uber car rental tips",
  "uber rental car requirements florida",
  "uber rental car requirements california",
  "uber rental car requirements texas",
  // Competitor Comparison Keywords
  "car rental vs turo",
  "turo vs traditional rental",
  "turo vs hq rental",
  "wheelbase vs turo",
  "fleetwire vs traditional rental",
  "rent centric vs turo",
  "independent rental vs turo",
  "traditional car rental vs marketplace",
  "pcr booking vs turo",
  "car rental vs wheelhub",
  "rental platform comparison",
  // Vehicle Type Keywords
  "sedan rental for rideshare",
  "suv rental for rideshare",
  "minivan rental for rideshare",
  "toyota camry rental for uber",
  "honda accord rental for uber",
  "nissan altima rental for lyft",
  "toyota camry rental for lyft",
  "honda civic rental for uber",
  "nissan altima rental for uber",
  "suv rental for uber drivers",
  "sedan rental for uber drivers",
  "electric car rental for rideshare",
  "hybrid car rental for uber",
  "pickup truck rental for rideshare",
  "compact car rental for uber",
  // How to Handle Situations
  "how to handle rental car damage",
  "how to handle late payment rental",
  "how to handle no-show rental",
  "how to handle insurance claim rental",
  "how to handle vehicle breakdown",
  "rental car dispute resolution",
  "rental car damage claim process",
  "rental agreement violation",
  "customer default rental car",
  "rental car accident reporting",
  "rental car claim denial",
  "how to recover from late payment",
  "rental car collection process",
  "rental car lien holder",
  "rental car repossession",
  // Document/Form Keywords
  "car rental inspection form",
  "rental agreement form template",
  "vehicle damage report form",
  "rental car receipt template",
  "waiver form car rental",
  "car rental application form",
  "renter agreement template",
  "car rental checklist form",
  "pre-rental inspection form",
  "post-rental inspection form",
  "damage waiver form",
  "liability waiver rental car",
  "insurance waiver car rental",
  // Rideshare Specific Topics
  "rideshare rental requirements",
  "rideshare rental income",
  "rideshare rental profit margin",
  "rideshare rental weekly cost",
  "rideshare rental insurance coverage",
  "rideshare rental approval process",
  "rideshare rental restrictions",
  "rideshare vehicle eligibility",
  "rideshare insurance requirements",
  "rideshare vehicle inspection",
  "rideshare background check",
  "rideshare vehicle maintenance",
  // Tips/How-To Format Keywords
  "5 tips for car rental business",
  "7 ways to improve car rental business",
  "10 mistakes car rental business",
  "10 car rental business tips",
  "best practices car rental business",
  "5 ways to increase rental bookings",
  "7 secrets successful rental operators",
  "10 features to look for rental software",
  "5 mistakes rental car pricing",
  "7 ways to reduce fleet costs",
  "10 questions to ask rental software",
  "5 signs you need rental software",
  "7 habits successful car rental operators",
  "10 rental car scams to avoid",
  // Business Operations
  "how to acquire customers car rental",
  "how to market car rental business",
  "how to scale rental car business",
  "how to automate car rental operations",
  "how to screen rental car customers",
  "how to verify driver license",
  "how to check customer background",
  "how to set rental car prices",
  "how to calculate rental car cost",
  "how to manage fleet inventory",
  "how to coordinate fleet scheduling",
  "how to track fleet maintenance",
  "how to handle fleet insurance",
  "how to optimize fleet utilization",
  "how to reduce fleet downtime",
  "how to improve customer satisfaction",
  "how to collect rental payments",
  "how to accept credit cards",
  "how to prevent fraud car rental",
  "how to identify high-risk renters",
  "how to blacklist problem customers",
  "how to manage rental cancellations",
  "how to set cancellation policies",
  "how to handle booking conflicts",
  "how to implement late fees",
  "how to collect late fees",
  "how to manage fuel policies",
  "how to charge for fuel",
  "how to implement mileage charges",
  "how to charge overage fees",
  "how to set security deposits",
  "how to return security deposits",
  "how to manage security deposit disputes",
  "how to handle maintenance requests",
  "how to coordinate repairs",
  "how to manage insurance claims",
  // Customer Relations
  "customer communication car rental",
  "customer retention strategies",
  "customer onboarding process",
  "customer verification process",
  "customer background check",
  "customer license verification",
  "customer identity verification",
  "customer feedback management",
  "customer complaints handling",
  "customer dispute resolution",
  "customer satisfaction metrics",
  "net promoter score car rental",
  "customer lifetime value",
  "customer acquisition cost",
  "customer churn rate",
  "customer loyalty program",
  // Software Features
  "best calendar software fleet",
  "best inventory software car rental",
  "best communication software",
  "best scheduling software fleet",
  "best analytics software car rental",
  "best reporting software fleet",
  "best mobile app car rental",
  "best dashboard car rental",
  "best automation tools rental",
  "best integration car rental software",
  "best api car rental platform",
  "best webhook platform",
  "best notification system",
  "best sms notification service",
  "best email notification service",
  "best push notification service",
  "best real-time update system",
  "best geolocation tracking",
  "best document management",
  "best signature capture",
  // Advanced Topics
  "fleet optimization strategies",
  "fleet cost reduction",
  "fleet revenue maximization",
  "fleet asset management",
  "fleet asset tracking",
  "fleet usage analytics",
  "fleet performance metrics",
  "fleet efficiency improvement",
  "fleet sustainability",
  "eco-friendly fleet rental",
  "electric vehicle rental business",
  "electric vehicle fleet management",
  "sustainable rental car business",
  "carbon neutral car rental",
  "rental car lifecycle management",
  "asset depreciation car rental",
  "fleet depreciation management",
  "rental car accounting software",
  "rental car bookkeeping",
  "rental car financial reports",
  "rental car profit loss statement",
  "rental car cash flow management",
  "rental car break-even analysis",
  "rental car roi calculation",
  "rental car business valuation",
  "rental car acquisition strategy",
  "rental car growth strategy",
  "seasonal fleet management",
  "peak season rental planning",
  "off-season fleet strategy",
  "weather impact fleet availability",
  "rental demand forecasting",
  "rental market analysis",
  "competitor analysis car rental",
  "market research rental cars",
  "industry trends car rental",
  "future of car rental",
  // Specific Pain Points
  "rental car fraud prevention",
  "rental car scam prevention",
  "rental car theft prevention",
  "rental car vandalism insurance",
  "rental car accident management",
  "rental car repair coordination",
  "rental car parts ordering",
  "fleet parts supplier",
  "fleet repair schedule",
  "fleet warranty management",
  "fleet recall management",
  "fleet audit trail",
  "fleet compliance tracking",
  "fleet documentation",
  "fleet records management",
  "rental car title transfer",
  "rental car registration",
  "fleet registration process",
  "rental car liability coverage",
  "rental car property damage",
  "rental car comprehensive coverage",
  "rental car collision coverage",
  "uninsured motorist coverage rental",
  "rental car deductible",
  "rental car loss waiver",
  "rental car damage waiver",
  "rental car excess insurance",
  "rental car supplemental insurance",
  "rental car additional insured",
  "rental car certificate of insurance",
  // Additional Variations
  "easy car rental software",
  "simple car rental software",
  "user friendly rental car software",
  "cloud based car rental software",
  "mobile first car rental software",
  "scalable rental car software",
  "customizable car rental software",
  "white label car rental software",
  "rental car software integration",
  "rental car software api",
  "rental car software webhooks",
  "rental car software automation",
  "rental car software reporting",
  "rental car software analytics",
  "rental car software documentation",
  "rental car software support",
  "rental car software training",
  "rental car software onboarding",
  "rental car software security",
  "rental car software compliance",
  "rental car software gdpr",
  "rental car software pci dss",
  "rental car software sso",
  "rental car software multi tenant",
  "rental car software white labeling",
  "rental car software branding",
];

// Fetch existing slugs from GitHub (source of truth, not the compiled bundle)
async function getExistingSlugsFromGitHub(): Promise<string[]> {
  if (!GITHUB_TOKEN) return [];
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${BLOG_POSTS_PATH}`;
  const res = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "pcr-booking-cron",
      Accept: "application/vnd.github+json",
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  const matches = content.match(/slug:\s*"([^"]+)"/g) || [];
  return matches
    .map((m) => m.replace(/slug:\s*"/, "").replace(/"$/, ""))
    .filter((s) => s !== "string"); // exclude interface definition
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function calculateReadTime(wordCount: number): string {
  const wordsPerMinute = 200;
  const minutes = Math.ceil(wordCount / wordsPerMinute);
  return `${minutes} min`;
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]*>/g, "");
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Generate unique blog post content using OpenAI.
 * Falls back to a minimal template if OPENAI_API_KEY is not set or the call fails.
 */
async function generateBlogPostContent(
  keyword: string,
  title: string
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (openaiKey) {
    try {
      const client = new OpenAI({ apiKey: openaiKey });

      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 1800,
        messages: [
          {
            role: "system",
            content:
              "You are an SEO content writer for PCR Booking (pcrbooking.com), " +
              "a SaaS platform for independent car rental operators. " +
              "Write practical, helpful blog posts that rank for car rental / fleet management keywords. " +
              "Tone: professional but approachable. Always include a CTA to try PCR Booking. " +
              "Output ONLY the HTML body content (no <html>/<head>/<body> tags). " +
              "Use <h2>, <p>, <ul>/<li>, <ol>/<li> elements. Keep it ~800-1000 words.",
          },
          {
            role: "user",
            content:
              `Write a blog post titled "${title}" targeting the keyword "${keyword}". ` +
              "Cover: what the problem is for independent car rental operators, what to look for in a solution, " +
              "how PCR Booking solves it, and a clear call-to-action to sign up at pcrbooking.com.",
          },
        ],
      });

      const generated = completion.choices[0]?.message?.content ?? "";
      if (generated.length > 200) {
        return generated;
      }
      console.warn("[blog-cron] OpenAI returned short content, using fallback");
    } catch (openaiErr) {
      console.error("[blog-cron] OpenAI error, using fallback:", openaiErr);
    }
  } else {
    console.warn("[blog-cron] OPENAI_API_KEY not set — using static fallback");
  }

  // Static fallback (still better than nothing)
  return `
    <p>If you're running an independent car rental business, finding the right tools is critical.
    The challenge: most software is built for enterprise companies or marketplace platforms that take a cut of your revenue.</p>

    <h2>The Problem With Current Solutions</h2>
    <ul>
      <li><strong>Enterprise systems</strong> — Costly, complex, built for Hertz not you</li>
      <li><strong>Marketplace platforms</strong> — Take 20–35% of your revenue per booking</li>
    </ul>

    <h2>What Independent Operators Actually Need</h2>
    <ul>
      <li>Direct booking control — own the customer relationship</li>
      <li>Simple fleet management — add, price, and track vehicles easily</li>
      <li>Built-in payment processing — no commissions extracted</li>
      <li>AI lead qualification — screen renters automatically</li>
      <li>Mobile-first dashboard — manage from anywhere</li>
    </ul>

    <h2>How PCR Booking Solves ${keyword}</h2>
    <p>PCR Booking is purpose-built for operators like you — managing 1–50 vehicles, renting direct to rideshare drivers and private renters.
    Flat monthly pricing, no per-booking fees, payments go straight to your Stripe account.</p>

    <h2>Get Started Today</h2>
    <p>Most operators are live with their booking widget the same day.
    <strong><a href="https://pcrbooking.com">Start your free trial at pcrbooking.com</a> — no credit card required.</strong></p>
  `;
}

async function commitBlogPostsToGitHub(
  newPostStr: string,
  title: string
): Promise<void> {
  if (!GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${BLOG_POSTS_PATH}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    "User-Agent": "pcr-booking-cron",
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
  };

  // GET current file content + SHA
  const getRes = await fetch(`${apiUrl}?ref=${GITHUB_BRANCH}`, { headers });
  if (!getRes.ok) {
    throw new Error(`GitHub GET failed: ${getRes.status} ${await getRes.text()}`);
  }
  const getJson = await getRes.json();
  const fileSha: string = getJson.sha;

  // Decode base64 content
  const currentContent = Buffer.from(getJson.content, "base64").toString("utf-8");

  // Find insertion point (after opening bracket of the array)
  const arrayStartMatch = currentContent.match(
    /export const blogPosts: BlogPost\[\] = \[\n/
  );
  if (!arrayStartMatch) {
    throw new Error("Could not find blog posts array in file");
  }
  const insertPosition =
    currentContent.indexOf(arrayStartMatch[0]) + arrayStartMatch[0].length;

  // Insert new post at the top of the array
  const updatedContent =
    currentContent.slice(0, insertPosition) +
    newPostStr +
    currentContent.slice(insertPosition);

  // Re-encode to base64
  const encodedContent = Buffer.from(updatedContent, "utf-8").toString("base64");

  // PUT updated file
  const putRes = await fetch(apiUrl, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      message: `blog: add post - ${title}`,
      content: encodedContent,
      sha: fileSha,
      branch: GITHUB_BRANCH,
    }),
  });

  if (!putRes.ok) {
    throw new Error(`GitHub PUT failed: ${putRes.status} ${await putRes.text()}`);
  }
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get keyword opportunities (with fallback if Ahrefs fails or returns nothing)
    let opportunities: Array<{ keyword: string; volume: number; difficulty: number }> = [];
    try {
      opportunities = await getKeywordOpportunities(seedKeywords);
    } catch (ahrefsError) {
      console.warn("Ahrefs API error, falling back to seed keywords:", ahrefsError);
    }

    if (opportunities.length === 0) {
      console.warn("No Ahrefs results — falling back to seed keywords directly");
      opportunities = seedKeywords.map((kw) => ({
        keyword: kw,
        volume: 0,
        difficulty: 0,
        clicks: 0,
      }));
    }

    // Fetch existing slugs from GitHub (live source of truth)
    const existingSlugs = await getExistingSlugsFromGitHub();

    // Find first keyword that doesn't have a blog post
    let selectedKeyword = null;
    let selectedOpportunity = null;

    for (const opp of opportunities) {
      const proposedSlug = generateSlug(
        `Best ${opp.keyword
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")} in 2025`
      );

      if (!existingSlugs.includes(proposedSlug)) {
        selectedKeyword = opp.keyword;
        selectedOpportunity = opp;
        break;
      }
    }

    if (!selectedKeyword || !selectedOpportunity) {
      return NextResponse.json({
        success: false,
        error: "All keywords already have blog posts",
      });
    }

    // Generate title
    const title = `Best ${selectedKeyword
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")} in 2025`;

    const slug = generateSlug(title);

    // Generate content using OpenAI (async)
    const content = await generateBlogPostContent(selectedKeyword, title);
    const wordCount = countWords(content);
    const readTime = calculateReadTime(wordCount);

    // Create new blog post
    const newPost = {
      slug,
      title,
      excerpt: `Learn how to choose the best ${selectedKeyword} for your independent rental business. Complete guide with feature comparison and pricing analysis.`,
      content,
      publishedAt: new Date().toISOString().split("T")[0],
      readTime,
      category: "Software",
      keywords: [
        selectedKeyword,
        "car rental software",
        "rental management system",
      ],
    };

    // Format the new post as TypeScript object
    const newPostStr = `  {
    slug: "${newPost.slug}",
    title: "${newPost.title.replace(/"/g, '\\"')}",
    excerpt: "${newPost.excerpt.replace(/"/g, '\\"')}",
    category: "${newPost.category}",
    publishedAt: "${newPost.publishedAt}",
    readTime: "${newPost.readTime}",
    keywords: [${newPost.keywords.map((k) => `"${k}"`).join(", ")}],
    content: \`${newPost.content}\`,
  },\n`;

    // Commit updated blog-posts.ts to GitHub
    await commitBlogPostsToGitHub(newPostStr, newPost.title);

    // Trigger Vercel production deploy (GitHub not connected, so we do it via API)
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelTeamId = process.env.VERCEL_TEAM_ID;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (vercelToken && vercelProjectId) {
      try {
        await fetch(
          `https://api.vercel.com/v13/deployments${vercelTeamId ? `?teamId=${vercelTeamId}` : ""}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${vercelToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name: "pcr-booking",
              target: "production",
              gitSource: null,
            }),
          }
        );
      } catch (deployErr) {
        console.warn("Vercel deploy trigger failed (non-fatal):", deployErr);
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        title: newPost.title,
        slug: newPost.slug,
        keyword: selectedKeyword,
        wordCount,
      },
    });
  } catch (error) {
    console.error("Blog generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate blog post", details: String(error) },
      { status: 500 }
    );
  }
}
