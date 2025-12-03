/* eslint-env node */
/* global process */
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

const defaultResult = {
  category: "Clothing",
  color: "Neutral",
  material: "Unknown",
  condition: "Gently used",
  style: "Casual",
  description: "",
  tags: [],
  price: 20,
};

const jsonResponse = (payload) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const parseBody = (event) => {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
};

const extractBase64 = (value) => {
  if (!value || typeof value !== "string") return null;
  if (value.includes(",")) {
    return value.split(",")[1];
  }
  return value;
};

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { photos } = parseBody(event) || {};
  const image = Array.isArray(photos) ? photos.find(Boolean) : null;
  const base64 = extractBase64(image);

  if (!base64) {
    return jsonResponse({
      ...defaultResult,
      error: "No photo data provided",
    });
  }

  if (!process.env.VITE_OPENAI_API_KEY) {
    console.warn("❌ analyzePhotos: missing OpenAI API key");
    return jsonResponse({
      ...defaultResult,
      error: "Vision service unavailable",
    });
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1", // ⭐ supports vision
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this clothing item photo and return strictly JSON with: category, color, material, condition, style, tags[], description, priceEstimate."
            },
            {
              type: "input_image",
              b64_json: base64,
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const output = response.output[0].content[0]?.json ?? {};
    const parsed = output || {};

    return jsonResponse({
      category: parsed.category || defaultResult.category,
      color: parsed.color || defaultResult.color,
      material: parsed.material || defaultResult.material,
      condition: parsed.condition || defaultResult.condition,
      style: parsed.style || defaultResult.style,
      description: parsed.description || defaultResult.description,
      tags: Array.isArray(parsed.tags) ? parsed.tags : defaultResult.tags,
      price:
        typeof parsed.priceEstimate === "number"
          ? parsed.priceEstimate
          : defaultResult.price,
    });
  } catch (err) {
    console.error("❌ analyzePhotos failed:", err);
    return jsonResponse({
      ...defaultResult,
      error: "Vision service unavailable",
    });
  }
};
