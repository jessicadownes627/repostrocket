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

async function fetchImageAsDataUrl(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch image: ${url}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const base64 = buffer.toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

export async function handler(event) {
  console.log("🔥 cardIntel_v2 HIT");
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const body = JSON.parse(event.body || "{}");
    let {
      frontImage,
      backImage,
      frontImageUrl,
      backImageUrl,
      requestId,
      imageHash,
      nameZoneCrops,
    } = body || {};
    if (!frontImage && frontImageUrl) {
      frontImage = await fetchImageAsDataUrl(frontImageUrl);
    }
    if (!backImage && backImageUrl) {
      backImage = await fetchImageAsDataUrl(backImageUrl);
    }
    if (!frontImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Front image is required" }),
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const slabLabelImage = nameZoneCrops?.slabLabel?.image || null;
    const frontRequest = client.responses.create({
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
    const backRequest = backImage
      ? client.responses.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Back of card for OCR." },
                { type: "input_image", image_url: backImage },
              ],
            },
          ],
        })
      : Promise.resolve(null);
    const slabRequest = slabLabelImage
      ? client.responses.create({
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
        })
      : Promise.resolve(null);

    const [frontResponse, backResponse, slabResponse] = await Promise.all([
      frontRequest,
      backRequest,
      slabRequest,
    ]);
    const frontRaw = frontResponse?.output_text || "";
    const frontParsed = parseJsonSafe(frontRaw);
    const lines = Array.isArray(frontParsed?.lines)
      ? frontParsed.lines.filter(Boolean)
      : [];
    const backRaw = backResponse?.output_text || "";
    const backParsed = parseJsonSafe(backRaw);
    const backOcrLines = Array.isArray(backParsed?.lines)
      ? backParsed.lines.filter(Boolean)
      : [];
    const slabRaw = slabResponse?.output_text || "";
    const slabParsed = parseJsonSafe(slabRaw);
    const slabLabelLines = Array.isArray(slabParsed?.lines)
      ? slabParsed.lines.filter(Boolean)
      : [];

    const result = {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        requestId: requestId || null,
        imageHash: imageHash || null,
        ocrLines: lines,
        slabLabelLines,
        backOcrLines,
      }),
    };
    console.log("✅ cardIntel_v2 DONE", result);
    return result;
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
