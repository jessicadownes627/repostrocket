/* eslint-env node */
/* global process */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Missing OpenAI API key (autoFill)");
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Auto-fill service unavailable." }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {}

  const { photoResults } = body;

  if (!photoResults) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing photo analysis." }),
    };
  }

  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You generate optimized resale listings. Return JSON with: title, description, category, tags[], condition, material, price.",
          },
          {
            role: "user",
            content: `Create a listing using these detected attributes: ${JSON.stringify(
              photoResults
            )}`,
          },
        ],
      }),
    });

    const data = await resp.json();

    let parsed = {};
    try {
      parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
    } catch {}

    return {
      statusCode: 200,
      body: JSON.stringify({
        title: parsed.title || "Auto-filled Listing",
        description:
          parsed.description ||
          "An item worth sharing — please add any extra details before publishing.",
        category: parsed.category || "Clothing",
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        condition: parsed.condition || "Gently used",
        material: parsed.material || "Unknown",
        price: typeof parsed.price === "number" ? parsed.price : 20,
      }),
    };
  } catch (err) {
    console.error("autoFill failed:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Auto-fill service unavailable." }),
    };
  }
};
