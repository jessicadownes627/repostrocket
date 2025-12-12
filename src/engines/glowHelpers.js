// ---------------------------------------------
// ✨ GLOW HELPERS — Glow Protocol Part 2
// ---------------------------------------------

// Optional rewrite to elevate description without hallucinating
export function enhanceDescriptionForGlow(desc = "") {
  if (!desc) return desc;

  return (
    desc
      .replace(/\b(nice|cute|good|simple|basic)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim() +
    " Crafted with attention to detail, this piece brings effortless style to any wardrobe."
  );
}

// Title enhancer — short, strong, and salable
export function enhanceTitleForGlow(title = "") {
  if (!title) return title;

  const words = title.split(" ");
  if (words.length <= 8) return title;

  return words.slice(0, 8).join(" ");
}

// Soft cosmetic score system
export function generateGlowScore(result) {
  return {
    clarity: Math.floor(Math.random() * 2) + 4, // 4–5
    fit: Math.floor(Math.random() * 2) + 4,
    vibe: Math.floor(Math.random() * 2) + 4,
    recommendations: [
      "Try adjusting lighting for more natural highlights.",
      "Center the item to reduce visual noise.",
      "Neutral backgrounds improve perceived quality.",
    ],
  };
}

// Identifies the *intent* of the listing (fashion, decor, accessories)
export function glowIntentClassifier(text = "") {
  const lower = text.toLowerCase();

  if (lower.match(/dress|shirt|jeans|top|hoodie|jacket|pants|skirt/)) {
    return "fashion";
  }
  if (lower.match(/bag|wallet|belt|scarf|accessory/)) {
    return "accessories";
  }
  if (lower.match(/vase|decor|home|ceramic|wood/)) {
    return "decor";
  }

  return "fashion"; // default bias
}
