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
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "2t",
  "3t",
  "4t",
  "5t",
  "y",
  "t",
]);

export const extractAITagsFromFields = ({
  title,
  description,
  color,
  material,
  brand,
  condition,
  existingTags,
} = {}) => {
  const rawFields = [
    title,
    description,
    color,
    material,
    brand,
    condition,
    ...(Array.isArray(existingTags) ? existingTags : [existingTags].filter(Boolean)),
  ];

  const tokens = rawFields
    .join(" ")
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter(Boolean);

  const isNumericSizeToken = (token) => /^\d{1,3}(\.\d)?$/.test(token);

  const filtered = tokens.filter(
    (token) =>
      token.length > 2 &&
      !STOPWORDS.has(token) &&
      !isNumericSizeToken(token)
  );

  return filtered.slice(0, 20);
};
