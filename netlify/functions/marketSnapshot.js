import OpenAI from "openai";

const EMPTY = null;

const SYSTEM_PROMPT = `
You generate an informational "Market Snapshot" for resale items.
You are NOT guaranteeing prices. Provide a cautious typical sold range.

Return JSON only in this exact schema:
{
  "min_price": number,
  "max_price": number,
  "example_prices": [number, number, number]
}

Rules:
- Use USD numbers only (no currency symbols).
- min_price must be <= max_price.
- example_prices must be 3 numbers within [min_price, max_price] when possible.
- If the input is too vague, choose a broad but reasonable range and set examples accordingly.
`;

function stripCodeFences(str = "") {
  return String(str || "")
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function extractFirstJsonObject(str = "") {
  const first = str.indexOf("{");
  const last = str.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return "";
  return str.slice(first, last + 1);
}

function parseJsonObjectSafe(str = "") {
  const cleaned = stripCodeFences(str);
  try {
    return JSON.parse(cleaned);
  } catch {
    const extracted = extractFirstJsonObject(cleaned);
    if (!extracted) return null;
    try {
      return JSON.parse(extracted);
    } catch {
      return null;
    }
  }
}

function clampNumber(value, min, max) {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.min(max, Math.max(min, num));
}

function normalizeResult(obj) {
  if (!obj || typeof obj !== "object") return null;
  let minPrice = clampNumber(obj.min_price, 0, 100000);
  let maxPrice = clampNumber(obj.max_price, 0, 100000);
  if (minPrice === null || maxPrice === null) return null;
  if (minPrice > maxPrice) {
    const tmp = minPrice;
    minPrice = maxPrice;
    maxPrice = tmp;
  }
  const examplesRaw = Array.isArray(obj.example_prices) ? obj.example_prices : [];
  const examples = examplesRaw
    .map((n) => clampNumber(n, 0, 100000))
    .filter((n) => n !== null)
    .slice(0, 3);

  while (examples.length < 3) {
    const mid = Math.round(((minPrice + maxPrice) / 2) * 100) / 100;
    examples.push(mid);
  }

  const normalizedExamples = examples
    .map((n) => clampNumber(n, minPrice, maxPrice))
    .filter((n) => n !== null)
    .slice(0, 3);

  return { minPrice, maxPrice, examples: normalizedExamples };
}

function sanitizeField(value, limit = 200) {
  if (!value && value !== 0) return "";
  const str = String(value);
  return str.length > limit ? `${str.slice(0, limit)}…` : str;
}

export async function handler(event) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const parsedBody = JSON.parse(event.body || "{}");
    const title = sanitizeField(parsedBody.title || "", 160);
    const objectType = sanitizeField(parsedBody.object_type || parsedBody.objectType || "", 80);
    const tags = Array.isArray(parsedBody.tags) ? parsedBody.tags.slice(0, 8) : [];

    const seed = title || objectType || (tags[0] || "");
    if (!seed) {
      return { statusCode: 200, body: JSON.stringify(EMPTY) };
    }

    const query = `recent sold price ${seed}`.trim();

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const input = [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Context:\n${JSON.stringify(
          {
            title,
            object_type: objectType,
            tags,
            query,
          },
          null,
          2
        )}`,
      },
    ];

    const resp = await client.responses.create({
      model: "gpt-4o-mini",
      input,
    });

    const rawText = resp.output_text || "";
    const obj = parseJsonObjectSafe(rawText);
    const normalized = normalizeResult(obj);

    return {
      statusCode: 200,
      body: JSON.stringify(normalized || EMPTY),
    };
  } catch (err) {
    console.error("Market Snapshot Backend Error:", err);
    return {
      statusCode: 200,
      body: JSON.stringify(EMPTY),
    };
  }
}

