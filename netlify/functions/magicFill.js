import OpenAI from "openai";
import {
  enhanceDescriptionForGlow,
  enhanceTitleForGlow,
  generateGlowScore,
  glowIntentClassifier,
} from "../../src/engines/glowHelpers.js";

const SYSTEM_PROMPT = `
You are Magic Fill, a resale listing assistant.
Using the structured input, output ONLY JSON in this format:
{
  "title": "...",
  "description": "...",
  "tags": [],
  "category_choice": "Clothing" | "Home" | "Beauty" | "Accessories" | "Other",
  "style_choices": [],
  "debug": {
    "photo_detected_type": "...",
    "reasoning": "...",
    "confidence": "low" | "medium" | "high"
  }
}

Bias: when unsure, classify as Clothing. Do not invent brands or materials.
If card_intel is provided, respect the player/year/set/card_number it contains unless the user overrides it.
If apparel_intel is provided, treat itemType/brand/size/condition as authoritative hints.
`;

const VISION_PROMPT = `
Identify the object in the image.
Return only factual, observable details.
No marketing language.
No assumptions.
No adjectives.
`;

const EMPTY_RESPONSE = {
  title: "",
  description: "",
  tags: [],
  category_choice: null,
  style_choices: [],
  debug: { error: "fallback" },
};

export async function handler(event) {
  try {
    const startedAt = Date.now();
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const parsedBody = JSON.parse(event.body || "{}");
    const listing = parsedBody.listing || parsedBody || {};
    const userCategory = parsedBody.userCategory || "";
    const glowMode = parsedBody.glowMode || false;
    const photoContext = parsedBody.photoContext || "";
    const photoDataUrl = parsedBody.photoDataUrl || null;
    const requestedMode = parsedBody.magicFillMode || listing.magicFillMode || "";

    const resolvedIdentity = resolveCardIdentity(listing);
    const cardListingReady = isCardListingReady(resolvedIdentity);
    const magicFillMode = requestedMode || (cardListingReady ? "card_listing" : "discovery");

    if (magicFillMode === "card_listing") {
      const listingResult = buildCardListing(resolvedIdentity);
      return {
        statusCode: 200,
        body: JSON.stringify({
          ...listingResult,
          debug: {
            mode: "card_listing",
            confidence: "high",
          },
        }),
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const normalizedImageUrl = (() => {
      if (!photoDataUrl) return null;
      if (photoDataUrl.startsWith("data:")) return photoDataUrl;
      return null;
    })();

    let visionAlt = "No alt text";
    const timeBudgetMs = 9500;
    const visionTimeoutMs = 2500;

    if (normalizedImageUrl && Date.now() - startedAt < timeBudgetMs - 3500) {
      try {
        console.log("📸 Vision Prefilter: sending image_url");
        const visionResp = await Promise.race([
          client.responses.create({
            model: "gpt-4o",
            input: [
              {
                role: "system",
                content: VISION_PROMPT,
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_text",
                    text: "Describe this image in 1–2 sentences for product identification.",
                  },
                  {
                    type: "input_image",
                    image_url: normalizedImageUrl,
                  },
                ],
              },
            ],
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Vision prefilter timeout")), visionTimeoutMs)
          ),
        ]);

        visionAlt = (visionResp.output_text || "No alt text").trim();
        console.log("📸 Vision Prefilter ALT TEXT:", visionAlt);
      } catch (err) {
        console.log("VISION PREFILTER ERROR (skipping):", err);
        visionAlt = photoContext || "Unknown item";
      }
    }

    const hasVisionSignal =
      Boolean(visionAlt) &&
      visionAlt !== "No alt text" &&
      visionAlt !== "Unknown item";
    const forcedCategory = userCategory
      ? userCategory
      : hasVisionSignal
      ? ""
      : applyApparelBias(visionAlt);

    const compactPayload = {
      photo_context: sanitizeField(visionAlt || photoContext || "Unknown item", 160),
      user_category: userCategory || forcedCategory,
      brand: sanitizeField(listing.brand || ""),
      title: sanitizeField(listing.userTitle || listing.title || "", 160),
      description: sanitizeField(listing.userDescription || listing.description || "", 320),
      price: sanitizeField(listing.price || ""),
      size: sanitizeField(listing.size || ""),
      condition: sanitizeField(listing.condition || ""),
      tags: Array.isArray(listing.userTags || listing.tags)
        ? (listing.userTags || listing.tags).slice(0, 8).map((tag) => sanitizeField(tag, 40))
        : [],
      card_intel: normalizeCardIntel(listing.cardIntel),
      apparel_intel: normalizeApparelIntel(listing.apparelIntel),
    };

    const mainInput = `
${SYSTEM_PROMPT}

Input:
${JSON.stringify(compactPayload, null, 2)}
`;

    const response = await client.responses.create({
      model: "gpt-4o",
      input: mainInput,
    });

    const rawText = response.output_text || "";

    const finalResult = parseJsonSafe(rawText) || { ...EMPTY_RESPONSE };

    const glowIntent = glowIntentClassifier(JSON.stringify(finalResult));

    if (glowMode) {
      if (finalResult.description) {
        finalResult.description = enhanceDescriptionForGlow(finalResult.description);
      }
      if (finalResult.title) {
        finalResult.title = enhanceTitleForGlow(finalResult.title);
      }
      finalResult.glowScore = generateGlowScore(finalResult);
      finalResult.intent = glowIntent;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(finalResult),
    };
  } catch (err) {
    console.error("Magic Fill Backend Error:", err);
    return {
      statusCode: 200,
      body: JSON.stringify(EMPTY_RESPONSE),
    };
  }
}

function parseJsonSafe(str) {
  if (!str) return null;
  try {
    const obj = JSON.parse(stripCodeFences(str));
    return {
      title: obj.title || "",
      description: obj.description || "",
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      category_choice: obj.category_choice || null,
      style_choices: Array.isArray(obj.style_choices) ? obj.style_choices : [],
      debug: obj.debug || {},
      glowScore: obj.glowScore || null,
      intent: obj.intent || null,
    };
  } catch (err) {
    console.error("Magic Fill JSON parse failed:", err);
    return null;
  }
}

function normalizeCardIntel(intel) {
  if (!intel || typeof intel !== "object") return null;
  return {
    player: sanitizeField(intel.player || "", 80),
    team: sanitizeField(intel.team || "", 80),
    sport: sanitizeField(intel.sport || "", 40),
    year: sanitizeField(intel.year || "", 12),
    set: sanitizeField(intel.setName || intel.set || "", 120),
    card_number: sanitizeField(intel.cardNumber || "", 24),
    brand: sanitizeField(intel.brand || "", 80),
    grader: sanitizeField(intel.grader || "", 40),
    grade: sanitizeField(intel.grade || "", 12),
    isSlabbed: Boolean(intel.isSlabbed),
  };
}

function normalizeApparelIntel(intel) {
  if (!intel || typeof intel !== "object") return null;
  return {
    item_type: sanitizeField(intel.itemType || "", 80),
    brand: sanitizeField(intel.brand || "", 80),
    size: sanitizeField(intel.size || "", 40),
    condition: sanitizeField(intel.condition || "", 80),
    notes: sanitizeField(intel.notes || "", 120),
  };
}

function resolveCardIdentity(listing = {}) {
  const fromCardIntel = normalizeCardIntel(listing.cardIntel || listing.card_intel);
  const fromReview = listing.reviewIdentity || listing.cardIdentity || null;
  const identity = {
    player: fromCardIntel?.player || fromReview?.player || "",
    team: fromCardIntel?.team || fromReview?.team || "",
    sport: fromCardIntel?.sport || fromReview?.sport || "",
    year: fromCardIntel?.year || fromReview?.year || "",
    setName: fromCardIntel?.set || fromReview?.setName || "",
    brand: fromCardIntel?.brand || fromReview?.brand || "",
    cardNumber: fromCardIntel?.card_number || fromReview?.cardNumber || "",
    grader: fromCardIntel?.grader || fromReview?.grader || "",
    grade: fromCardIntel?.grade || fromReview?.grade || "",
    isSlabbed: Boolean(fromCardIntel?.isSlabbed || fromReview?.isSlabbed),
  };
  return identity;
}

function isCardListingReady(identity = {}) {
  if (!identity.player) return false;
  const hasCore = Boolean(
    identity.year || identity.setName || identity.brand
  );
  const hasContext = Boolean(identity.team || identity.sport);
  return hasCore && hasContext;
}

function buildCardListing(identity = {}) {
  const year = identity.year ? String(identity.year).trim() : "";
  const brand = identity.brand ? String(identity.brand).trim() : "";
  const setName = identity.setName ? String(identity.setName).trim() : "";
  const player = identity.player ? String(identity.player).trim() : "";
  const team = identity.team ? String(identity.team).trim() : "";
  const sport = identity.sport ? String(identity.sport).trim() : "";
  const cardNumber = identity.cardNumber
    ? String(identity.cardNumber).trim()
    : "";

  const titleParts = [year, brand, setName, player].filter(Boolean);
  let title = titleParts.join(" ");
  if (cardNumber) {
    title = title ? `${title} #${cardNumber}` : `#${cardNumber}`;
  }
  if (team) {
    title = title ? `${title} – ${team}` : team;
  }

  const baseLineParts = [year, brand, setName, player, sport]
    .filter(Boolean)
    .join(" ");
  let description = baseLineParts
    ? `${baseLineParts} card${team ? ` featuring the ${team}` : ""}.`
    : "";
  if (brand) {
    description += description ? `\n\nOfficial ${brand} issue.` : `Official ${brand} issue.`;
  }
  const conditionLine = identity.isSlabbed || identity.grade || identity.grader
    ? "Condition graded. Please review images for details."
    : "Condition ungraded. Please review images for details.";
  description += description ? `\n\n${conditionLine}` : conditionLine;

  return {
    title,
    description,
    tags: [],
    category_choice: "Other",
    style_choices: [],
  };
}

function stripCodeFences(str = "") {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function sanitizeField(value, limit = 200) {
  if (!value && value !== 0) return "";
  const str = String(value);
  return str.length > limit ? `${str.slice(0, limit)}…` : str;
}
function applyApparelBias(visionAlt = "") {
  const fabricSignals = [
    "fabric",
    "knit",
    "ribbed",
    "soft",
    "folded",
    "sweater",
    "cotton",
    "fleece",
    "textile",
    "seam",
    "hem",
    "cuff",
  ];

  const decorSignals = [
    "ceramic",
    "glass",
    "hard",
    "rigid",
    "vase",
    "bottle",
    "container",
    "home decor",
  ];

  const visionLower = visionAlt.toLowerCase();
  const fabricMatch = fabricSignals.some((s) => visionLower.includes(s));
  const decorMatch = decorSignals.some((s) => visionLower.includes(s));

  if (fabricMatch && !decorMatch) return "Clothing";
  if (fabricMatch && decorMatch) return "Clothing";
  if (!fabricMatch && !decorMatch) return "Clothing";

  return "Home";
}
