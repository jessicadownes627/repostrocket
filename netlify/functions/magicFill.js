import OpenAI from "openai";
import {
  enhanceDescriptionForGlow,
  enhanceTitleForGlow,
  generateGlowScore,
  glowIntentClassifier,
} from "../../src/engines/glowHelpers.js";

const SYSTEM_PROMPT = `
You are Magic Fill, an expert multimodal resale assistant.

Your job is to:
1. Identify what the photo contains.
2. Strongly prefer clothing/apparel when the item shows:
   - folds, seams, soft texture,
   - ribbing, cuffs, hems,
   - sleeves, straps, collars, waistbands,
   - knit patterns or sweater-like bulk.
3. Only classify as home decor / objects when:
   - the shape is rigid or structural,
   - there are hard edges, ceramic/metallic reflections,
   - the object has no fabric-like characteristics.

If unsure: default to CLOTHING, not home goods.

Return ONLY the structured JSON format below.

### RULES:
- If an item could be either apparel or decor, you MUST select apparel.
- If the image is unclear, return a *soft apparel guess* such as "folded knit fabric (likely a sweater)".
- Never return brands unless provided by the user.
- Keep tags generic and resale-safe.
- Avoid hallucinating specific materials unless visually obvious.

### OUTPUT JSON:
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

    const normalizedImageUrl = (() => {
      if (!photoDataUrl) return null;
      if (photoDataUrl.startsWith("data:")) return photoDataUrl;
      return null;
    })();

    let visionAlt = "No alt text";

    if (normalizedImageUrl) {
      try {
        console.log("📸 Vision Prefilter: sending image_url");
        const visionInput = `
Describe this image in 1–2 sentences for product identification.

<image>
${normalizedImageUrl}
</image>
`;

        const visionResp = await client.responses.create({
          model: "gpt-4o-mini",
          input: visionInput,
        });

        visionAlt = (visionResp.output_text || "No alt text").trim();
        console.log("📸 Vision Prefilter ALT TEXT:", visionAlt);
      } catch (err) {
        console.log("VISION PREFILTER ERROR:", err);
      }
    }

    const forcedCategory = applyApparelBias(visionAlt);

    const listingSnapshot = {
      ...listing,
      photoContext: photoContext || visionAlt,
      userCategory: userCategory || forcedCategory,
    };

    const photoSection = normalizedImageUrl
      ? `<image>\n${normalizedImageUrl}\n</image>`
      : "No photo provided";

    const mainInput = `
${SYSTEM_PROMPT}

User listing data:
${JSON.stringify(listingSnapshot, null, 2)}

Photo:
${photoSection}
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
    const obj = JSON.parse(str);
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
