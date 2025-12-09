// Lightweight text classifiers for TrendSense search

const CATEGORY_KEYWORDS = [
  { key: "shoe", category: "Shoes" },
  { key: "sneaker", category: "Shoes" },
  { key: "boots", category: "Shoes" },
  { key: "hoodie", category: "Tops" },
  { key: "sweatshirt", category: "Tops" },
  { key: "jacket", category: "Outerwear" },
  { key: "coat", category: "Outerwear" },
  { key: "bag", category: "Handbags" },
  { key: "purse", category: "Handbags" },
  { key: "tote", category: "Handbags" },
  { key: "card", category: "Sports Cards" },
  { key: "rc", category: "Sports Cards" },
  { key: "rookie", category: "Sports Cards" },
  { key: "toy", category: "Toys & Games" },
  { key: "doll", category: "Toys & Games" },
];

const BRAND_KEYWORDS = [
  "nike",
  "adidas",
  "lululemon",
  "ugg",
  "coach",
  "gucci",
  "prada",
  "yeezy",
  "jordan",
  "stanley",
  "yeti",
];

export function getCategoryFromText(text = "") {
  const lower = text.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (lower.includes(entry.key)) {
      return entry.category;
    }
  }
  return "General Merchandise";
}

export function getBrandFromText(text = "") {
  const lower = text.toLowerCase();
  for (const b of BRAND_KEYWORDS) {
    if (lower.includes(b)) {
      // Capitalize simple brands
      return b
        .split(" ")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
    }
  }
  return "";
}

export function getTagsFromText(text = "") {
  const parts = text
    .toLowerCase()
    .split(/[\s,]+/)
    .filter((w) => w.length > 2);

  const unique = Array.from(new Set(parts));

  return unique.map((keyword) => ({
    keyword,
    score: 1,
  }));
}

