const normalizeTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.filter(Boolean).map((t) => t.toString().trim()).filter(Boolean);
  return tags
    .toString()
    .split(/[,#]/)
    .map((t) => t.trim())
    .filter(Boolean);
};

const identityCategory = (category = "") => category;
const identityCondition = (condition = "") => condition;

export const platformTransforms = {
  mercari: {
    photoKey: "mercari",
    mapCategory: identityCategory,
    mapCondition: identityCondition,
    formatTitle: (listing = {}) => listing.title || "",
    formatDescription: (listing = {}) => listing.description || "",
    transformTags: (listing = {}) => normalizeTags(listing.tags),
    transformShipping: (listing = {}) => listing.shipping || "",
  },

  poshmark: {
    photoKey: "poshmark",
    mapCategory: (category = "") => category,
    mapCondition: (condition = "") => {
      switch ((condition || "").toLowerCase()) {
        case "new":
          return "NWT";
        case "like new":
          return "NWOT";
        case "good":
          return "Good Used Condition (GUC)";
        case "fair":
          return "Fair Used Condition";
        default:
          return condition || "";
      }
    },
    formatTitle: (listing = {}) => listing.title || "",
    formatDescription: (listing = {}) => {
      const base = listing.description || "";
      const catLine = listing.category ? `Category: ${listing.category}\n` : "";
      return `${catLine}${base}\n\n#poshstyle`.trim();
    },
    transformTags: (listing = {}) =>
      normalizeTags(listing.tags).map((t) => (t.startsWith("#") ? t : `#${t.replace(/\s+/g, "")}`)),
    transformShipping: () => "flat",
  },
};
