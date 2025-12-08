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
      generateDescription(listing) ||
      "Item is in good condition and ready to ship.";

    const finalPrice = smartPrice({ price, condition });

    const finalTags = generateTags(listing);

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
//  PROFESSIONAL DESCRIPTION + TAG ENGINE
// ----------------------------------------------------

// Extracts core item data in a clean, trimmed way
function extractItemData(listing) {
  const {
    brand = "",
    title = "",
    color = "",
    material = "",
    size = "",
    pattern = "",
    category = "",
    condition = "",
  } = listing || {};

  return {
    brand: brand.trim(),
    title: title.trim(),
    color: color.trim(),
    material: material.trim(),
    size: size.trim(),
    pattern: pattern.trim(),
    category: category.trim(),
    condition: condition.trim(),
  };
}

function buildOpeningLine({ brand, category }) {
  if (brand && category)
    return `${brand} ${category} — a timeless pick for everyday wear.`;
  if (brand) return `${brand} — a reliable closet staple.`;
  if (category) return `${category} — an always-useful wardrobe piece.`;
  return "A versatile addition to your wardrobe.";
}

function buildConditionLine(condition) {
  if (!condition) return "";

  const c = condition.toLowerCase();

  if (c.includes("new"))
    return "Condition: New with tags — perfect and unused.";
  if (c.includes("like new")) return "Condition: Like new — barely worn.";
  if (c.includes("good"))
    return "Condition: Good — light wear but fully presentable.";
  if (c.includes("fair"))
    return "Condition: Fair — visible wear, priced accordingly.";

  return `Condition: ${condition}.`;
}

function buildFitLine({ material }) {
  if (!material) return "";

  const m = material.toLowerCase();
  if (m.includes("stretch")) return "Fit: Stretchy and comfortable.";
  if (m.includes("cotton")) return "Fit: Soft and breathable cotton feel.";
  if (m.includes("denim")) return "Fit: Classic denim structure with reliable hold.";

  return "Fit: Comfortable everyday wear.";
}

function buildSellingPoints({ pattern, color, category }) {
  const pts = [];

  if (pattern) pts.push(`Pattern: ${pattern}.`);
  if (color) pts.push(`Color: ${color}.`);
  if (category) pts.push("Style: Modern and easy to pair.");

  pts.push("Great for layering and easy to style.");

  return pts.join(" ");
}

function generateDescription(listing) {
  const data = extractItemData(listing || {});

  const parts = [
    buildOpeningLine(data),
    buildConditionLine(data.condition),
    buildFitLine(data),
    buildSellingPoints(data),
  ];

  return cleanParagraph(parts.filter(Boolean).join(" "));
}

// ------------------------------
//  TAG ENGINE 2.0 (Clean + Realistic)
// ------------------------------

function generateTags(listing) {
  const {
    brand = "",
    title = "",
    color = "",
    material = "",
    category = "",
    size = "",
    pattern = "",
  } = listing || {};

  const tags = [];

  // BRAND
  if (brand) tags.push(brand.trim());

  // CATEGORY
  if (category) tags.push(category.toLowerCase());

  // MATERIAL
  if (material) {
    material
      .toLowerCase()
      .split(" ")
      .forEach((m) => tags.push(m));
  }

  // COLOR
  if (color) tags.push(color.toLowerCase());

  // SIZE
  if (size) tags.push(size.toLowerCase());

  // PATTERN
  if (pattern) tags.push(pattern.toLowerCase());

  // TITLE KEYWORDS (no bland adjectives)
  title
    .toLowerCase()
    .split(" ")
    .filter(
      (w) =>
        w.length > 2 && !["cute", "nice", "great", "pretty"].includes(w)
    )
    .forEach((w) => tags.push(w));

  // Seasonal / style tags
  const seasonalKeywords = ["summer", "spring", "fall", "winter"];
  const styleKeywords = ["classic", "minimal", "streetwear", "modern", "vintage"];

  seasonalKeywords.forEach((s) => {
    if (title.toLowerCase().includes(s)) tags.push(s);
  });

  styleKeywords.forEach((s) => {
    if (title.toLowerCase().includes(s)) tags.push(s);
  });

  // Dedupe, clean, limit
  const finalTags = [...new Set(tags)]
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);

  return finalTags;
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
  return str
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .trim();
}

function cleanParagraph(str) {
  return cleanSentence(
    str
      .replace(/\n+/g, " ")
      .replace(/\s\s+/g, " ")
      .trim()
  );
}
