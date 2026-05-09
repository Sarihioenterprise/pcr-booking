import { NextRequest, NextResponse } from "next/server";
import { getKeywordOpportunities } from "@/lib/ahrefs";

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

function generateBlogPostContent(keyword: string, title: string): string {
  const painPoints = {
    "private rental car software": "marketplace fees cutting into your profit",
    "car rental management software": "scattered tools and manual workflows",
    "turo alternative": "giving up control and revenue to platforms",
    "rental car booking system": "complex, expensive systems built for large enterprises",
    "fleet management rental cars": "spreadsheets and outdated software",
    "rideshare rental car software": "lack of integration with your booking system",
    "independent car rental software":
      "one-size-fits-all solutions that don't fit your business",
    "rent centric alternative": "expensive, complex platforms built for enterprises",
    "car rental software small business": "systems too expensive for small operators",
    "booking software rental cars": "tools that take a cut of your revenue",
  };

  const painPoint =
    painPoints[keyword as keyof typeof painPoints] ||
    "inefficient manual processes";

  const content = `
    <h1>${title}</h1>

    <p>If you're running an independent car rental business, you know the challenge: finding software that fits your size, budget, and needs. Many solutions are built for enterprise companies or marketplaces, leaving independent operators like you with either expensive overkill or feature-sparse basic tools. The real problem is ${painPoint}.</p>

    <h2>The Problem With Current Solutions</h2>

    <p>Most car rental software falls into two categories:</p>

    <ul>
      <li><strong>Enterprise systems</strong> — Built for Hertz or Avis, costing thousands per month with complex implementation</li>
      <li><strong>Marketplace platforms</strong> — Offering convenience but taking 20-35% of your revenue</li>
    </ul>

    <p>For independent operators managing 1-50 vehicles, neither option makes sense. You need something built specifically for your scale and business model.</p>

    <h2>What to Look for in Car Rental Software</h2>

    <p>Before choosing a solution, ensure it has these core features:</p>

    <ul>
      <li><strong>Direct Booking Control</strong> — You should own the customer relationship, not the platform</li>
      <li><strong>Fleet Management</strong> — Easy vehicle tracking, pricing, and availability management</li>
      <li><strong>Payment Processing</strong> — Built-in payment collection without commission extraction</li>
      <li><strong>Lead Qualification</strong> — Automated screening to reduce risk and save time</li>
      <li><strong>Mobile Management</strong> — Run your business from anywhere, not just a desktop</li>
      <li><strong>Transparent Pricing</strong> — Flat monthly fee, not per-booking charges or revenue percentages</li>
    </ul>

    <h2>Why PCR Booking Is Built for Independent Operators</h2>

    <p>PCR Booking was purpose-built for rental car operators managing their own fleets. It's not trying to be Turo or Enterprise. It's built specifically for you:</p>

    <ul>
      <li><strong>100% Revenue Keep</strong> — No commissions on bookings. You set the price, you keep the money.</li>
      <li><strong>Embeddable Booking Widget</strong> — Add professional bookings to your website in seconds</li>
      <li><strong>Fleet Management Dashboard</strong> — See all vehicles, availability, and revenue at a glance</li>
      <li><strong>AI Lead Qualification</strong> — Automatically screen renters for driver's license, age, and eligibility</li>
      <li><strong>Mobile-First</strong> — Manage everything from your phone, even on the go</li>
      <li><strong>Pricing for Your Size</strong> — Flat monthly pricing starting at the free tier, scaling as you grow</li>
      <li><strong>Payment Integration</strong> — Direct Stripe integration. Payments go straight to your account.</li>
    </ul>

    <h2>Getting Started Is Simple</h2>

    <p>Unlike complex enterprise software, PCR Booking is designed for speed:</p>

    <ol>
      <li>Sign up at pcrbooking.com (free tier available)</li>
      <li>Add your vehicles and set your daily rates</li>
      <li>Copy-paste one line of code to embed the booking widget on your website</li>
      <li>Start receiving direct bookings from your own customers</li>
    </ol>

    <p>Most operators are live with their booking widget the same day.</p>

    <h2>Conclusion</h2>

    <p>The future of car rental is independent operators building their own booking systems. If you're tired of complex, expensive software or platforms that take a cut of every booking, it's time to take control.</p>

    <p><strong>Ready to build your booking system? Start your free trial today. No credit card required.</strong></p>
  `;

  return content;
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

    // Generate content
    const content = generateBlogPostContent(selectedKeyword, title);
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
