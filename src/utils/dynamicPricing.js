import { runTrendSenseSearch } from "./trendSenseSearch";

// Computes a dynamic price suggestion based on TrendSense search signals
export async function getDynamicPrice(query, condition = "Good") {
  if (!query || query.trim().length < 2) return null;

  const search = await runTrendSenseSearch(query);
  if (!search) return null;

  const base = search.smartPriceRange?.target;
  if (!base) return null;

  let price = base;

  // CATEGORY HEAT
  const heat = search.categoryMomentum?.heat || 50;
  price += (heat - 50) * 0.25;

  // BRAND DEMAND
  const demandLabel = (search.demandLabel || "").toLowerCase();
  if (demandLabel.includes("peak")) {
    price += base * 0.1;
  } else if (demandLabel.includes("high")) {
    price += base * 0.05;
  }

  // HOT TAG HITS
  const tagBoost = (search.hotTags?.length || 0) * 1.5;
  price += tagBoost;

  // EVENT SPIKE
  if (search.eventHeadline) {
    price += base * 0.08;
  }

  // CONDITION MULTIPLIERS
  const conditionMap = {
    New: 1.2,
    "Like New": 1.1,
    Good: 1.0,
    Fair: 0.85,
  };
  price *= conditionMap[condition] || 1;

  return {
    dynamic: Math.round(price),
    floor: search.smartPriceRange.min,
    target: search.smartPriceRange.target,
    ceiling: search.smartPriceRange.max,
    trendScore: search.trendScore,
    demandLabel: search.demandLabel,
    event: search.eventHeadline,
    hotTags: search.hotTags,
    category: search.category,
    brand: search.brand,
  };
}

