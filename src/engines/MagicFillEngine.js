// ----------------------------------------------------
//  UPGRADED MAGIC FILL ENGINE — Style D (Professional)
// ----------------------------------------------------

export async function runMagicFill(listing) {
  try {
    const {
      title = "",
      description = "",
      price = "",
      category = "",
      condition = "",
      size = "",
      brand = "",
      tags = [],
      photos = [],
    } = listing || {};

    const keywords = buildKeywords({ category, brand, size });

    const finalTitle =
      generateTitle({ title, brand, size, category, keywords }) ||
      fallbackTitle({ brand, category, size });

    const finalDescription =
      generateDescription({
        description,
        brand,
        size,
        condition,
        category,
        keywords,
      }) || "Item is in good condition and ready to ship.";

    const finalPrice = smartPrice({ price, condition });

    const finalTags = smartTags({ tags, category, condition, brand });

    return {
      title: finalTitle,
      description: finalDescription,
      price: finalPrice,
      tags: finalTags,
    };
  } catch (err) {
    console.error("Magic Fill engine error:", err);
    return null;
  }
}

// ----------------------------------------------------
//  TITLE GENERATION
// ----------------------------------------------------
function generateTitle({ title, brand, size, category, keywords }) {
  if (title && title.length > 6) {
    return cleanSentence(title);
  }

  const base = [brand, category, size].filter(Boolean).join(" · ");
  if (base) return cleanSentence(base);

  return cleanSentence(keywords.slice(0, 3).join(" · "));
}

function fallbackTitle({ brand, category, size }) {
  return (
    cleanSentence([brand, category, size].filter(Boolean).join(" · ")) ||
    "Quality Item — Ready to Ship"
  );
}

// ----------------------------------------------------
//  DESCRIPTION GENERATION
// ----------------------------------------------------
function generateDescription({
  description,
  brand,
  size,
  condition,
  category,
  keywords,
}) {
  const existing = description?.trim();
  const hasUseful =
    existing &&
    existing.length > 30 &&
    !existing.toLowerCase().includes("cute") &&
    !existing.toLowerCase().includes("nice");

  if (hasUseful) return cleanParagraph(existing);

  return cleanParagraph(`
${brand ? `${brand} ${category || ""}` : category || "Item"} in ${
    condition || "good"
  } condition.
Size: ${size || "Standard"}.

Features:
- Professional, clean look suitable for everyday use.
- Quality materials with long-lasting wear.
- Carefully stored and handled.

This item is ready to ship quickly. Great option for collectors or everyday buyers.
Keywords: ${keywords.join(", ")}
`);
}

// ----------------------------------------------------
//  PRICE SUGGESTION
// ----------------------------------------------------
function smartPrice({ price, condition }) {
  const base = Number(price);
  if (!base || isNaN(base)) return "";

  let adj = base;

  switch (condition?.toLowerCase()) {
    case "new":
      adj = base + 5;
      break;
    case "like new":
      adj = base + 2;
      break;
    case "fair":
      adj = base - 2;
      break;
  }

  return adj.toString();
}

// ----------------------------------------------------
//  TAG EXPANSION
// ----------------------------------------------------
function smartTags({ tags, category, condition, brand }) {
  const set = new Set(tags);
  if (brand) set.add(brand);
  if (category) set.add(category);
  if (condition) set.add(condition);
  set.add("Ready to Ship");
  return Array.from(set);
}

// ----------------------------------------------------
//  KEYWORDS
// ----------------------------------------------------
function buildKeywords({ category, brand, size }) {
  const words = [];
  if (brand) words.push(brand);
  if (category) words.push(category);
  if (size) words.push(size);
  words.push("quality", "verified", "seller", "ship fast");
  return words;
}

// ----------------------------------------------------
//  UTILITIES
// ----------------------------------------------------
function cleanSentence(str) {
  return str.trim().replace(/\s+/g, " ").replace(/^[a-z]/, (m) => m.toUpperCase());
}

function cleanParagraph(str) {
  return str
    .replace(/\n\s*\n/g, "\n")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
}
