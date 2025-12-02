import { useEffect, useState, useMemo, useCallback } from "react";
import { extractDominantColor } from "../utils/extractDominantColor";
import { mapColorToName } from "../utils/colorNameMap";
import { enhanceStyle } from "../utils/enhanceStyle";
import { updateTagsForCategory } from "../utils/updateTagsForCategory";
import { mergeAndCleanTags } from "../utils/mergeAndCleanTags";

/* -------------------------------------------
   CATEGORY DETECTION (Deep rules)
-------------------------------------------- */

function detectCategory(listing = {}) {
  const title = listing.title?.toLowerCase() || "";
  const desc = listing.description?.toLowerCase() || "";
  const text = `${title} ${desc}`;

  // Wedding priority only; otherwise simple clothing fallback
  if (
    text.includes("wedding") ||
    text.includes("bridal") ||
    text.includes("bride") ||
    text.includes("ceremony") ||
    text.includes("lace gown") ||
    text.includes("ball gown")
  ) {
    return "Dresses → Wedding Dress";
  }

  return "Clothing → Other";
}

function extractFeatures(listing = {}) {
  const text = `${listing.title || ""} ${listing.description || ""}`.toLowerCase();

  return {
    color:
      /(white|ivory|cream|champagne|black|blue|red|pink|beige|tan|green|silver|gold)/.exec(text)?.[0] ||
      "Not specified",

    material:
      /(lace|tulle|satin|chiffon|silk|denim|cotton|polyester|leather)/.exec(text)?.[0] || "Unknown",

    length:
      /(maxi|midi|mini|floor length|tea length)/.exec(text)?.[0] || "Not specified",

    condition:
      /(new with tags|new without tags|excellent|great|good|fair)/.exec(text)?.[0] ||
      "Not specified",

    style:
      /(boho|formal|elegant|minimalist|classic|vintage|y2k|romantic)/.exec(text)?.[0] ||
      "General",
  };
}

/* -------------------------------------------
   DESCRIPTION GENERATOR (Beautiful + accurate)
-------------------------------------------- */

function formatDescription(listing, f, category) {
  return `
${f.style !== "General" ? `${capitalize(f.style)} ` : ""}${category} in ${f.condition} condition.

✨ Details:
• Color: ${capitalize(f.color)}
• Material: ${capitalize(f.material)}
• Length: ${capitalize(f.length)}
• Style: ${capitalize(f.style)}
• Size: ${listing.size || "See photos for measurements"}
• Brand: ${listing.brand || "Unbranded"}

This piece is clean, flattering, and ready for its next home.
Ships fast from a smoke-free home.
  `.trim();
}

/* -------------------------------------------
   TAG GENERATION
-------------------------------------------- */

function generateTags(listing, f, category) {
  const splitTokens = (value) =>
    String(value || "")
      .toLowerCase()
      .split(/[^a-z0-9]+/i)
      .filter(Boolean);

  const seeds = [
    f.color,
    f.material,
    f.style,
    f.length,
    category,
    listing.brand,
    listing.size,
    listing.condition,
    listing.shipping,
  ];

  const tokens = seeds.flatMap((seed) => splitTokens(seed));

  const custom = Array.isArray(listing.tags)
    ? listing.tags.flatMap((tag) => splitTokens(tag))
    : splitTokens(listing.tags);

  const combined = [...tokens, ...custom];

  const unique = [];
  combined.forEach((tag) => {
    if (!unique.includes(tag)) {
      unique.push(tag);
    }
  });

  return unique.slice(0, 12);
}

/* -------------------------------------------
   SMARTFILL BUNDLE BUILDER
-------------------------------------------- */

function buildSmartFillBundle(listing, features, category) {
  return {
    title: listing.title || capitalize(category.split(" → ").pop()) || "Item",
    category,
    color: features.color,
    material: features.material,
    length: features.length,
    condition: features.condition,
    style: features.style,
    brand: listing.brand || "Unbranded",
    size: listing.size || "See photos",
    description: formatDescription(listing, features, category),
    tags: generateTags(listing, features, category),
  };
}

/* -------------------------------------------
   MAIN HOOK — SMARTFILL PRO 3.0
-------------------------------------------- */

export function useSmartFill(listingData, platform = "mercari") {
  const [dominantColor, setDominantColor] = useState(null);
  const [colorName, setColorName] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [tags, setTags] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Extract dominant color from image
  useEffect(() => {
    async function runColor() {
      if (listingData?.photos?.[0]) {
        const rgb = await extractDominantColor(listingData.photos[0]);
        setDominantColor(rgb);
        setColorName(mapColorToName(rgb));
      }
    }
    runColor();
  }, [listingData]);

  const smartFillTrigger = () => setRefreshKey((prev) => prev + 1);

  // Detect category + features
  const category = useMemo(
    () => detectCategory(listingData),
    [listingData, platform, refreshKey]
  );
  const features = useMemo(() => {
    const base = extractFeatures(listingData);
    if (colorName) base.color = colorName;
    base.style = enhanceStyle(base.style, listingData?.description || "");
    return base;
  }, [listingData, colorName, platform, refreshKey]);

  // Confidence logic
  const confidenceScore =
    (colorName ? 35 : 0) +
    (features.material !== "Unknown" ? 25 : 0) +
    (features.length !== "Not specified" ? 15 : 0) +
    (category !== "Clothing → Other" ? 25 : 0);

  const confidenceLabel =
    confidenceScore >= 70
      ? "High Confidence"
      : confidenceScore >= 40
      ? "Medium Confidence"
      : "Low Confidence";

  // Build the SmartFill result bundle
  const smartFillBundle = useMemo(
    () => buildSmartFillBundle(listingData, features, category),
    [listingData, features, category, platform, refreshKey]
  );

  const handleCategorySelect = useCallback(
    (cat) => {
      setSelectedCategory(cat);
      const curated = updateTagsForCategory(cat);
      setTags(curated);
      return curated;
    },
    []
  );

  const showTags = Boolean(category);
  const handleRemoveTag = useCallback(
    (tag) => {
      const next = tags.filter((t) => t !== tag);
      setTags(next);
      return next;
    },
    [tags]
  );

  useEffect(() => {
    if (!selectedCategory && category) {
      handleCategorySelect(category);
    }
  }, [category, selectedCategory, handleCategorySelect]);

  const resetListing = useCallback(() => {
    setTags([]);
    setSelectedCategory(null);
  }, []);

  useEffect(() => {
    if (!selectedCategory || !smartFillBundle.tags?.length) return;

    const merged = mergeAndCleanTags({
      curatedTags: tags,
      aiTags: smartFillBundle.tags,
    });
    if (merged.join(",") !== tags.join(",")) {
      setTags(merged);
    }
  }, [selectedCategory, smartFillBundle.tags, tags]);

  const autoCopyBundle = () =>
    navigator.clipboard.writeText(JSON.stringify(smartFillBundle, null, 2));

  return {
    smartFillBundle,
    category,
    features,
    confidenceScore,
    confidenceLabel,
    recommendedTags: smartFillBundle.tags,
    dominantColor,
    colorName,
    autoCopyBundle,
    smartFillTrigger,
    tags,
    setTags,
    handleCategorySelect,
    resetListing,
    selectedCategory,
    showTags,
    handleRemoveTag,
  };
}

/* -------------------------------------------
   HELPERS
-------------------------------------------- */

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
