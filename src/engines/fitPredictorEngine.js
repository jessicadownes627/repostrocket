// Predicts fit type + buyer questions based on listing fields
export function predictFit({ title = "", description = "", category = "" } = {}) {
  const t = `${title} ${description}`.toLowerCase();
  const buyerQuestions = [];
  let fitType = "Standard";

  if (t.includes("oversized")) fitType = "Oversized";
  if (t.includes("relaxed")) fitType = "Relaxed Fit";
  if (t.includes("fitted") || t.includes("slim")) fitType = "Fitted";
  if (t.includes("cropped")) fitType = "Cropped";

  const cat = category.toLowerCase();
  if (cat.includes("bags")) {
    buyerQuestions.push("Strap length?", "Interior pockets?", "Hardware condition?");
  }
  if (cat.includes("shoes")) {
    buyerQuestions.push("True to size?", "Heel measurement?", "Sole wear?");
  }
  if (cat.includes("tops")) {
    buyerQuestions.push("Pit-to-pit measurement?", "Length (shoulder to hem)?");
  }

  return { fitType, buyerQuestions };
}
