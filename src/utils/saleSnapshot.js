// src/utils/saleSnapshot.js
// Builds a frozen sale snapshot for a sold listing using TrendSense data

export function generateSaleSnapshot(item, ultraData, proData, infinity) {
  if (!item || !ultraData || !proData) return null;

  const soldPrice =
    typeof item.soldPrice === "number" && !Number.isNaN(item.soldPrice)
      ? item.soldPrice
      : null;
  const soldDate = item.soldDate || null;

  const trendScoreAtSale =
    typeof ultraData.trendScore === "number"
      ? ultraData.trendScore
      : proData.trendScore ?? null;

  const demandLabel = proData.demandLabel || "";
  const smartPriceRange = proData.smartPriceRange || null;
  const eventHeadline = ultraData.eventHeadline || "";

  const catKey = item.category || "Other";
  const catInfo = infinity?.categoryMomentum?.[catKey] || null;
  const categoryMomentumSummary = catInfo
    ? `${catInfo.direction} (score ${catInfo.score})`
    : "";

  const hotTags = ultraData.hotTags || infinity?.hotTags || [];

  // nextSuggestion: first item in Infinity listNext
  const nextSuggestion =
    infinity?.listNext && infinity.listNext.length
      ? infinity.listNext[0].item
      : null;

  // simple 7‑point sparkline from trendScoreAtSale
  const base =
    typeof trendScoreAtSale === "number" ? trendScoreAtSale : 50;
  const sparkline = [
    base - 8,
    base - 4,
    base - 2,
    base,
    base + 3,
    base + 6,
    base + 4,
  ].map((v) => Math.max(0, Math.min(100, v)));

  return {
    soldPrice,
    soldDate,
    trendScoreAtSale,
    demandLabel,
    smartPriceRange,
    eventHeadline,
    categoryMomentumSummary,
    hotTags,
    flipPotential: ultraData.flipPotential || [],
    listNext: infinity?.listNext || [],
    nextSuggestion,
    sparkline,
  };
}

