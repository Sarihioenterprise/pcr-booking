interface AhrefsKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  cps: number;
  clicks_per_search?: number;
}

interface KeywordOpportunity {
  keyword: string;
  volume: number;
  difficulty: number;
  clicks: number;
}

/**
 * Fetch keyword metrics from the Ahrefs v3 API.
 *
 * The /keywords-explorer/overview endpoint requires a POST request with a JSON
 * body — NOT a GET with query params. Passing keywords as GET params returns
 * 400/empty responses. Fixed per audit 2026-07-19.
 */
export async function getKeywordOpportunities(
  seedKeywords: string[]
): Promise<KeywordOpportunity[]> {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    console.error("AHREFS_API_KEY is not set");
    return [];
  }

  const opportunities: KeywordOpportunity[] = [];

  // Ahrefs v3 accepts up to 1000 keywords per request — batch to avoid
  // hitting rate limits and reduce API calls.
  const BATCH_SIZE = 100;

  for (let i = 0; i < seedKeywords.length; i += BATCH_SIZE) {
    const batch = seedKeywords.slice(i, i + BATCH_SIZE);

    try {
      const response = await fetch(
        "https://api.ahrefs.com/v3/keywords-explorer/overview",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keywords: batch,
            country: "us",
            select: ["keyword", "volume", "difficulty", "cps"],
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        console.error(
          `Ahrefs API error (batch ${i / BATCH_SIZE + 1}): ${response.status} — ${errText}`
        );
        continue;
      }

      const data = await response.json();

      if (data && Array.isArray(data.keywords)) {
        data.keywords.forEach((item: AhrefsKeyword) => {
          // Filter: volume > 50, difficulty < 80
          if (
            item.volume > 50 &&
            (item.difficulty === null || item.difficulty < 80)
          ) {
            opportunities.push({
              keyword: item.keyword,
              volume: item.volume,
              difficulty: item.difficulty,
              clicks: item.cps ?? 0,
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching Ahrefs batch starting at index ${i}:`, error);
    }
  }

  // Sort by volume descending and return top opportunities
  return opportunities.sort((a, b) => b.volume - a.volume).slice(0, 10);
}
