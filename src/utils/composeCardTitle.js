export function composeCardTitle({ year, setName, player, brand } = {}) {
  const normalizeToken = (value) =>
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const isUnknownOrBase = (value) => {
    const normalized = normalizeToken(value);
    if (!normalized) return true;
    if (normalized.startsWith("unknown")) return true;
    return normalized === "base" || normalized === "base set";
  };
  const clean = (value) => {
    if (!value) return "";
    if (isUnknownOrBase(value)) return "";
    return String(value).trim();
  };

  const safePlayer = clean(player);
  const safeBrand = clean(brand);
  const safeYear = clean(year);
  const safeSet = clean(setName);
  const normalizedPlayer = normalizeToken(safePlayer);
  const normalizedBrand = normalizeToken(safeBrand);
  const normalizedSet = normalizeToken(safeSet);

  const pushUnique = (list, value) => {
    if (!value) return;
    const normalized = normalizeToken(value);
    if (!normalized) return;
    if (list.some((entry) => normalizeToken(entry) === normalized)) return;
    list.push(value);
  };

  if (safePlayer) {
    const parts = [];
    pushUnique(parts, safePlayer);
    if (safeBrand && normalizedBrand !== normalizedPlayer && normalizedBrand !== normalizedSet) {
      pushUnique(parts, safeBrand);
    }
    if (safeYear) {
      pushUnique(parts, safeYear);
    }
    return parts.join(" · ");
  }

  if (safeBrand && safeYear && normalizedBrand !== normalizedSet) {
    const parts = [];
    pushUnique(parts, safeBrand);
    pushUnique(parts, safeYear);
    return parts.join(" · ");
  }

  return "";
}
