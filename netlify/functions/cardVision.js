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

