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

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Missing OpenAI API key (aiReview)");
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "AI Review service unavailable." }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {}

  const { listing } = body;

  if (!listing) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing listing data." }),
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
              "You improve resale listings. Return JSON with: betterTitle, betterDescription, betterTags[], price.",
          },
          {
            role: "user",
            content: `Optimize this listing: ${JSON.stringify(listing)}`,
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
        betterTitle: parsed.betterTitle || "",
        betterDescription: parsed.betterDescription || "",
        betterTags: Array.isArray(parsed.betterTags) ? parsed.betterTags : [],
        price: typeof parsed.price === "number" ? parsed.price : null,
      }),
    };
  } catch (err) {
    console.error("aiReview failed:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "AI Review service unavailable." }),
    };
  }
};
