export function formatDescriptionByPlatform(listing) {
  const base = listing?.description?.trim() || "";

  return {
    ebay: [
      base,
      listing?.condition
        ? `\nCondition: ${listing.condition}`
        : "",
    ]
      .filter((line) => line !== "")
      .join("\n"),

    poshmark: [
      base,
      listing?.size ? `\nSize: ${listing.size}` : "",
    ]
      .filter(Boolean)
      .join("\n"),

    mercari: base,
  };
}
