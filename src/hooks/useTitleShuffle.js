import { useMemo } from "react";

export function useTitleShuffle({ platform, features, brand, category, seed }) {
  return useMemo(() => {
    if (!features) return [];

    const {
      colorName,
      style,
      material,
      length,
      itemType,
      condition,
    } = features;

    const item =
      itemType ||
      category?.name ||
      "Item";

    const color = colorName ? cap(colorName) : "";
    const styleTxt = style ? cap(style) : "";
    const mat = material ? cap(material) : "";
    const len = length ? cap(length) : "";
    const brandName = brand ? cap(brand) : "";
    const cond =
      condition && !["Good"].includes(condition)
        ? `${condition} `
        : "";

    // 🍰 TITLE VARIANT BLUEPRINTS
    const base = [
      `${cond}${brandName} ${item} ${color} ${styleTxt}`,
      `${brandName} ${color} ${item}`,
      `${color} ${styleTxt} ${brandName} ${item}`,
      `${brandName} ${item} ${mat} ${color}`,
      `${brandName} ${item} ${len} ${color} (${condition || ""})`,
    ];

    const cleaned = base.map(t =>
      t.replace(/\s+/g, " ").trim()
    );

    // 🎨 PLATFORM STYLES
    const transform = {
      mercari: t => t,
      poshmark: t => poshize(t),
      ebay: t => addSEO(t, { brand: brandName, color, item, mat }),
      depop: t => addAesthetic(t),
      default: t => t
    };

    const apply = transform[platform] || transform.default;

    const variants = cleaned.map(v => apply(v));

    // 🧁 Remove dupes + trim weirdness
    return Array.from(new Set(variants)).slice(0, 5);

  }, [platform, features, brand, category, seed]);
}

// =============================
// HELPERS
// =============================

function cap(str) {
  if (!str) return "";
  return str[0].toUpperCase() + str.slice(1);
}

function poshize(title) {
  // brand-first, punchy
  return title
    .replace(/Vintage/i, "VTG")
    .trim();
}

function addSEO(title, { brand, color, item, mat }) {
  const extras = [
    brand,
    color,
    item,
    mat,
    "Authentic",
    "Fast Ship"
  ].filter(Boolean);
  return `${title} | ${extras.join(" ")}`.trim();
}

function addAesthetic(title) {
  const aesthetic = ["vintage", "minimalist", "y2k", "clean girl", "streetwear"];
  const tag = aesthetic[Math.floor(Math.random() * aesthetic.length)];
  return `${title} — ${tag}`.trim();
}
