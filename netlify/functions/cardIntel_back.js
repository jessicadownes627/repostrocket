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
    const { backImage, requestId, imageHash, nameZoneCrops, backNameZoneCrops } =
      body || {};
    if (!backImage && !nameZoneCrops?.slabLabel?.image) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Back or slab label image is required" }),
      };
    }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("cardIntel_back start", {
      hasBackImage: Boolean(backImage),
      hasSlabLabel: Boolean(nameZoneCrops?.slabLabel?.image),
      requestId: requestId || null,
    });
    const slabLabelImage = nameZoneCrops?.slabLabel?.image || null;
    const footerImage = backNameZoneCrops?.bottomCenter?.image || null;
    const footerLeftImage = backNameZoneCrops?.bottomLeft?.image || null;

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

    const footerRequest = footerImage
      ? client.responses.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Back footer metadata OCR." },
                { type: "input_image", image_url: footerImage },
              ],
            },
          ],
        })
      : Promise.resolve(null);
    const footerLeftRequest = footerLeftImage
      ? client.responses.create({
          model: "gpt-4o-mini",
          input: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "input_text", text: "Back footer left metadata OCR." },
                { type: "input_image", image_url: footerLeftImage },
              ],
            },
          ],
        })
      : Promise.resolve(null);

    const [backResponse, slabResponse, footerResponse, footerLeftResponse] =
      await Promise.all([
      backRequest,
      slabRequest,
      footerRequest,
      footerLeftRequest,
    ]);

    const backRaw = backResponse?.output_text || "";
    const backParsed = parseJsonSafe(backRaw);
    const backOcrLines = extractLinesFromParsed(backParsed);

    const slabRaw = slabResponse?.output_text || "";
    const slabParsed = parseJsonSafe(slabRaw);
    const slabLabelLines = extractLinesFromParsed(slabParsed);

    const footerRaw = footerResponse?.output_text || "";
    const footerParsed = parseJsonSafe(footerRaw);
    const footerLines = extractLinesFromParsed(footerParsed);
    const footerLeftRaw = footerLeftResponse?.output_text || "";
    const footerLeftParsed = parseJsonSafe(footerLeftRaw);
    const footerLeftLines = extractLinesFromParsed(footerLeftParsed);
    const combinedBackLines = Array.from(
      new Set(
        [...backOcrLines, ...footerLines, ...footerLeftLines].filter(Boolean)
      )
    );

    console.log("cardIntel_back parsed", {
      backLineCount: combinedBackLines.length,
      slabLineCount: slabLabelLines.length,
      requestId: requestId || null,
    });
    return {
      statusCode: 200,
      body: JSON.stringify({
        status: "ok",
        requestId: requestId || null,
        imageHash: imageHash || null,
        backOcrLines: combinedBackLines,
        slabLabelLines,
      }),
    };
  } catch (err) {
    console.error("cardIntel_back OCR error:", {
      message: err?.message,
      status: err?.status,
      code: err?.code,
    });
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

function parseJsonSafe(text) {
  if (!text) return null;
  const cleaned = stripCodeFences(text);
  const parsed = tryParseJson(cleaned);
  if (parsed) return parsed;
  const objectMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    const objectParsed = tryParseJson(objectMatch[0]);
    if (objectParsed) return objectParsed;
  }
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const arrayParsed = tryParseJson(arrayMatch[0]);
    if (arrayParsed) return { lines: arrayParsed };
  }
  console.error("cardIntel_back JSON parse failed:", cleaned.slice(0, 200));
  return null;
}

function tryParseJson(text) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

function extractLinesFromParsed(parsed) {
  if (!parsed) return [];
  if (Array.isArray(parsed?.lines)) {
    return parsed.lines.filter(Boolean);
  }
  if (Array.isArray(parsed)) {
    return parsed.filter(Boolean);
  }
  return [];
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}
