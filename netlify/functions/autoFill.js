/* eslint-env node */
/* global process */
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

const defaultResult = {
  title: "Auto-filled Listing",
  description:
    "An item worth sharing — please add any extra details before publishing.",
  category: "Clothing",
  tags: [],
  condition: "Gently used",
  material: "Unknown",
  price: 20,
};

const jsonResponse = (payload, statusCode = 200) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
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

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { photoResults } = parseBody(event);

  if (!photoResults || typeof photoResults !== "object") {
    return jsonResponse(
      { ...defaultResult, error: "Missing photo analysis." },
      400
    );
  }

  if (!process.env.VITE_OPENAI_API_KEY) {
    console.warn("autoFill: missing OpenAI API key");
    return jsonResponse(
      { ...defaultResult, error: "Auto-fill service unavailable." },
      503
    );
  }

  try {
    const response = await client.responses.create({
      model: "gpt-4.1", // ⭐ Strong & stable for structured text generation
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Generate a polished resale marketplace listing. Output strictly JSON with: title, description, category, tags[], condition, material, price. Use these detected attributes: " +
                JSON.stringify(photoResults),
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    // Structured output — clean and consistent
    const parsed =
      response?.output?.[0]?.content?.[0]?.json || {};

    return jsonResponse({
      title: parsed.title || defaultResult.title,
      description: parsed.description || defaultResult.description,
      category: parsed.category || defaultResult.category,
      tags: Array.isArray(parsed.tags) ? parsed.tags : defaultResult.tags,
      condition: parsed.condition || defaultResult.condition,
      material: parsed.material || defaultResult.material,
      price:
        typeof parsed.price === "number"
          ? parsed.price
          : defaultResult.price,
    });
  } catch (err) {
    console.error("autoFill failed:", err);
    return jsonResponse(
      { ...defaultResult, error: "Auto-fill service unavailable." },
      503
    );
  }
};
