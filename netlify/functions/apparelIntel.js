import OpenAI from "openai";

const SYSTEM_PROMPT = `
You are Repost Rocket's Baby/Kids Apparel Intelligence Engine.
Look at the uploaded photos and extract structured product data for resale listings.

Focus on:
- item type (onesie, romper, dress, shoes, pajamas, jacket, etc.)
- brand or label text
- size (both label text like "0-3M" and general sizing like "newborn")
- condition cues (new with tags, gently used, visible wear)

Rules:
- Prefer text printed on the garment tag or packaging.
- If unsure, leave the value empty and set confidence to "low".
- Confidence scale: high (clearly visible), medium (strong inference), low (guess).
- Never invent a premium brand.

Return JSON exactly in this structure:
{
  "itemType": "",
  "brand": "",
  "size": "",
  "condition": "",
  "notes": "",
  "confidence": {
    "itemType": "high|medium|low",
    "brand": "high|medium|low",
    "size": "high|medium|low",
    "condition": "high|medium|low"
  },
  "sources": {
    "itemType": "front|back|infer",
    "brand": "front|back|infer",
    "size": "front|back|infer",
    "condition": "front|back|infer"
  }
}
`;

const EMPTY_RESPONSE = {
  itemType: "",
  brand: "",
  size: "",
  condition: "",
  notes: "",
  confidence: {
    itemType: "low",
    brand: "low",
    size: "low",
    condition: "low",
  },
  sources: {},
};

export async function handler(event) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const { frontImage, backImage, hints = {}, altText = {} } = JSON.parse(event.body || "{}");
    if (!frontImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Front image is required" }),
      };
    }

    const userContent = buildUserContent({ frontImage, backImage, hints, altText });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });

    const raw = response.output_text || "";
    const parsed = parseJsonSafe(raw);

    return {
      statusCode: 200,
      body: JSON.stringify(parsed || EMPTY_RESPONSE),
    };
  } catch (err) {
    console.error("Apparel Intel Backend Error:", err);
    return {
      statusCode: 200,
      body: JSON.stringify({ ...EMPTY_RESPONSE, error: err.message }),
    };
  }
}

function buildUserContent({ frontImage, backImage, hints, altText }) {
  const segments = [];

  if (altText?.front) {
    segments.push({ type: "input_text", text: `Front image description: ${altText.front}` });
  }
  segments.push({ type: "input_text", text: "Front of garment" });
  segments.push({ type: "input_image", image_url: frontImage });

  if (backImage) {
    if (altText?.back) {
      segments.push({ type: "input_text", text: `Back image description: ${altText.back}` });
    }
    segments.push({ type: "input_text", text: "Back of garment / label" });
    segments.push({ type: "input_image", image_url: backImage });
  }

  const hintsText = buildHintsText(hints);
  if (hintsText) {
    segments.push({
      type: "input_text",
      text: `Seller hints: ${hintsText}`,
    });
  }

  return segments;
}

function buildHintsText(hints = {}) {
  const parts = [];
  if (hints.title) parts.push(`Title: ${hints.title}`);
  if (hints.description) parts.push(`Description: ${hints.description}`);
  if (hints.brand) parts.push(`Brand hint: ${hints.brand}`);
  if (hints.size) parts.push(`Size hint: ${hints.size}`);
  if (Array.isArray(hints.tags) && hints.tags.length) {
    parts.push(`Tags: ${hints.tags.join(", ")}`);
  }
  return parts.join(" | ");
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(stripCodeFences(text));
  } catch (err) {
    console.error("Apparel intel JSON parse failed:", err);
    return null;
  }
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}
