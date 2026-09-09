import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getKeywordOpportunities } from "@/lib/ahrefs";
import { saveDbBlogPost } from "@/lib/supabase-blog";

const SEED_KEYWORDS = [
  "private car rental software",
  "car rental management software",
  "fleet rental management",
  "Turo alternative for hosts",
  "peer to peer car rental platform",
  "car rental booking system",
  "how to start a private car rental business",
  "car rental software for small business",
  "rideshare rental car software",
  "independent car rental software",
  "rental car fleet management",
  "car rental business platform",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .substring(0, 80);
}

async function pickKeyword(requestedKeyword?: string): Promise<string> {
  if (requestedKeyword) return requestedKeyword;

  try {
    const opportunities = await getKeywordOpportunities(SEED_KEYWORDS);
    if (opportunities.length > 0) {
      // Pick the keyword with best volume/difficulty ratio
      const best = opportunities.sort(
        (a, b) => b.volume / (b.difficulty + 1) - a.volume / (a.difficulty + 1)
      )[0];
      return best.keyword;
    }
  } catch (err) {
    console.error("blog/generate: Ahrefs lookup failed, using seed list", err);
  }

  // Rotate through seed keywords by day of week
  const dayIndex = new Date().getDay();
  return SEED_KEYWORDS[dayIndex % SEED_KEYWORDS.length];
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let requestedKeyword: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    requestedKeyword = body?.keyword;
  } catch {}

  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  const keyword = await pickKeyword(requestedKeyword);
  const slug = slugify(keyword);

  const openai = new OpenAI({ apiKey: openaiKey });

  const systemPrompt = `You are an expert SEO content writer for PCR Booking — a private car rental management platform that helps independent operators run their own booking system and keep 100% of their revenue (instead of losing 25–30% to Turo or similar marketplaces).

Write SEO-optimized blog posts in HTML format (use <h2>, <h3>, <p>, <ul>, <li>, <strong>, <a> tags only). Target 650–900 words. Naturally include the target keyword 3–5 times. End every post with a CTA paragraph linking to PCR Booking signup.

Return ONLY the HTML content — no markdown code fences, no preamble, no explanations.`;

  const userPrompt = `Write a 700-word SEO blog post targeting the keyword: "${keyword}"

Requirements:
- Title: compelling H2 opening that includes the keyword
- 3–4 main sections with H2/H3 headers
- Include pain points for independent rental operators (Turo fees, no customer data, limited control)
- Explain how software/a platform like PCR Booking solves these
- End with a CTA: "Ready to run your own rental business? Start your free trial at PCR Booking."
- Natural, helpful tone — not salesy
- Return raw HTML only (no code fences)`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  const rawContent = completion.choices[0]?.message?.content ?? "";
  // Strip any accidental markdown code fences
  const content = rawContent.replace(/^```html?\n?/i, "").replace(/\n?```$/i, "").trim();

  if (!content) {
    return NextResponse.json({ error: "OpenAI returned empty content" }, { status: 500 });
  }

  // Extract title from first <h2> tag for meta title
  const titleMatch = content.match(/<h2[^>]*>(.*?)<\/h2>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
    : `${keyword.charAt(0).toUpperCase() + keyword.slice(1)} | PCR Booking Guide`;

  // Generate meta description from first <p> tag
  const pMatch = content.match(/<p[^>]*>(.*?)<\/p>/i);
  const meta = pMatch
    ? pMatch[1].replace(/<[^>]+>/g, "").trim().substring(0, 160)
    : `Learn about ${keyword} and how PCR Booking helps independent operators run a successful private car rental business.`;

  const post = await saveDbBlogPost({
    title,
    slug,
    content,
    meta_description: meta,
    status: "published",
  });

  return NextResponse.json({
    ok: true,
    keyword,
    slug,
    title,
    url: `https://pcrbooking.com/blog/${slug}`,
    post_id: post.id,
  });
}

// Also support GET for Vercel cron compatibility
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fakeReq = new NextRequest(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({}),
  });

  return POST(fakeReq);
}
