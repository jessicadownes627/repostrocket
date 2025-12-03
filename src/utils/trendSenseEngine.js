// TrendSense™ Engine
// Smart trending-entity detection for Repost Rocket
// proudly powered by Talk More Tonight's LiveWire news engine 💫

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// -----------------------------
// 1. Local Keyword Extractor
// -----------------------------
// Fast, free extraction of celebrity + brand names from headlines

function extractLocalEntities(headlines = []) {
  const entities = new Set();

  for (const h of headlines) {
    if (!h) continue;
    const text = `${h.title || ""} ${h.description || ""}`.trim();

    // Grab capitalized word sequences (names, brands, events)
    const matches = text.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g);

    if (matches) {
      for (const m of matches) {
        // Filter out generic words to reduce noise
        if (!["The", "A", "At", "On", "For", "New", "Breaking", "Update"].includes(m)) {
          entities.add(m.trim());
        }
      }
    }
  }

  return Array.from(entities);
}

// -----------------------------
// 2. OpenAI Smart Extraction (fallback)
// -----------------------------
// Called ONLY when the local extractor is empty or weird

async function extractAIEntities(headlines = []) {
  try {
    const textBlob = headlines
      .map((h) => `${h.title || ""}. ${h.description || ""}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Extract ONLY proper nouns, celebrity names, brand names, teams, movie titles, or trending entities from the text. Return them as a simple comma-separated list. No explanations.",
          },
          {
            role: "user",
            content: textBlob.slice(0, 8000),
          },
        ],
        temperature: 0.1,
      }),
    });

    const data = await response.json();
    if (!data?.choices?.[0]?.message?.content) return [];

    return data.choices[0].message.content
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  } catch (err) {
    console.error("AI extraction failed:", err);
    return [];
  }
}

// -----------------------------
// 3. Hybrid Entity Extractor
// -----------------------------
// Local first → OpenAI if needed

async function extractTrendingEntities(headlines = []) {
  // Try local parser
  const local = extractLocalEntities(headlines);

  if (local.length > 0) {
    return { entities: local, source: "local" };
  }

  // Fallback to AI
  const ai = await extractAIEntities(headlines);

  return {
    entities: ai,
    source: "ai",
  };
}

// -----------------------------
// 4. Match Items to Trending Entities
// -----------------------------
// For each listing: brand, title keywords, description keywords

function matchItemsToTrends(listings = [], entities = []) {
  const matches = [];

  for (const item of listings) {
    const haystack = (
      `${item.title || ""} ${item.description || ""} ${item.brand || ""}`.toLowerCase()
    );

    for (const entity of entities) {
      const term = entity.toLowerCase();
      if (haystack.includes(term)) {
        matches.push({
          itemId: item.id,
          title: item.title,
          matchedEntity: entity,
        });
      }
    }
  }

  return matches;
}

// -----------------------------
// 5. Main Export: TrendSense™
// -----------------------------
// Usage:
// const result = await runTrendSense(rssHeadlines, userListings)
// result.entities  → trending names found
// result.matches   → which items matched

export async function runTrendSense(headlines = [], listings = []) {
  // Step 1: Extract trending entities
  const { entities, source } = await extractTrendingEntities(headlines);

  // Step 2: Match to user items
  const matches = matchItemsToTrends(listings, entities);

  return {
    entities,
    source, // "local" or "ai"
    matches,
  };
}
