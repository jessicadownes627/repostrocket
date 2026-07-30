export async function getMarketCompare({
  title = "",
  brand = "",
  category = "",
  tags = [],
  object_type = "",
  limit = 6,
} = {}) {
  const payload = {
    title: (title || "").trim(),
    brand: (brand || "").trim(),
    category: (category || "").trim(),
    object_type: (object_type || "").trim(),
    tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
    limit,
  };

  const seed =
    payload.title ||
    payload.brand ||
    payload.object_type ||
    payload.category ||
    payload.tags[0] ||
    "";

  if (!seed) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const response = await fetch("/.netlify/functions/marketCompare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Market Compare request failed (${response.status})`);
    }

    const data = await response.json();
    if (!data || typeof data !== "object") return null;
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}
