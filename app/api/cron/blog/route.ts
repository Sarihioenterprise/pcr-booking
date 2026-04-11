import { NextRequest, NextResponse } from "next/server";
import { getKeywordOpportunities } from "@/lib/ahrefs";
import { blogPosts } from "@/lib/blog-posts";
import { writeFileSync, readFileSync } from "fs";
import { join } from "path";

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
];

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

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get keyword opportunities
    const opportunities = await getKeywordOpportunities(seedKeywords);

    if (opportunities.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No keyword opportunities found",
      });
    }

    // Find existing blog post slugs
    const existingSlugs = blogPosts.map((post) => post.slug);

    // Find first keyword that doesn't have a blog post
    let selectedKeyword = null;
    let selectedOpportunity = null;

    for (const opp of opportunities) {
      const proposedSlug = generateSlug(
        opp.keyword
          .split(" ")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ")
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

    // Read current blog posts file
    const blogPostsPath = join(
      process.cwd(),
      "lib",
      "blog-posts.ts"
    );

    let fileContent = readFileSync(blogPostsPath, "utf-8");

    // Find the position to insert the new post (after the opening bracket of the array)
    const arrayStartMatch = fileContent.match(/export const blogPosts: BlogPost\[\] = \[\n/);
    if (!arrayStartMatch) {
      throw new Error("Could not find blog posts array");
    }

    const insertPosition =
      fileContent.indexOf(arrayStartMatch[0]) + arrayStartMatch[0].length;

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

    // Insert the new post
    fileContent =
      fileContent.slice(0, insertPosition) +
      newPostStr +
      fileContent.slice(insertPosition);

    // Write back to file
    writeFileSync(blogPostsPath, fileContent, "utf-8");

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
