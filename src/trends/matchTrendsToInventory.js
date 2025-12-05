// src/trends/matchTrendsToInventory.js

export function matchTrendsToInventory(trends, lastListing) {
  if (!lastListing || !trends?.length) return null;

  const tagsText = Array.isArray(lastListing.tags)
    ? lastListing.tags.join(" ")
    : lastListing.tags || "";

  const text = [
    lastListing.title,
    lastListing.description,
    lastListing.brand,
    lastListing.category,
    tagsText,
  ]
    .join(" ")
    .toLowerCase();

  for (const trend of trends) {
    for (const kw of trend.keywords || []) {
      if (kw && text.includes(kw.toLowerCase())) {
        return {
          match: true,
          trend,
          reason: `Matches keyword "${kw}" found in your item details.`,
        };
      }
    }
  }

  return null;
}

