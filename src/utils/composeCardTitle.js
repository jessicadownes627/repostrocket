export function composeCardTitle({ year, setName, player, cardTitle, brand } = {}) {
  if (cardTitle) return String(cardTitle).trim();
  if (!player) return "";
  const safePlayer = String(player).trim();
  const safeSet = setName ? String(setName).trim() : "";
  const safeYear = year ? String(year).trim() : "";
  const safeBrand = brand ? String(brand).trim() : "";
  const normalizedSet = safeSet.toLowerCase();
  const normalizedYear = safeYear.toLowerCase();
  const yearPart =
    safeYear && (!normalizedSet || !normalizedSet.includes(normalizedYear))
      ? safeYear
      : "";
  const setPart = safeSet
    ? safeBrand && normalizedSet.includes(safeBrand.toLowerCase())
      ? safeSet
      : safeSet
    : "";
  const parts = [yearPart, setPart, safePlayer].filter(Boolean);
  if (parts.length) {
    return parts.join(" ").replace(/\s+/g, " ").trim();
  }
  return safePlayer;
}
