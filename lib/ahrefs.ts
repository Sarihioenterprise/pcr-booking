interface AhrefsKeyword {
  keyword: string;
  volume: number;
  difficulty: number;
  clicks_per_search: number;
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
      const response = await fetch(
        "https://api.ahrefs.com/v3/keywords-explorer/overview",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            keywords: [keyword],
            select: ["keyword", "volume", "difficulty", "clicks_per_search"],
          }),
        }
      );

      if (!response.ok) {
        console.error(`Ahrefs API error for keyword "${keyword}":`, response.status);
        continue;
      }

      const data = await response.json();

      if (data && Array.isArray(data.data)) {
        data.data.forEach((item: AhrefsKeyword) => {
          // Filter: volume > 100, difficulty < 40
          if (item.volume > 100 && item.difficulty < 40) {
            opportunities.push({
              keyword: item.keyword,
              volume: item.volume,
              difficulty: item.difficulty,
              clicks: item.clicks_per_search,
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
