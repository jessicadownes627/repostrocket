export async function getMarketSnapshot({ title = "", object_type = "", tags = [] } = {}) {
  const seed =
    (title || "").trim() ||
    (object_type || "").trim() ||
    (Array.isArray(tags) && tags.length ? String(tags[0] || "").trim() : "");

  if (!seed) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch("/.netlify/functions/marketSnapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        title: (title || "").trim(),
        object_type: (object_type || "").trim(),
        tags: Array.isArray(tags) ? tags : [],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== "object") return null;
    if (typeof data.minPrice !== "number" || typeof data.maxPrice !== "number") {
      return null;
    }
    return {
      minPrice: data.minPrice,
      maxPrice: data.maxPrice,
      examples: Array.isArray(data.examples) ? data.examples : [],
    };
  } catch (err) {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

