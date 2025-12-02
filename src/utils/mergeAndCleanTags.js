const STOPWORDS = new Set([
  "object",
  "not",
  "specified",
  "unknown",
  "general",
  "other",
  "buyer",
  "pays",
  "pay",
  "paid",
  "ship",
  "shipping",
  "free",
  "fee",
  "cost",
  "new",
  "like",
  "good",
  "fair",
  "and",
  "or",
  "the",
  "a",
  "an",
  "of",
  "to",
  "for",
  "in",
  "is",
  "with",
  "by",
  "at",
  "from",
  "on",
  "this",
  "that",
  "it",
  "its",
  "item",
  "stuff",
  "thing",
  "misc",
]);

export function mergeAndCleanTags({
  curatedTags = [],
  aiTags = [],
  customTags = [],
} = {}) {
  const all = [...curatedTags, ...aiTags, ...customTags];

  const cleaned = all
    .map((t) => String(t || "").toLowerCase().trim())
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));

  return Array.from(new Set(cleaned)).slice(0, 12);
}
