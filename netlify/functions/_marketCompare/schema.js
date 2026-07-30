const PROVIDER_ORDER = ["ebay", "etsy"];

export function createProviderReport({
  provider,
  status = "ok",
  resultCount = 0,
  error = null,
  warnings = [],
}) {
  return {
    provider,
    status,
    resultCount,
    error: error || null,
    warnings: Array.isArray(warnings) ? warnings.filter(Boolean) : [],
  };
}

export function createResult({
  provider,
  listingId,
  title,
  price = null,
  currency = "USD",
  shipping = null,
  condition = "",
  url = "",
  imageUrl = "",
  sellerName = "",
  location = "",
  listingState = "active",
  matchScore = 0,
  fetchedAt,
  metadata = {},
}) {
  return {
    provider,
    listingId: listingId || "",
    title: title || "",
    price: normalizeMoneyValue(price),
    currency: currency || "USD",
    shipping: normalizeMoneyValue(shipping),
    condition: condition || "",
    url: url || "",
    imageUrl: imageUrl || "",
    sellerName: sellerName || "",
    location: location || "",
    listingState: listingState || "active",
    matchScore: normalizeScore(matchScore),
    fetchedAt: fetchedAt || new Date().toISOString(),
    metadata: metadata && typeof metadata === "object" ? metadata : {},
  };
}

export function createMarketCompareResponse({
  query,
  providers = [],
  results = [],
  errors = [],
  fetchedAt,
}) {
  return {
    query: query || {},
    providers: sortProviders(providers),
    results: sortResults(results),
    errors: Array.isArray(errors) ? errors.filter(Boolean) : [],
    fetchedAt: fetchedAt || new Date().toISOString(),
  };
}

function sortProviders(providers = []) {
  return [...providers].sort((a, b) => {
    return providerRank(a?.provider) - providerRank(b?.provider);
  });
}

function sortResults(results = []) {
  return [...results].sort((a, b) => {
    const scoreDelta = normalizeScore(b?.matchScore) - normalizeScore(a?.matchScore);
    if (scoreDelta !== 0) return scoreDelta;
    const priceA = normalizeMoneyValue(a?.price);
    const priceB = normalizeMoneyValue(b?.price);
    return (priceA ?? Number.POSITIVE_INFINITY) - (priceB ?? Number.POSITIVE_INFINITY);
  });
}

function providerRank(provider) {
  const idx = PROVIDER_ORDER.indexOf(String(provider || "").toLowerCase());
  return idx === -1 ? PROVIDER_ORDER.length : idx;
}

function normalizeMoneyValue(value) {
  if (value === null || value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100) / 100;
}

function normalizeScore(value) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(1, Math.round(num * 1000) / 1000));
}
