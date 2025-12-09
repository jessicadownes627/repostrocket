import categoryTrends from "../data/categoryTrends.json";
import { runAIReview } from "./safeAI/runAIReview";
import { runTrendSense } from "../engines/trendSense";
import { runTrendSensePro } from "../engines/trendSensePro";
import { getTrendEventsForItem } from "./trendSenseEvents";

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

    const ultraResults =
      (typeof aiPayload === "string"
        ? JSON.parse(aiPayload)
        : aiPayload) || {};

    // Local TrendSense signal + Pro pricing band
    const baseResults = runTrendSense(item);
    const proResults = runTrendSensePro(item);

    // Live events bridge
    const events = await getTrendEventsForItem(item);

    const eventImpact = events?.eventImpactScore || 0;
    const baseScore =
      baseResults?.trendScore ??
      ultraResults?.trendScore ??
      50;

    const boostedScore = Math.min(
      100,
      baseScore + eventImpact
    );

    return {
      ...ultraResults,
      ...proResults,
      ...events,
      trendScore: boostedScore,
      buyerHint:
        boostedScore > 75
          ? "Prices rise fastest during spikes — expect fewer deals."
          : boostedScore > 50
          ? "Buyers are active here — expect quicker sellouts."
          : "If you're trying to buy, you may find softer pricing this week.",
    };
  } catch (err) {
    console.error("TrendSense ULTRA error:", err);
    return null;
  }
}
