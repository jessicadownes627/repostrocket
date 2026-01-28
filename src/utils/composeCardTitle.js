export function composeCardTitle({ year, setName, player, cardTitle, brand } = {}) {
  if (cardTitle) return String(cardTitle).trim();
  const safePlayer = String(player || "").trim();
  const safeBrand = String(brand || "").trim();
  const safeYear = String(year || "").trim();
  const unknownTokens = new Set(["unknown", "unknown player", "unknown team"]);
  const clean = (value) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "";
    if (unknownTokens.has(normalized.toLowerCase())) return "";
    return normalized;
  };
  const parts = [clean(safePlayer), clean(safeBrand), clean(safeYear)].filter(Boolean);
  return parts.join(" · ");
}
