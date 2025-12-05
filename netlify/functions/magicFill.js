/* eslint-env node */
import OpenAI from "openai";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Missing OpenAI API key" }),
    };
  }

  const client = new OpenAI({ apiKey });

  let body = {};
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  const { photos } = body;
  if (!photos || !photos.length) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "No photos provided" }),
    };
  }

  const base64 = photos[0].split(",")[1];

  try {
    const resp = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are an expert clothing classifier. Return JSON with: title, description, category, color, material, condition, style, tags[], size, brand, shipping, priceEstimate.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze this clothing item." },
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64}` },
            },
          ],
        },
      ],
    });

    const parsed = JSON.parse(
      resp.choices?.[0]?.message?.content || "{}"
    );

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error("MagicFill error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "OpenAI request failed" }),
    };
  }
}

