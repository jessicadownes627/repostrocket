export async function runMagicFill(text) {
  try {
    if (!text || typeof text !== "string") {
      return "";
    }

    const res = await fetch("/api/magic-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) return "";

    const data = await res.json();
    return typeof data?.filled === "string" ? data.filled : "";

  } catch (e) {
    console.error("MAGIC FILL ERROR:", e);
    return "";
  }
}
