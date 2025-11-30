export async function runAutoFill(seed) {
  try {
    if (!seed) return {};
    const res = await fetch("/api/auto-fill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed }),
    });

    if (!res.ok) return {};

    const data = await res.json();

    return {
      title: typeof data?.title === "string" ? data.title : "",
      description: typeof data?.description === "string" ? data.description : "",
      tags: Array.isArray(data?.tags) ? data.tags : [],
      conditionNotes:
        typeof data?.conditionNotes === "string" ? data.conditionNotes : "",
      shipping:
        typeof data?.shipping === "string"
          ? data.shipping
          : "Standard shipping recommended.",
    };

  } catch (e) {
    console.error("AUTO FILL ERROR:", e);
    return {};
  }
}
