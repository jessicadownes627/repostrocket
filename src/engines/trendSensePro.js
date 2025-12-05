import { runTrendSense } from "./trendSense";

// Base multipliers for resale dynamics
const BASE_MULTIPLIER = {
  low: 0.75,
  steady: 0.9,
  high: 1.1,
  peak: 1.35,
};

function deriveDemandLabel(score) {
  if (score >= 85) return "peak";
  if (score >= 70) return "high";
  if (score >= 55) return "steady";
  return "low";
}

function saleSpeedFor(label) {
  switch (label) {
    case "peak":
      return "Likely to sell within 1–3 days";
    case "high":
      return "Likely to sell within 3–7 days";
    case "steady":
      return "Likely to sell within 7–14 days";
    default:
      return "Likely to sell within 14–30 days";
  }
}

export function runTrendSensePro(item) {
  const base = runTrendSense(item);
  const { trendScore, trendReasons } = base;

  // If user gave a price, we anchor to it; else use AI recommendation if available.
  const basePrice =
    item.price || item.priceRecommendation || 20; // safety fallback

  const demandLabel = deriveDemandLabel(trendScore);
  const multiplier = BASE_MULTIPLIER[demandLabel];

  const minPrice = Math.max(5, Math.round(basePrice * multiplier * 0.88));
  const targetPrice = Math.max(6, Math.round(basePrice * multiplier));
  const maxPrice = Math.round(targetPrice * 1.15);

  const proReasons = [
    `Demand level: ${demandLabel.toUpperCase()}.`,
    `Your base price is ${basePrice}. TrendSense suggests a demand multiplier of ${multiplier}.`,
    ...trendReasons,
  ];

  return {
    ...base,
    demandLabel,
    smartPriceRange: {
      min: minPrice,
      target: targetPrice,
      max: maxPrice,
    },
    saleSpeed: saleSpeedFor(demandLabel),
    proReasons,
  };
}

