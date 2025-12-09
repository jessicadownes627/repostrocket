// src/utils/listingComposer.js
// Builds a professional, TrendSense-aware listing from editor + pricing data

export function composeListing({
  title,
  brand,
  category,
  condition,
  dynamicPrice,
  trendScore,
  hotTags,
  eventHeadline,
}) {
  const cleanTitle = title
    ? `${brand ? `${brand} ` : ""}${title}`.trim().replace(/\s+/g, " ")
    : "";

  const introCondition =
    {
      New: "Brand new with tags.",
      "Like New": "Like New — minimal wear with high-quality condition.",
      Good: "Good condition with normal wear.",
      Fair: "Fair condition — priced accordingly.",
    }[condition] || "";

  const eventLine = eventHeadline
    ? `This item is currently seeing a demand spike due to: ${eventHeadline}.`
    : "";

  const tagLine =
    hotTags && hotTags.length
      ? `Trending tags: ${hotTags
          .map((t) => t.keyword || t)
          .filter(Boolean)
          .join(", ")}.`
      : "";

  const safeTrendScore = typeof trendScore === "number" ? trendScore : "";
  const safePrice =
    typeof dynamicPrice === "number" && !Number.isNaN(dynamicPrice)
      ? dynamicPrice
      : "";

  return {
    title: cleanTitle,
    description: `
${introCondition}

${cleanTitle} is a strong performer in the resale market right now.${
      safeTrendScore ? ` TrendSense Score: ${safeTrendScore}.` : ""
    } ${eventLine}

Category: ${category || "—"}.
Brand demand: ${brand || "—"}.${
      safePrice ? ` Recommended listing price: $${safePrice}.` : ""
    }

${tagLine}

Ships fast and packed with care.
    `.trim(),
    hashtags:
      hotTags && hotTags.length
        ? hotTags
            .map((t) => t.keyword || t)
            .filter(Boolean)
            .map((t) => `#${String(t).replace(/\s+/g, "")}`)
            .join(" ")
        : "",
    keywords: `
${cleanTitle} ${brand || ""} ${category || ""} resale trending ${
      hotTags && hotTags.length
        ? hotTags
            .map((t) => t.keyword || t)
            .filter(Boolean)
            .join(" ")
        : ""
    }
    `.trim(),
  };
}

