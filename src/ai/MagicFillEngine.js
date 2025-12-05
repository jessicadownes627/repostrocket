import OpenAI from "openai";

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

let client = null;

function getClient() {
  if (!apiKey) {
    console.warn("MagicFillEngine: Missing OpenAI API key (VITE_OPENAI_API_KEY).");
    return null;
  }
  if (client) return client;
  client = new OpenAI({
    apiKey,
    dangerouslyAllowBrowser: true,
  });
  return client;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter(Boolean)
    .slice(0, 4)
    .map((url) => {
      if (typeof url !== "string") return null;
      const trimmed = url.trim();
      if (!trimmed) return null;
      // Accept both remote URLs and data URLs
      if (trimmed.startsWith("data:") || trimmed.startsWith("http")) {
        return trimmed;
      }
      return trimmed;
    })
    .filter(Boolean);
}

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
export async function generateFullListing({ images = [], userTitle = "", userId } = {}) {
  const client = getClient();
  const normalizedImages = normalizeImages(images);

  if (!client) {
    return buildFallbackListing({ userTitle });
  }

  const hasImages = normalizedImages.length > 0;

  const imageParts = hasImages
    ? normalizedImages.map((url) => ({
        type: "image_url",
        image_url: {
          url,
          detail: "high",
        },
      }))
    : [];

  const promptLines = [
    "You are MagicFillEngine, an expert multi-platform resale listing generator for clothing and lifestyle items.",
    "",
    "Given the photos (and optional user title), produce a single JSON object with the following shape:",
    "{",
    '  "title": string,',
    '  "description": string,',
    '  "condition": string,',
    '  "category": string,',
    '  "brand": string,',
    '  "material": string,',
    '  "color": string,',
    '  "tags": string[],',
    '  "priceRecommendation": number,',
    '  "shippingRecommendation": string,',
    '  "platformVersions": {',
    '    "poshmark": object,',
    '    "mercari": object,',
    '    "ebay": object,',
    '    "depop": object,',
    '    "etsy": object,',
    '    "facebook": object',
    "  }",
    "}",
    "",
    "Platform versions can include small tweaks to title/description/hashtags or shipping/price notes that match each marketplace.",
    "If you are unsure about a field, provide your best guess rather than leaving it blank.",
  ];

  if (userTitle?.trim()) {
    promptLines.push("", `User-provided working title: "${userTitle.trim()}"`);
  }

  if (!hasImages) {
    promptLines.push("", "No photos are available. Infer as much as you can from the title alone.");
  }

  const promptText = promptLines.join("\n");

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You generate optimized resale listings for multiple marketplaces. Always respond with a single valid JSON object and no extra commentary.",
        },
        {
          role: "user",
          content: hasImages
            ? [
                { type: "text", text: promptText },
                ...imageParts,
              ]
            : [{ type: "text", text: promptText }],
        },
      ],
    });

    const rawContent = response?.choices?.[0]?.message?.content || "";
    let parsed = {};
    try {
      parsed = rawContent ? JSON.parse(rawContent) : {};
    } catch (err) {
      console.warn("MagicFillEngine: failed to parse JSON response; falling back.", err);
      return buildFallbackListing({ userTitle });
    }

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
        typeof parsed.priceRecommendation === "number"
          ? parsed.priceRecommendation
          : typeof parsed.price === "number"
          ? parsed.price
          : null,
      shippingRecommendation: (parsed.shippingRecommendation || "").toString(),
      platformVersions: ensurePlatformVersions(parsed.platformVersions),
    };

    return listing;
  } catch (err) {
    console.error("MagicFillEngine: generateFullListing failed", err);
    return buildFallbackListing({ userTitle });
  }
}

