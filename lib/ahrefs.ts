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

export async function getKeywordOpportunities(
  seedKeywords: string[]
): Promise<KeywordOpportunity[]> {
  const apiKey = process.env.AHREFS_API_KEY;

  if (!apiKey) {
    console.error("AHREFS_API_KEY is not set");
    return [];
  }

  const opportunities: KeywordOpportunity[] = [];

  for (const keyword of seedKeywords) {
    try {
      const params = new URLSearchParams({
        keywords: keyword,
        country: "us",
        select: "keyword,volume,difficulty,cps",
      });

      const response = await fetch(
        `https://api.ahrefs.com/v3/keywords-explorer/overview?${params.toString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );

      if (!response.ok) {
        console.error(`Ahrefs API error for keyword "${keyword}":`, response.status);
        continue;
      }

      const data = await response.json();

      if (data && Array.isArray(data.keywords)) {
        data.keywords.forEach((item: AhrefsKeyword) => {
          // Filter: volume > 50, difficulty < 80
          if (item.volume > 50 && (item.difficulty === null || item.difficulty < 80)) {
            opportunities.push({
              keyword: item.keyword,
              volume: item.volume,
              difficulty: item.difficulty,
              clicks: item.cps,
            });
          }
        });
      }
    } catch (error) {
      console.error(`Error fetching data for keyword "${keyword}":`, error);
    }
  }

  // Sort by volume descending and return top 5
  return opportunities.sort((a, b) => b.volume - a.volume).slice(0, 5);
}
