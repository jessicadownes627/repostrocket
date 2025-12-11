import OpenAI from "openai";

function cleanSentence(str = "") {
  return str
    .replace(/\s+/g, " ")
    .replace(/ ,/g, ",")
    .replace(/ \./g, ".")
    .trim();
}

function cleanParagraph(str = "") {
  return cleanSentence(
    str
      .replace(/\n+/g, " ")
      .replace(/\s\s+/g, " ")
      .trim()
  );
}

function fallbackTitle({ brand, category, size }) {
  return (
    cleanSentence([brand, category, size].filter(Boolean).join(" · ")) ||
    "Quality Item — Ready to Ship"
  );
}

function buildKeywords({ category, brand, size }) {
  const words = [];
  if (brand) words.push(brand);
  if (category) words.push(category);
  if (size) words.push(size);
  words.push("quality", "verified", "seller", "ship fast");
  return words;
}

function smartPrice({ price, condition }) {
  const base = Number(price);
  if (!base || isNaN(base)) return "";

  let adj = base;

  switch (condition?.toLowerCase()) {
    case "new":
      adj = base + 5;
      break;
    case "like new":
      adj = base + 2;
      break;
    case "fair":
      adj = base - 2;
      break;
  }

  return adj.toString();
}

function normalizeListing(listing = {}) {
  const {
    title = "",
    description = "",
    price = "",
    category = "",
    condition = "",
    size = "",
    brand = "",
    tags = [],
    photos = [],
  } = listing;

  return {
    title: title?.trim() || "",
    description: description?.trim() || "",
    price: price?.toString().trim() || "",
    category: category?.trim() || "",
    condition: condition?.trim() || "",
    size: size?.trim() || "",
    brand: brand?.trim() || "",
    tags: Array.isArray(tags) ? tags : [],
    photos: Array.isArray(photos) ? photos : [],
  };
}

function buildPrompt(listing, photoUrl) {
  const keywords = buildKeywords(listing);
  const fallback = fallbackTitle(listing);

  return `You are Repost Rocket's Magic Fill model. Rewrite the listing data with concise, luxurious resale copy.

Current listing data:
Title: ${listing.title || fallback}
Description: ${listing.description || "N/A"}
Brand: ${listing.brand || "N/A"}
Category: ${listing.category || "N/A"}
Condition: ${listing.condition || "N/A"}
Size: ${listing.size || "N/A"}
Tags: ${listing.tags.join(", ") || "N/A"}
Primary keywords: ${keywords.join(", ")}
Here is the main product photo: ${photoUrl || "Not provided"}

Return JSON with fields: title, description, price, tags.`;
}

function parseModelResponse(text = "") {
  try {
    const parsed = JSON.parse(text);
    return {
      title: parsed.title ? cleanSentence(parsed.title) : "",
      description: parsed.description ? cleanParagraph(parsed.description) : "",
      price: parsed.price ? parsed.price.toString().trim() : "",
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t) => cleanSentence(t)).filter(Boolean).slice(0, 12)
        : [],
    };
  } catch (err) {
    return null;
  }
}

export async function handler(event) {
  try {
    const listing = normalizeListing(JSON.parse(event.body || "{}"));
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const photoUrl = Array.isArray(listing.photos) ? listing.photos[0] : "";

    const prompt = buildPrompt(listing, photoUrl);

    const completion = await client.responses.create({
      model: "gpt-4.1-mini",
      input: `### Prompt\n${prompt}\n\n### Output Format\n{\n  "title": "...",
  "description": "...",
  "price": "...",
  "tags": ["...", "..."]
}`,
    });

    const rawOutput = completion.output?.[0]?.content?.[0]?.text || "";
    const suggestion =
      parseModelResponse(rawOutput) || {
        title: fallbackTitle(listing),
        description:
          cleanParagraph(listing.description) ||
          "Item is in good condition and ready to ship.",
        price: smartPrice({ price: listing.price, condition: listing.condition }),
        tags: buildKeywords(listing).slice(0, 5),
      };

    return {
      statusCode: 200,
      body: JSON.stringify(suggestion),
    };
  } catch (err) {
    console.error("Magic Fill function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
