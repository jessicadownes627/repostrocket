// TrendSense™ Engine — Repost Rocket AI Resale Intelligence
// Produces a 0–100 trend score + explanations

const HOT_BRANDS = [
  "lululemon",
  "free people",
  "aritzia",
  "skims",
  "nike",
  "jordan",
  "adidas",
  "hoka",
  "on running",
  "carhartt",
  "patagonia",
  "north face",
  "ugg",
];

const HOT_COLORS = [
  "denim blue",
  "cherry red",
  "cocoa",
  "mocha",
  "emerald",
  "sage",
  "black",
  "ivory",
];

const HOT_KEYWORDS = [
  "oversized",
  "vintage",
  "y2k",
  "retro",
  "cropped",
  "chunky",
  "mini",
  "maxi",
  "stanley",
  "barbiecore",
  "dior",
  "swiftie",
  "harry potter",
];

export function runTrendSense(item = {}) {
  let score = 50;
  const reasons = [];

  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();

  // Category weighting
  if (item.category === "Shoes") {
    score += 8;
    reasons.push("Footwear continues to sell consistently.");
  }

  if (item.category === "Collectibles") {
    score += 10;
    reasons.push("Collectibles market remains hot.");
  }

  if (item.category === "Sports Cards") {
    score += 15;
    reasons.push("Sports card market is active year-round.");
  }

  // Brand heat
  HOT_BRANDS.forEach((brand) => {
    if (text.includes(brand)) {
      score += 8;
      reasons.push(`Brand "${brand}" has strong demand.`);
    }
  });

  // Color heat
  HOT_COLORS.forEach((color) => {
    if (text.includes(color)) {
      score += 4;
      reasons.push(`Colorway "${color}" aligns with current trends.`);
    }
  });

  // Keyword heat
  HOT_KEYWORDS.forEach((kw) => {
    if (text.includes(kw)) {
      score += 6;
      reasons.push(`"${kw}" style is trending this season.`);
    }
  });

  // Condition bump
  if (item.condition === "New" || item.condition === "Like New") {
    score += 5;
    reasons.push("Strong condition increases resale value.");
  }

  // Cap
  if (score > 100) score = 100;
  if (score < 0) score = 0;

  return {
    trendScore: score,
    trendReasons: reasons,
  };
}

