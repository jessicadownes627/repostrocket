import { buildCardTitle } from "./buildCardTitle";

// Builds per-platform preview strings without mutating listingData.
export function buildPlatformPreview(listing) {
  if (!listing) {
    return {
      baseTitle: "",
      summaryDescription: "",
      titles: {},
    };
  }

  const rawTitle = listing.title || "";
  const description = listing.description || "";
  const cardAttributes = listing.cardAttributes || null;

  // For cards, prefer the structured card title; otherwise use the raw title.
  let baseTitle = rawTitle;
  if (cardAttributes) {
    const cardTitle = buildCardTitle(cardAttributes);
    if (cardTitle) baseTitle = cardTitle;
  }

  // Per-platform title lengths
  const ebayTitle = baseTitle ? baseTitle.slice(0, 80) : "";
  const mercariTitle = baseTitle ? baseTitle.slice(0, 60) : "";
  const poshmarkTitle = baseTitle ? baseTitle.slice(0, 50) : "";

  // Description: prefer user description; fall back to grading summary for cards.
  let summaryDescription = description || "";
  if (!summaryDescription && cardAttributes?.grading) {
    const g = cardAttributes.grading;
    summaryDescription = [
      g.centering && `Centering: ${g.centering}`,
      g.corners && `Corners: ${g.corners}`,
      g.edges && `Edges: ${g.edges}`,
      g.surface && `Surface: ${g.surface}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  return {
    baseTitle,
    summaryDescription,
    titles: {
      ebay: ebayTitle,
      mercari: mercariTitle,
      poshmark: poshmarkTitle,
    },
  };
}

