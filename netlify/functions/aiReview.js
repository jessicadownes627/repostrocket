/* eslint-env node */
/* global process */
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.VITE_OPENAI_API_KEY,
});

const defaultResult = {
  betterTitle: "",
  betterDescription: "",
  betterTags: [],
  price: null,
};

const jsonResponse = (payload, statusCode = 200) => ({
  statusCode,
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

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const { listing = {} } = parseBody(event);

  if (!listing || typeof listing !== "object") {
    return jsonResponse(
      {
        ...defaultResult,
        error: "Missing listing data.",
      },
      400
    );
  }

  if (!process.env.VITE_OPENAI_API_KEY) {
    console.warn("aiReview: missing OpenAI API key");
    return jsonResponse(
      {
        ...defaultResult,
        error: "AI Review service unavailable.",
      },
      503
    );
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You improve resale listings. Output JSON with: betterTitle, betterDescription, betterTags[].",
        },
        {
          role: "user",
          content: `Optimize this listing: ${JSON.stringify(listing)}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = response.choices?.[0]?.message?.content;
    let parsed = {};
    if (typeof content === "string") {
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = {};
      }
    }

    return jsonResponse(
      {
        betterTitle: parsed.betterTitle || defaultResult.betterTitle,
        betterDescription: parsed.betterDescription || defaultResult.betterDescription,
        betterTags: Array.isArray(parsed.betterTags) ? parsed.betterTags : defaultResult.betterTags,
        price: typeof parsed.price === "number" ? parsed.price : defaultResult.price,
      }
    );
  } catch (err) {
    console.error("aiReview failed:", err);
    return jsonResponse(
      {
        ...defaultResult,
        error: "AI Review service unavailable.",
      },
      503
    );
  }
};
