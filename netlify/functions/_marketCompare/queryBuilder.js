const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "at",
  "by",
  "for",
  "from",
  "in",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
]);

export function buildMarketCompareQuery(input = {}) {
  const title = sanitizeText(input.title, 180);
  const brand = sanitizeText(input.brand, 80);
  const category = sanitizeText(input.category, 80);
  const objectType = sanitizeText(input.object_type || input.objectType, 80);
  const tags = normalizeTags(input.tags).slice(0, 8);

  const primaryText = title || [brand, objectType, category].filter(Boolean).join(" ");
  const normalizedText = collapseWhitespace(primaryText);
  const tokens = uniqueTokens([
    ...tokenize(title),
    ...tokenize(brand),
    ...tokenize(objectType),
    ...tokenize(category),
    ...tags.flatMap((tag) => tokenize(tag)),
  ]);

  return {
    searchText: normalizedText,
    keywords: selectKeywords(tokens),
    title,
    brand,
    category,
    objectType,
    tags,
  };
}

export function ensureMarketCompareQuery(input = {}) {
  const query = buildMarketCompareQuery(input);
  if (!query.searchText) return null;
  return query;
}

function sanitizeText(value, limit = 120) {
  if (value === null || value === undefined) return "";
  const str = collapseWhitespace(String(value));
  if (!str) return "";
  return str.length > limit ? `${str.slice(0, limit - 1)}…` : str;
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return tags
    .map((tag) => sanitizeText(tag, 40))
    .filter(Boolean);
}

function collapseWhitespace(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function tokenize(text = "") {
  return collapseWhitespace(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token));
}

function uniqueTokens(tokens = []) {
  const seen = new Set();
  const ordered = [];
  tokens.forEach((token) => {
    if (!token || seen.has(token)) return;
    seen.add(token);
    ordered.push(token);
  });
  return ordered;
}

function selectKeywords(tokens = []) {
  return tokens.slice(0, 10);
}
