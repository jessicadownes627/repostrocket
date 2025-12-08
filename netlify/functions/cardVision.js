/* eslint-env node */
import fetch from "node-fetch";

export async function handler(event) {
  try {
    const { prompt, imageBase64 } = JSON.parse(event.body || "{}");

    if (!prompt || !imageBase64) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing prompt or imageBase64" }),
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY in Netlify env" }),
      };
    }

    const systemPrompt = `
You are a sports card identifier and grader.
Extract everything you can from the card. Always return ONLY a single JSON object with this exact shape:
{
  "player": "",
  "team": "",
  "sport": "",
  "year": "",
  "set": "",
  "subset": "",
  "parallel": "",
  "cardNumber": "",
  "jerseyNumber": "",
  "rarity": "",
  "grading": {
    "centering": "",
    "corners": "",
    "edges": "",
    "surface": ""
  },
  "pricing": {
    "low": "",
    "mid": "",
    "high": "",
    "confidence": "",
    "suggestedListPrice": ""
  }
}

Instructions:
- "set" should be the product line (e.g., "Prizm", "Topps Chrome", "Donruss Optic").
- "parallel" should be simple (e.g., "Silver", "Gold", "Cracked Ice") or "".
- "grading" fields are short English summaries of visual condition.
- "pricing" is a rough helper based on how valuable the card appears.
  - low/mid/high: approximate recent sale values as plain numbers (e.g., "12", "18", "26"), no $ symbol.
  - confidence: "High", "Medium", or "Low".
  - suggestedListPrice: a simple listing price as a plain number string (e.g., "19.99").

If you are unsure about any field, return an empty string for it.
Do NOT include any commentary, explanation, or extra text. JSON only.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    const resultText = data?.choices?.[0]?.message?.content || "{}";

    return {
      statusCode: 200,
      body: JSON.stringify({ result: resultText }),
    };
  } catch (err) {
    console.error("cardVision function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
