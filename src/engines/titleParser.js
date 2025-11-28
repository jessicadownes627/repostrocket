// src/engines/titleParser.js
// Safe, hybrid extraction engine for user-provided titles only.
// Never guesses—only parses what is explicitly present.

const COLORS = [
  "black",
  "white",
  "red",
  "blue",
  "green",
  "yellow",
  "pink",
  "purple",
  "brown",
  "beige",
  "tan",
  "cream",
  "grey",
  "gray",
  "silver",
  "gold",
  "navy",
  "teal",
];

const SIZES = [
  "xs",
  "s",
  "m",
  "l",
  "xl",
  "xxl",
  "xxxl",
  "small",
  "medium",
  "large",
  "2t",
  "3t",
  "4t",
  "5t",
  "6t",
  "7",
  "8",
  "10",
  "12",
  "14",
  "16",
  "28",
  "30",
  "32",
  "34",
  "36",
  "38",
  "40",
];

const CONDITIONS = ["new", "nwt", "nwot", "like new", "gently used", "used", "fair"];

// SIZE REGEXES
const sizeRegexes = [
  /\b(xxs|xs|s|m|l|xl|xxl|xxxl)\b/i,
  /\b(0|2|4|6|8|10|12|14|16)\b/,
  /\b(\d{1,2}[ ]?(?:w|waist|in))\b/i, // waist
  /\b(\d{1,2}[ ]?(?:l|length))\b/i, // inseam
  /\b(\d{1,2}(?:\.\d)?)(?=\s*(?:us|women|men|w|m|shoe|eu|uk))/i, // 7.5 US, 8M, 41 EU
  /\b(\d{1,2}(?:\.\d)?)\b/, // fallback numeric
];

// BAG TYPE REGEXES
const bagRegex = /\b(clutch|crossbody|tote|shoulder|diaper|backpack|hobo|min[ i]?bag|satchel)\b/i;

export function parseTitle(raw) {
  if (!raw) return {};

  const title = raw.trim();
  const text = title.toLowerCase();

  // BRAND — first word, capitalized
  const brand = title.split(" ")[0];

  // MODEL — anything between brand and attributes
  const words = title.split(" ");
  const model = words
    .slice(1)
    .filter((w) => !COLORS.includes(w.toLowerCase()) && !SIZES.includes(w.toLowerCase()))
    .join(" ");

  // COLOR
  const color = COLORS.find(
    (c) => text.includes(` ${c} `) || text.endsWith(` ${c}`) || text.startsWith(`${c} `)
  );

  // SIZE (regex first, fallback to simple list)
  let size = null;
  for (const rx of sizeRegexes) {
    const m = text.match(rx);
    if (m) {
      size = (m[1] || m[0] || "").trim();
      break;
    }
  }
  if (!size) {
    size = SIZES.find(
      (s) => text.includes(` ${s} `) || text.endsWith(` ${s}`) || text.startsWith(`${s} `)
    );
  }

  // BAG TYPE
  let bagType = null;
  const bagMatch = text.match(bagRegex);
  if (bagMatch) {
    bagType = bagMatch[1];
  }

  // CONDITION
  const condition = CONDITIONS.find((c) => text.includes(c));

  // CATEGORY (simple classifier)
  let category = null;
  if (text.includes("hoodie") || text.includes("sweatshirt")) category = "Hoodies & Sweatshirts";
  if (text.includes("shirt") || text.includes("tee")) category = "Shirts";
  if (text.includes("jacket") || text.includes("coat")) category = "Outerwear";
  if (text.includes("shoes") || text.includes("sneakers")) category = "Shoes";
  if (text.includes("jeans") || text.includes("pants")) category = "Pants";

  return {
    brand: brand || null,
    model: model || null,
    color: color || null,
    size: size || null,
    bagType: bagType || null,
    condition: condition || null,
    category: category || null,
    confidence: {
      brand: !!brand,
      model: model.length > 0,
      color: !!color,
      size: !!size,
      bagType: !!bagType,
      condition: !!condition,
      category: !!category,
    },
  };
}
