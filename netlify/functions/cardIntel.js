import OpenAI from "openai";

const SYSTEM_PROMPT = `
You are Repost Rocket's Card Intelligence Engine.
Your job is to read the FRONT and BACK images of a sports card and extract structured data.

Rules:
1. Prefer BACK-OF-CARD text for set name, numbering, or serial info. The back is authoritative.
2. Only use brands or player names you can clearly read.
3. If unsure, leave value as "" and set confidence to "low".
4. Confidence scale: high (clear text), medium (strong inference), low (guess).
5. Return clean JSON with camelCase keys. Do not include commentary.

Output JSON:
{
  "player": "",
  "team": "",
  "sport": "",
  "year": "",
  "setName": "",
  "cardNumber": "",
  "brand": "",
  "notes": "",
  "confidence": {
    "player": "high|medium|low",
    "year": "high|medium|low",
    "setName": "high|medium|low",
    "cardNumber": "high|medium|low",
    "brand": "high|medium|low"
  },
  "sources": {
    "player": "front|back|infer",
    "year": "front|back|infer",
    "setName": "front|back|infer",
    "cardNumber": "front|back|infer",
    "brand": "front|back|infer"
  }
}

Always return valid JSON.
`;

const EMPTY_RESPONSE = {
  player: "",
  team: "",
  sport: "",
  year: "",
  setName: "",
  cardNumber: "",
  brand: "",
  notes: "",
  confidence: {
    player: "low",
    year: "low",
    setName: "low",
    cardNumber: "low",
    brand: "low",
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
    if (!frontImage && !backImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Card images required" }),
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
    console.error("Card Intel Backend Error:", err);
    return {
      statusCode: 200,
      body: JSON.stringify({ ...EMPTY_RESPONSE, error: err.message }),
    };
  }
}

function buildUserContent({ frontImage, backImage, hints, altText }) {
  const segments = [];
  if (frontImage) {
    if (altText?.front) {
      segments.push({
        type: "input_text",
        text: `Front image description: ${altText.front}`,
      });
    }
    segments.push({ type: "input_text", text: "Front of card" });
    segments.push({ type: "input_image", image_url: frontImage });
  } else {
    segments.push({ type: "input_text", text: "Front image not provided." });
  }

  if (backImage) {
    if (altText?.back) {
      segments.push({
        type: "input_text",
        text: `Back image description: ${altText.back}`,
      });
    }
    segments.push({ type: "input_text", text: "Back of card" });
    segments.push({ type: "input_image", image_url: backImage });
  } else {
    segments.push({ type: "input_text", text: "Back image not provided." });
  }

  const hintText = buildHintText(hints);
  if (hintText) {
    segments.push({
      type: "input_text",
      text: `Seller hints: ${hintText}`,
    });
  }

  return segments;
}

function buildHintText(hints = {}) {
  const parts = [];
  if (hints.title) parts.push(`Title: ${hints.title}`);
  if (hints.description) parts.push(`Description: ${hints.description}`);
  if (hints.brand) parts.push(`Brand: ${hints.brand}`);
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
    console.error("Card intel JSON parse failed:", err);
    return null;
  }
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}
