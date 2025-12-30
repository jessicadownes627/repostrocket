const sanitize = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  return str === "undefined" ? "" : str;
};

const formatPriceLine = (price) => {
  if (price === null || price === undefined || price === "") return "";
  if (typeof price === "number" && !Number.isNaN(price)) {
    return `$${price}`;
  }
  const trimmed = String(price).trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("$")) return trimmed;
  return `$${trimmed}`;
};

const buildDetailLine = ({ condition, category, size }) => {
  const parts = [];
  if (condition) parts.push(sanitize(condition));
  if (category) parts.push(sanitize(category));
  if (size) parts.push(`Size ${sanitize(size)}`);
  return parts.filter(Boolean).join(" · ");
};

export function buildListingCopyText({
  title,
  price,
  description,
  condition,
  category,
  size,
  cardAttributes,
}) {
  const lines = [];
  const safeTitle = sanitize(title);
  if (safeTitle) {
    lines.push(safeTitle);
  }

  const priceLine = formatPriceLine(price);
  if (priceLine) {
    lines.push(`Price: ${priceLine}`);
  }

  const detailLine = buildDetailLine({ condition, category, size });
  if (detailLine) {
    lines.push(detailLine);
  }

  const safeDescription = sanitize(description);
  if (safeDescription) {
    if (lines.length) lines.push("");
    lines.push(safeDescription);
  }

  const keyFields = [
    ["Player", cardAttributes?.player],
    ["Team", cardAttributes?.team],
    ["Year", cardAttributes?.year],
    ["Set", cardAttributes?.setName || cardAttributes?.setBrand],
    ["Card #", cardAttributes?.cardNumber],
  ]
    .map(([label, value]) => {
      const clean = sanitize(value);
      if (!clean) return null;
      return `${label}: ${clean}`;
    })
    .filter(Boolean);

  if (keyFields.length) {
    if (lines.length) lines.push("");
    lines.push("Key fields:");
    lines.push(...keyFields);
  }

  return lines.join("\n");
}
