export async function runAIReview(listing) {
  try {
    if (!listing || typeof listing !== "object") {
      return { summary: "No listing data provided.", score: null, tips: [] };
    }

    const safeListing = JSON.parse(JSON.stringify(listing));

    const res = await fetch("/api/ai-review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(safeListing),
    });

    if (!res.ok) {
      return { summary: "Review unavailable right now.", score: null, tips: [] };
    }

    const data = await res.json();

    return {
      summary: data?.summary || "No summary available.",
      score: typeof data?.score === "number" ? data.score : null,
      tips: Array.isArray(data?.tips) ? data.tips : [],
    };

  } catch (err) {
    console.error("AI REVIEW ERROR:", err);
    return { summary: "Unable to run AI review.", score: null, tips: [] };
  }
}
