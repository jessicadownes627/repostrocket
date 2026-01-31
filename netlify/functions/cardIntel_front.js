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
      return buildResponse(500, {
        status: "error",
        error: "Missing OPENAI_API_KEY",
      });
    }

    const body = safeJsonParse(event.body || "{}") || {};
    const { frontImage, requestId, imageHash } = body || {};
    if (!frontImage) {
      return buildResponse(400, {
        status: "error",
        error: "Front image is required",
        requestId: requestId || null,
        imageHash: imageHash || null,
      });
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

    return buildResponse(200, {
      status: "ok",
      requestId: requestId || null,
      imageHash: imageHash || null,
      ocrLines: lines,
    });
  } catch (err) {
    console.error("cardIntel_front OCR error:", err);
    return buildResponse(500, {
      status: "error",
      error: err?.message || "Unknown error",
    });
  }
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(stripCodeFences(text));
  } catch (err) {
    console.error("cardIntel_front JSON parse failed:", err);
    return null;
  }
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("cardIntel_front request JSON parse failed:", err);
    return null;
  }
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function buildResponse(statusCode, payload) {
  let body = "";
  try {
    body = JSON.stringify(payload || {});
  } catch (err) {
    body = JSON.stringify({ status: "error", error: "Response serialization failed" });
  }
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body,
  };
}
