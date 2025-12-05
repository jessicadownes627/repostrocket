function normalizeTags(rawTags) {
  if (!rawTags) return [];
  if (Array.isArray(rawTags)) {
    return rawTags
      .map((t) => (t || "").toString().trim())
      .filter(Boolean);
  }
  if (typeof rawTags === "string") {
    return rawTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

function ensurePlatformVersions(raw = {}) {
  const base = typeof raw === "object" && raw !== null ? raw : {};
  const keys = ["poshmark", "mercari", "ebay", "depop", "etsy", "facebook"];
  const out = {};
  keys.forEach((key) => {
    out[key] = typeof base[key] === "object" && base[key] !== null ? base[key] : {};
  });
  return out;
}

function buildFallbackListing({ userTitle = "" } = {}) {
  const safeTitle = userTitle?.trim() || "Draft Listing";
  return {
    title: safeTitle,
    description: "",
    condition: "",
    category: "",
    brand: "",
    material: "",
    color: "",
    tags: [],
    priceRecommendation: null,
    shippingRecommendation: "",
    platformVersions: ensurePlatformVersions(),
  };
}

/**
 * generateFullListing
 *
 * @param {Object} params
 * @param {string[]} params.images - Array of image URLs or data URLs
 * @param {string} [params.userTitle] - Optional user-provided title
 * @param {string} [params.userId] - Optional user id (for logging/trace)
 * @returns {Promise<{
 *  title: string,
 *  description: string,
 *  condition: string,
 *  category: string,
 *  brand: string,
 *  material: string,
 *  color: string,
 *  tags: string[],
 *  priceRecommendation: number | null,
 *  shippingRecommendation: string,
 *  platformVersions: {
 *    poshmark: Object,
 *    mercari: Object,
 *    ebay: Object,
 *    depop: Object,
 *    etsy: Object,
 *    facebook: Object
 *  }
 * }>}
 */

export async function magicFillRequest(photos) {
  const resp = await fetch("/.netlify/functions/magicFill", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ photos }),
  });

  if (!resp.ok) {
    throw new Error(`magicFill function returned ${resp.status}`);
  }

  return resp.json();
}

export async function generateFullListing({ images = [], userTitle = "", userId } = {}) {
  try {
    const parsed = await magicFillRequest(images);

    const tags = normalizeTags(parsed.tags);

    const listing = {
      title: (parsed.title || userTitle || "Draft Listing").toString(),
      description: (parsed.description || "").toString(),
      condition: (parsed.condition || "").toString(),
      category: (parsed.category || "").toString(),
      brand: (parsed.brand || "").toString(),
      material: (parsed.material || "").toString(),
      color: (parsed.color || "").toString(),
      tags,
      priceRecommendation:
        typeof parsed.priceEstimate === "number"
          ? parsed.priceEstimate
          : typeof parsed.price === "number"
          ? parsed.price
          : null,
      shippingRecommendation: (parsed.shipping || "").toString(),
      platformVersions: ensurePlatformVersions(parsed.platformVersions),
    };

    return listing;
  } catch (err) {
    console.error("MagicFillEngine: generateFullListing failed", err);
    return buildFallbackListing({ userTitle });
  }
}

export async function magicFillMultiple(items) {
  const results = [];

  for (const photos of items || []) {
    try {
      const listing = await generateFullListing({ images: photos });
      results.push({
        photos,
        ...listing,
      });
    } catch (err) {
      console.error("MagicFillEngine: magicFillMultiple item failed", err);
    }
  }

  return results;
}
