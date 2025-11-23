export async function mockAnalyzePhotos(photos = []) {
  // Simple heuristic: use filename hints if any
  const first = photos[0] || "";
  const hint = typeof first === "string" ? first.toLowerCase() : "";
  const isDenim = hint.includes("denim") || hint.includes("jean");
  const isJacket = hint.includes("jacket") || hint.includes("coat");
  const isDress = hint.includes("dress");

  const category = isJacket ? "Outerwear" : isDress ? "Dresses" : isDenim ? "Denim" : "Tops";
  const condition = hint.includes("new") ? "New" : "Gently used";
  const color = hint.includes("black") ? "Black" : hint.includes("blue") ? "Blue" : "Neutral";
  const style = isJacket ? "Streetwear" : isDress ? "Casual" : "Everyday";
  const material = isDenim ? "Denim" : "Cotton";

  const description = `AI guess: ${condition} ${color} ${material} ${category.toLowerCase()} with ${style.toLowerCase()} vibes.`;

  return {
    category,
    condition,
    color,
    style,
    material,
    description,
  };
}
