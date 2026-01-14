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
    const { frontImage, backImage, requestId, imageHash, nameZoneCrops, scanSide } =
      body || {};
    const targetImage =
      scanSide === "back" && backImage ? backImage : frontImage;
    if (!targetImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Target image is required" }),
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
            {
              type: "input_text",
              text:
                scanSide === "back"
                  ? "Back of card for OCR."
                  : "Front of card for OCR.",
            },
            { type: "input_image", image_url: targetImage },
          ],
        },
      ],
    });

    const raw = response.output_text || "";
    const parsed = parseJsonSafe(raw);
    const lines = Array.isArray(parsed?.lines) ? parsed.lines.filter(Boolean) : [];
    let slabLabelLines = [];
    const slabLabelImage = nameZoneCrops?.slabLabel?.image || null;
    if (slabLabelImage) {
      const slabResponse = await client.responses.create({
        model: "gpt-4o-mini",
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "input_text", text: "Slab label OCR (top center)." },
              { type: "input_image", image_url: slabLabelImage },
            ],
          },
        ],
      });
      const slabRaw = slabResponse.output_text || "";
      const slabParsed = parseJsonSafe(slabRaw);
      slabLabelLines = Array.isArray(slabParsed?.lines)
        ? slabParsed.lines.filter(Boolean)
        : [];
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        requestId: requestId || null,
        imageHash: imageHash || null,
        ocrLines: lines,
        slabLabelLines,
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
