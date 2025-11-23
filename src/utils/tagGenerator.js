import { TAG_CONFIG } from "../config/platformTagSettings";

const STOPWORDS = new Set([
  "the","and","or","for","with","to","of","a","an","in","on","at","by","from","this","that","these","those","your","my","our","their","his","her","its","is","are","was","were","be","as","it","you","we","they"
]);

const MATERIALS = ["denim","leather","cotton","wool","silk","linen","nylon","poly","canvas","suede"];
const ERAS = ["y2k","90s","80s","retro","vintage"];
const GENDERS = ["women","womens","woman","men","mens","man","unisex","kids","girls","boys"];

function tokenize(text = "") {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !STOPWORDS.has(w));
}

function unique(list) {
  return Array.from(new Set(list.filter(Boolean)));
}

function detectBrand(words) {
  // naive: first capitalized word from original title/description not in stopwords
  const brand = words.find((w) => w.length > 2 && !STOPWORDS.has(w));
  return brand || "";
}

export function generatePlatformTags(listingData = {}) {
  const { title = "", description = "", category = "", condition = "" } = listingData;
  const words = tokenize(`${title} ${description} ${category} ${condition}`);
  const base = unique(words);

  const materials = MATERIALS.filter((m) => base.includes(m));
  const eras = ERAS.filter((e) => base.includes(e));
  const genders = GENDERS.filter((g) => base.includes(g));
  const brand = detectBrand(base);

  const depopTags = unique([
    ...(eras.length ? eras : ["vintage"]),
    ...base.slice(0, 6),
    ...materials,
    ...genders,
    "streetwear",
    "trending",
  ]).map((t) => `#${t.replace(/[^a-z0-9]/g, "")}`);

  const poshmarkTags = unique([
    brand ? `#${brand}` : null,
    "#poshstyle",
    "#shopmycloset",
    "#resellercommunity",
    "#fashionfinds",
    eras[0] ? `#${eras[0]}` : null,
  ]);

  const mercariKeywords = unique([
    ...base.slice(0, 8),
    ...materials,
    ...genders,
    condition,
  ]).join(", ");

  const ebayKeywords = unique([
    brand,
    ...base,
    ...materials,
    ...genders,
    condition,
    category,
    "fast shipping",
  ]).join(" ");

  const etsyTags = unique([
    "vintage",
    ...(eras.length ? eras : []),
    ...materials,
    category,
  ]);

  const kidizenTags = unique([
    "kids",
    ...genders,
    category,
    condition,
    brand,
  ]);

  const vintedTags = unique([
    ...(eras.length ? eras : ["vintage"]),
    ...materials,
    category,
    condition,
  ]);

  const grailedTags = unique([
    ...(eras.length ? eras : ["vintage"]),
    "archive",
    "streetwear",
    ...materials,
  ]).map((t) => `#${t.replace(/[^a-z0-9]/g, "")}`);

  const result = {
    depop: depopTags,
    poshmark: poshmarkTags.filter(Boolean),
    mercari: mercariKeywords,
    ebay: ebayKeywords,
    "facebook marketplace": [],
    etsy: etsyTags,
    kidizen: kidizenTags,
    vinted: vintedTags,
    grailed: grailedTags,
    shopify: ebayKeywords,
  };

  // Ensure only configured platforms exist
  return Object.fromEntries(
    Object.keys(TAG_CONFIG).map((key) => [key, result[key] ?? []])
  );
}
