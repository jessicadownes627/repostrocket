/* eslint-env node */
/* global process */

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

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

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("Missing OpenAI API key (analyzePhotos)");
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Vision service unavailable." }),
    };
  }

  let body = {};
  try {
    body = JSON.parse(event.body || "{}");
  } catch {}

  const { photos } = body;
  const first = Array.isArray(photos) ? photos[0] : null;

  if (!first) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: "No photo provided" }),
    };
  }

  const base64 = first.includes(",") ? first.split(",")[1] : first;

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
              "You are an expert clothing classifier. Return JSON with: category, color, material, condition, style, tags[], description, priceEstimate.",
          },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this clothing item photo." },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
              },
            },
          ],
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
        category: parsed.category || defaultResult.category,
        color: parsed.color || defaultResult.color,
        material: parsed.material || defaultResult.material,
        condition: parsed.condition || defaultResult.condition,
        style: parsed.style || defaultResult.style,
        description: parsed.description || defaultResult.description,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        price:
          typeof parsed.priceEstimate === "number"
            ? parsed.priceEstimate
            : defaultResult.price,
      }),
    };
  } catch (err) {
    console.error("analyzePhotos failed:", err);
    return {
      statusCode: 503,
      body: JSON.stringify({ error: "Vision service unavailable." }),
    };
  }
};
