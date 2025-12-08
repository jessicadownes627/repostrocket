// --- PLATFORM TRANSFORMS ---

export function transformForEbay(base) {
  if (!base) return base;
  return {
    title: base.title,
    description: base.description,
    specifics: base.specifics,
  };
}

export function transformForWhatnot(base) {
  if (!base) return base;

  const rawTitle = String(base.title || "");

  // Shorter title
  const shortTitle = rawTitle
    .replace(/#/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .split(" ")
    .slice(0, 8)
    .join(" ")
    .trim();

  // Hashtags for hype
  const hashtags = [
    "#rookie",
    "#breaks",
    "#hobby",
    "#psa10",
    "#graded",
    "#collectibles",
    "#whatnot",
  ];

  return {
    title: shortTitle ? `${shortTitle} 🔥` : rawTitle,
    description: `${base.description || ""}\n\n${hashtags.join(" ")}`.trim(),
    specifics: null,
  };
}

export function transformForMercari(base) {
  if (!base) return base;

  const rawTitle = String(base.title || "");

  return {
    title: rawTitle.split(" ").slice(0, 10).join(" ").trim(),
    description: `${base.description || ""}\n\nShips fast from smoke-free home.`.trim(),
    specifics: null,
  };
}

