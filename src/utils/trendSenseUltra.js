import categoryTrends from "../data/categoryTrends.json";
import { runAIReview } from "./safeAI/runAIReview";

export async function runTrendSenseUltra(item) {
  if (!item) return null;

  const cat =
    item.category ||
    item.platformCategory ||
    "Women's Fashion";

  const trendInfo = categoryTrends[cat] || {
    trend: 0,
    search: 0,
    season: "Baseline",
  };

  // Build base context for AI
  const baseContext = `
Item:
- Title: ${item.title || "Unknown"}
- Category: ${cat}
- Condition: ${item.condition || "Unknown"}
- Tags: ${(item.tags || []).join(", ")}

Trend Signals:
- Trend movement: ${trendInfo.trend}
- Search demand: ${trendInfo.search}
- Seasonal cycle: ${trendInfo.season}

Task:
Return JSON ONLY with:
{
  "trendScore": number,
  "searchBoost": number,
  "timingNote": string,
  "priceFloor": number,
  "priceCeiling": number,
  "luxeBadges": [string],
  "summary": string
}
`;

  let aiPayload = null;
  try {
    aiPayload = await runAIReview({
      title: item.title,
      description: item.description,
      category: item.category,
      context: baseContext,
    });

    if (typeof aiPayload === "string") {
      return JSON.parse(aiPayload);
    }

    return aiPayload;
  } catch (err) {
    console.error("TrendSense ULTRA error:", err);
    return null;
  }
}

