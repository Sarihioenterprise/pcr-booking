import { NextRequest, NextResponse } from "next/server";
import { writeFileSync, mkdirSync } from "fs";
import { dirname } from "path";

const searchQueries = [
  "RentCentric problems complaints 2025",
  "RentCentric alternative reddit",
  "car rental software complaints reddit",
  "Fleetio car rental problems",
  "car rental management software feature request",
  "private rental car software missing features",
];

interface SearchResult {
  title: string;
  description: string;
  url: string;
}

async function searchBrave(query: string): Promise<SearchResult[]> {
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    throw new Error("BRAVE_SEARCH_API_KEY not configured");
  }

  const response = await fetch(
    `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`,
    {
      headers: {
        "X-Subscription-Token": apiKey,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Brave Search failed: ${response.statusText}`);
  }

  const data = await response.json() as { web?: Array<{ title: string; description: string; url: string }> };

  if (!data.web) {
    return [];
  }

  return data.web.map((result) => ({
    title: result.title,
    description: result.description,
    url: result.url,
  }));
}

function generateReport(
  allResults: Record<string, SearchResult[]>
): string {
  const dateGenerated = new Date().toISOString().split("T")[0];

  let report = `# Competitor Intelligence Report\n\n`;
  report += `**Generated:** ${dateGenerated}\n\n`;
  report += `## Executive Summary\n\n`;
  report += `This report analyzes competitor complaints, feature requests, and market opportunities identified through web research.\n\n`;

  let complaintsCount = 0;
  let opportunitiesCount = 0;

  report += `## Competitor Complaints & Issues\n\n`;

  for (const [query, results] of Object.entries(allResults)) {
    if (results.length === 0) continue;

    report += `### ${query}\n\n`;
    for (const result of results) {
      if (result.description) {
        report += `- **${result.title}**\n`;
        report += `  ${result.description}\n`;
        report += `  [Source](${result.url})\n\n`;
        complaintsCount++;
      }
    }
  }

  // Identify opportunities
  report += `## Opportunities for PCR Booking\n\n`;

  const opportunityPatterns = [
    {
      keyword: "complaints",
      opportunity:
        "Competitors have reliability/support issues → position PCR as simpler, more reliable",
    },
    {
      keyword: "feature request",
      opportunity:
        "Missing features in competitors → highlight PCR's comprehensive feature set",
    },
    {
      keyword: "expensive",
      opportunity:
        "Pricing concerns → emphasize PCR's affordable pricing model",
    },
    {
      keyword: "integration",
      opportunity:
        "Integration gaps → showcase PCR's API and integrations",
    },
  ];

  const identifiedOpportunities = new Set<string>();

  for (const [_query, results] of Object.entries(allResults)) {
    for (const result of results) {
      const combinedText = `${result.title} ${result.description}`.toLowerCase();
      for (const pattern of opportunityPatterns) {
        if (combinedText.includes(pattern.keyword)) {
          identifiedOpportunities.add(pattern.opportunity);
        }
      }
    }
  }

  for (const opportunity of identifiedOpportunities) {
    report += `- ${opportunity}\n`;
    opportunitiesCount++;
  }

  report += `\n## Summary\n\n`;
  report += `- **Complaints Found:** ${complaintsCount}\n`;
  report += `- **Opportunities Identified:** ${opportunitiesCount}\n`;
  report += `- **Report Generated:** ${new Date().toISOString()}\n`;

  return report;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allResults: Record<string, SearchResult[]> = {};

    // Search for each query
    for (const query of searchQueries) {
      const results = await searchBrave(query);
      allResults[query] = results;
    }

    // Generate report
    const report = generateReport(allResults);

    // Save report to file
    const reportPath = "/Users/igrisknight/.openclaw/workspace/competitor-intel/latest.md";
    try {
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, report, "utf-8");
    } catch (error) {
      console.error("Failed to write report file:", error);
      // Continue anyway - report was generated, just not saved
    }

    // Count opportunities
    const opportunitiesCount = Object.values(allResults).flat().length;

    return NextResponse.json({
      success: true,
      opportunitiesFound: opportunitiesCount,
    });
  } catch (error) {
    console.error("Competitor research error:", error);
    return NextResponse.json(
      {
        error: "Failed to run competitor research",
        details: String(error),
      },
      { status: 500 }
    );
  }
}
