export function aiReviewEngine(listing, parsed = {}, platformList = []) {
  const confidence = {
    brand: parsed.brand ? 0.92 : 0.4,
    model: parsed.model ? 0.78 : 0.35,
    color: parsed.color ? 0.83 : 0.5,
    size: parsed.size ? 0.88 : 0.2,
    condition: listing?.condition ? 0.95 : 0.4,
  };

  const titleAudit = [];
  if (!parsed.brand) titleAudit.push("Add brand to improve search visibility.");
  if (!parsed.color) titleAudit.push("Add color for better marketplace filtering.");
  if (!parsed.size) titleAudit.push("Add size — buyers search this first.");
  if ((listing?.title || "").length < 22) titleAudit.push("Short titles reduce search ranking.");

  const descriptionAudit = parsed.descriptionHighlights || [];

  const platformWarnings = {};
  platformList.forEach((p) => {
    const arr = [];
    if (p === "poshmark" && !(listing?.description || "").toLowerCase().includes("measure")) {
      arr.push("Poshmark buyers expect measurements.");
    }
    if (p === "ebay" && !listing?.conditionNotes && listing?.condition !== "New") {
      arr.push("eBay prefers condition notes in parentheses.");
    }
    if (p === "facebook" && (listing?.title || "").includes("❌")) {
      arr.push("FB Marketplace prohibits certain symbols/emojis.");
    }
    if (arr.length) platformWarnings[p] = arr;
  });

  const priceAudit =
    Number(listing?.price) < 10
      ? "Very low price — may reduce buyer confidence."
      : Number(listing?.price) > 150
      ? "High price — ensure flaws/condition are clear to avoid disputes."
      : "Price is within typical marketplace range.";

  return {
    confidence,
    highlights: descriptionAudit,
    titleAudit,
    platformWarnings,
    priceAudit,
  };
}
