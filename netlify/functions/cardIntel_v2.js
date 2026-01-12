import OpenAI from "openai";

const SYSTEM_PROMPT = `
You extract OCR lines from sports card photos.
Return JSON only in this shape:
{
  "lines": ["LINE ONE", "LINE TWO"]
}
Rules:
- Preserve line order as they appear on the image.
- Do not add commentary or extra keys.
`;

export async function handler(event) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    const { frontImage, requestId, imageHash } = body || {};
    if (!frontImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Front image is required" }),
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-4o-mini",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "input_text", text: "Front of card for OCR." },
            { type: "input_image", image_url: frontImage },
          ],
        },
      ],
    });

    const raw = response.output_text || "";
    const parsed = parseJsonSafe(raw);
    const lines = Array.isArray(parsed?.lines) ? parsed.lines.filter(Boolean) : [];

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        requestId: requestId || null,
        imageHash: imageHash || null,
        ocrLines: lines,
      }),
    };
  } catch (err) {
    console.error("cardIntel_v2 OCR error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(stripCodeFences(text));
  } catch (err) {
    console.error("cardIntel_v2 JSON parse failed:", err);
    return null;
  }
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}
