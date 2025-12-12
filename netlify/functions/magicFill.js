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
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const {
      listing = {},
      userCategory = "",
      glowMode = false,
      photoContext = "",
      photoDataUrl = null,
    } = JSON.parse(event.body || "{}");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const sanitizeField = (value, limit = 200) => {
      if (!value && value !== 0) return "";
      const str = String(value);
      return str.length > limit ? `${str.slice(0, limit)}…` : str;
    };

    const normalizedImageUrl = (() => {
      if (!photoDataUrl) return null;
      if (photoDataUrl.startsWith("data:")) return photoDataUrl;
      return null;
    })();

    let visionAlt = "No alt text";

    if (normalizedImageUrl) {
      try {
        console.log("📸 Vision Prefilter: sending image_url");
        const visionResp = await client.responses.create({
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
        });

        visionAlt = (visionResp.output_text || "No alt text").trim();
        console.log("📸 Vision Prefilter ALT TEXT:", visionAlt);
      } catch (err) {
        console.log("VISION PREFILTER ERROR:", err);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "Vision prefilter failed",
            details: err.message || String(err),
          }),
        };
      }
    }

    const forcedCategory = applyApparelBias(visionAlt);

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

function stripCodeFences(str = "") {
  return str
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
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
