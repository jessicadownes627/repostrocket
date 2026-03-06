import OpenAI from "openai";
import {
  enhanceDescriptionForGlow,
  enhanceTitleForGlow,
  generateGlowScore,
  glowIntentClassifier,
} from "../../src/engines/glowHelpers.js";

const SYSTEM_PROMPT = `
You are Magic Fill, a resale listing assistant.

Goal: produce a high-converting, accurate draft based ONLY on the provided structured input and (if present) the attached product photo.
Do NOT invent brand, material, model name, or measurements. If unknown, leave blank or omit.

Output ONLY JSON in this exact shape:
{
  "resale_category": "sports equipment" | "sports memorabilia" | "trading card" | "toy" | "electronics" | "clothing" | "shoes" | "bag/accessory" | "home decor" | "collectible" | "book/media" | "other",
  "object_type": "...",
  "title": "...",
  "description": "...",
  "tags": [],
  "category_choice": "Clothing" | "Home" | "Beauty" | "Accessories" | "Sports Equipment" | "Sports Cards" | "Other",
  "style_choices": [],
  "confidence": "low" | "medium" | "high",
  "debug": { "reasoning": "..." }
}

Writing rules:
- Title: concise, searchable, no hype, avoid ALL CAPS; include brand + key item + size if known.
- Description: 5–10 lines max; include condition line; include 3–6 bullet-like lines for features; if something is uncertain, do not state it.
- Tags: 8–16 short keywords; no hashtags; unique; prefer broad-to-specific; do not add brand unless provided/visible.

Classification steps (do this BEFORE writing the listing):
Step 1) Pick resale_category from the allowed list above.
Step 2) Identify object_type (plain noun phrase, e.g. "football", "trading card", "wireless headphones").
Step 3) Generate the listing using the correct tone for that category.

Quality bar:
- Avoid filler phrases like "vintage", "elegant", "statement piece", "timeless" unless explicitly supported by the input/photo.
- If the item type is unclear, set debug.confidence to "low" and keep title generic (e.g. "Item") instead of inventing a category.

Use vision_facts if provided:
- Treat vision_facts.item_type and vision_facts.visible_text as the best signals from the photo.
- If "NFL" appears in vision_facts.visible_text, include "NFL" in the title and tags.
- Set debug.photo_detected_type to vision_facts.item_type when present, otherwise "Unknown".
- Never use fashion language (wardrobe, outfit, fit, style) for sports items.

If card_intel is provided, respect the player/year/set/card_number it contains unless the user overrides it.
If apparel_intel is provided, treat itemType/brand/size/condition as authoritative hints.
`;

const VISION_FACTS_PROMPT = `
You are extracting factual listing signals from a single product photo.
Return ONLY JSON:
{
  "item_type": "",
  "visible_text": [],
  "notable_features": [],
  "confidence": "low" | "medium" | "high"
}

Rules:
- Be literal and specific (e.g. "football", "ceramic mug", "women's sneaker", "handbag").
- visible_text must include short exact strings seen in the image (e.g. "NFL"). If none, [].
- notable_features are observable (color, shape, logo present). No marketing language.
- If unsure, set confidence to low and keep fields minimal.
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
    const photoImageUrl =
      parsedBody.photoImageUrl ||
      parsedBody.photoUrl ||
      listing.photoImageUrl ||
      listing.photoUrl ||
      null;
    const requestedMode = parsedBody.magicFillMode || listing.magicFillMode || "";

    const resolvedIdentity = resolveCardIdentity(listing);
    const cardListingReady = isCardListingReady(resolvedIdentity);
    const magicFillMode = requestedMode || (cardListingReady ? "card_listing" : "discovery");

    if (magicFillMode === "card_listing") {
      const listingResult = buildCardListing(resolvedIdentity);
      listingResult.intent = "sports_resale";
      if (glowMode) {
        listingResult.glowScore = generateGlowScore(listingResult);
      }
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
      const candidate = (photoDataUrl || photoImageUrl || "").toString().trim();
      if (!candidate) return null;
      if (candidate.startsWith("data:")) return candidate;
      if (candidate.startsWith("https://") || candidate.startsWith("http://")) return candidate;
      return null;
    })();

    const forcedCategory = userCategory || "";

    const visionFacts = normalizedImageUrl
      ? await getVisionFacts(client, normalizedImageUrl)
      : null;

    const compactPayload = {
      photo_context: sanitizeField(photoContext || "Unknown item", 160),
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
      vision_facts: visionFacts,
    };

    const sportsDetection = detectSportsListing({
      userCategory: compactPayload.user_category,
      title: compactPayload.title,
      description: compactPayload.description,
      tags: compactPayload.tags,
      visionFacts,
    });

    const genericFallback = shouldUseGenericResaleFallback(visionFacts);
    if (genericFallback) {
      const genericResult = buildGenericResaleListing({ visionFacts });
      genericResult.debug = {
        ...(genericResult.debug || {}),
        imageProvided: Boolean(normalizedImageUrl),
        imageSource: normalizedImageUrl
          ? normalizedImageUrl.startsWith("data:")
            ? "data_url"
            : "url"
          : null,
        visionFacts: visionFacts || null,
      };
      if (glowMode) {
        genericResult.glowScore = generateGlowScore(genericResult);
      }
      return { statusCode: 200, body: JSON.stringify(genericResult) };
    }

    if (sportsDetection) {
      const sportsResult = buildSportsListing({
        sportsDetection,
        visionFacts,
      });

      sportsResult.debug = {
        ...(sportsResult.debug || {}),
        imageProvided: Boolean(normalizedImageUrl),
        imageSource: normalizedImageUrl
          ? normalizedImageUrl.startsWith("data:")
            ? "data_url"
            : "url"
          : null,
        visionFacts: visionFacts || null,
      };

      sportsResult.intent = "sports_resale";

      if (glowMode) {
        sportsResult.glowScore = generateGlowScore(sportsResult);
      }

      return {
        statusCode: 200,
        body: JSON.stringify(sportsResult),
      };
    }

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Input:\n${JSON.stringify(compactPayload, null, 2)}`,
            },
            ...(normalizedImageUrl
              ? [
                  {
                    type: "input_image",
                    image_url: normalizedImageUrl,
                  },
                ]
              : []),
          ],
        },
      ],
    });

    const rawText = response.output_text || "";

    const finalResult = normalizeMagicFillResult(parseJsonSafe(rawText)) || {
      ...EMPTY_RESPONSE,
    };

    finalResult.debug = {
      ...(finalResult.debug || {}),
      imageProvided: Boolean(normalizedImageUrl),
      imageSource: normalizedImageUrl
        ? normalizedImageUrl.startsWith("data:")
          ? "data_url"
          : "url"
        : null,
      visionFacts: visionFacts || null,
    };

    const glowIntent = glowIntentClassifier(JSON.stringify(finalResult));
    finalResult.intent = glowIntent;
    if (finalResult.confidence && finalResult.debug && !finalResult.debug.confidence) {
      finalResult.debug.confidence = finalResult.confidence;
    }

    if (glowMode) {
      if (finalResult.description) {
        finalResult.description = enhanceDescriptionForGlow(finalResult.description, glowIntent);
      }
      if (finalResult.title) {
        finalResult.title = enhanceTitleForGlow(finalResult.title);
      }
      finalResult.glowScore = generateGlowScore(finalResult);
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
      resale_category: obj.resale_category || obj.resaleCategory || "",
      object_type: obj.object_type || obj.objectType || "",
      title: obj.title || "",
      description: obj.description || "",
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      category_choice: obj.category_choice || null,
      style_choices: Array.isArray(obj.style_choices) ? obj.style_choices : [],
      debug: obj.debug || {},
      confidence: obj.confidence || null,
      glowScore: obj.glowScore || null,
      intent: obj.intent || null,
    };
  } catch (err) {
    try {
      const cleaned = stripCodeFences(str);
      const extracted = extractFirstJsonObject(cleaned);
      if (!extracted) return null;
      const obj = JSON.parse(extracted);
      return {
        resale_category: obj.resale_category || obj.resaleCategory || "",
        object_type: obj.object_type || obj.objectType || "",
        title: obj.title || "",
        description: obj.description || "",
        tags: Array.isArray(obj.tags) ? obj.tags : [],
        category_choice: obj.category_choice || null,
        style_choices: Array.isArray(obj.style_choices) ? obj.style_choices : [],
        debug: obj.debug || {},
        confidence: obj.confidence || null,
        glowScore: obj.glowScore || null,
        intent: obj.intent || null,
      };
    } catch (err2) {
      console.error("Magic Fill JSON parse failed:", err2);
      return null;
    }
  }
}

async function getVisionFacts(client, imageUrl) {
  const timeoutMs = 12000;
  try {
    const resp = await Promise.race([
      client.responses.create({
        model: "gpt-4o",
        input: [
          { role: "system", content: VISION_FACTS_PROMPT },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Extract factual listing signals from this photo." },
              { type: "input_image", image_url: imageUrl },
            ],
          },
        ],
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Vision facts timeout")), timeoutMs)
      ),
    ]);

    const rawText = (resp.output_text || "").trim();
    const obj = parseJsonObjectSafe(rawText);
    if (!obj) return null;
    return {
      item_type: sanitizeField(obj.item_type || "", 80),
      visible_text: Array.isArray(obj.visible_text)
        ? obj.visible_text.map((t) => sanitizeField(t, 32)).filter(Boolean).slice(0, 8)
        : [],
      notable_features: Array.isArray(obj.notable_features)
        ? obj.notable_features.map((t) => sanitizeField(t, 80)).filter(Boolean).slice(0, 8)
        : [],
      confidence:
        obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
          ? obj.confidence
          : "low",
    };
  } catch (err) {
    console.log("VISION FACTS ERROR (skipping):", err?.message || err);
    return null;
  }
}

function normalizeMagicFillResult(obj) {
  if (!obj || typeof obj !== "object") return null;
  const tags = Array.isArray(obj.tags) ? obj.tags : [];
  const confidence =
    obj.confidence === "high" || obj.confidence === "medium" || obj.confidence === "low"
      ? obj.confidence
      : (obj?.debug?.confidence === "high" ||
        obj?.debug?.confidence === "medium" ||
        obj?.debug?.confidence === "low")
      ? obj.debug.confidence
      : null;
  return {
    ...obj,
    confidence: confidence || "medium",
    title: sanitizeField(obj.title || "", 140),
    description: sanitizeField(obj.description || "", 2400),
    tags: normalizeTagList(tags),
    resale_category: sanitizeField(obj.resale_category || "", 40),
    object_type: sanitizeField(obj.object_type || "", 80),
  };
}

function normalizeTagList(tags = []) {
  const unique = new Set();
  const out = [];
  for (const raw of tags) {
    const cleaned = String(raw || "")
      .replace(/^#+/, "")
      .trim()
      .slice(0, 40);
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (unique.has(key)) continue;
    unique.add(key);
    out.push(cleaned);
    if (out.length >= 16) break;
  }
  return out;
}

function extractFirstJsonObject(str = "") {
  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return str.slice(first, last + 1);
}

function parseJsonObjectSafe(str = "") {
  if (!str) return null;
  try {
    return JSON.parse(stripCodeFences(str));
  } catch {
    const cleaned = stripCodeFences(str);
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

function detectSportsListing({ userCategory = "", title = "", description = "", tags = [], visionFacts } = {}) {
  const categoryLower = String(userCategory || "").toLowerCase();
  if (categoryLower.includes("sports cards")) return { kind: "sports_card" };

  const itemType = String(visionFacts?.item_type || "").toLowerCase();
  const visibleText = Array.isArray(visionFacts?.visible_text)
    ? visionFacts.visible_text.map((t) => String(t || "").toUpperCase())
    : [];

  const joined = [
    title,
    description,
    Array.isArray(tags) ? tags.join(" ") : "",
    itemType,
    visibleText.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  const leagueSignals = ["NFL", "NBA", "MLB", "NHL", "NCAA", "WNBA", "MLS", "FIFA"];
  const hasLeague =
    visibleText.some((t) => leagueSignals.includes(t)) ||
    leagueSignals.some((s) => joined.includes(s.toLowerCase()));

  const cardSignals = ["trading card", "sports card", "rookie card", "card"];
  const equipmentSignals = [
    "football",
    "basketball",
    "baseball",
    "soccer ball",
    "hockey puck",
    "helmet",
    "jersey",
    "cleats",
    "glove",
    "bat",
    "ball",
    "golf club",
    "tennis racket",
  ];
  const memorabiliaSignals = ["signed", "autograph", "memorabilia", "collectible", "pennant", "ticket", "program"];

  const isCard = cardSignals.some((s) => joined.includes(s));
  if (isCard && (hasLeague || joined.includes("psa") || joined.includes("bgs") || joined.includes("sgc"))) {
    return { kind: "sports_card" };
  }

  const isEquipment = equipmentSignals.some((s) => joined.includes(s));
  if (isEquipment && (hasLeague || itemType.length > 0)) {
    return { kind: "sports_equipment" };
  }

  const isMemorabilia = memorabiliaSignals.some((s) => joined.includes(s));
  if (isMemorabilia && (hasLeague || itemType.length > 0)) {
    return { kind: "sports_memorabilia" };
  }

  if (hasLeague) {
    return { kind: "sports_memorabilia" };
  }

  return null;
}

function buildSportsListing({ sportsDetection, visionFacts } = {}) {
  const kind = sportsDetection?.kind || "sports_equipment";
  const league = pickLeague(visionFacts?.visible_text);
  const rawType = String(visionFacts?.item_type || "").trim();
  const itemType = rawType || (kind === "sports_card" ? "sports trading card" : "sports item");
  const titleItem = toTitleCase(itemType);
  const title = league ? `Official ${league} ${titleItem}` : `Official ${titleItem}`;

  const leaguePhrase = league ? `${league} ` : "";
  const description = [
    `Official ${leaguePhrase}${itemType}.`,
    "Ideal for collectors, display, or game use.",
    "Shows typical wear consistent with use.",
    "Please review photos for details.",
  ].join(" ");

  const tagBase = [
    league,
    itemType,
    "sports",
    kind === "sports_card" ? "trading card" : "equipment",
    "collectible",
    "memorabilia",
  ].filter(Boolean);

  return {
    resale_category:
      kind === "sports_card"
        ? "trading card"
        : kind === "sports_memorabilia"
        ? "sports memorabilia"
        : "sports equipment",
    object_type: itemType,
    title,
    description,
    tags: normalizeTagList(tagBase),
    category_choice: kind === "sports_card" ? "Sports Cards" : "Sports Equipment",
    style_choices: [],
    confidence: visionFacts?.confidence || "medium",
    intent: "sports_resale",
    debug: {
      photo_detected_type: rawType || "Sports item",
      reasoning: `Detected ${kind} from photo signals.`,
      sports_kind: kind,
    },
  };
}

function shouldUseGenericResaleFallback(visionFacts) {
  if (!visionFacts) return true;
  const itemType = String(visionFacts.item_type || "").trim();
  const confidence = String(visionFacts.confidence || "").toLowerCase();
  if (!itemType) return true;
  if (confidence === "low") return true;
  return false;
}

function buildGenericResaleListing({ visionFacts } = {}) {
  const title = "Collectible Item";
  const description =
    "Unique collectible item in good pre-owned condition. Shows light signs of use consistent with normal handling. A great addition for collectors, display, or everyday use. Please review photos for details.";
  const tags = normalizeTagList([
    "collectible",
    "pre-owned",
    "gift",
    "display",
  ]);
  return {
    resale_category: "other",
    object_type: sanitizeField(visionFacts?.item_type || "", 80),
    title,
    description,
    tags,
    category_choice: "Other",
    style_choices: [],
    confidence: "low",
    intent: "generic_resale",
    debug: {
      photo_detected_type: visionFacts?.item_type || "Unknown",
      reasoning: "Low-confidence or unclear object type; used neutral resale fallback.",
    },
  };
}

function pickLeague(visibleText = []) {
  if (!Array.isArray(visibleText)) return "";
  const normalized = visibleText.map((t) => String(t || "").toUpperCase());
  const leagues = ["NFL", "NBA", "MLB", "NHL", "NCAA", "WNBA", "MLS", "FIFA"];
  return normalized.find((t) => leagues.includes(t)) || "";
}

function toTitleCase(str = "") {
  return String(str || "")
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ")
    .trim();
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
    category_choice: "Sports Cards",
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
