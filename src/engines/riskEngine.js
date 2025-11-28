// Detects missing measurements, flaws, and risky listing gaps
// Returns an array of human-readable risk strings.
export function detectListingRisks({ title = "", description = "", category = "" }) {
  const risks = [];
  const desc = (description || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  const ttl = (title || "").toLowerCase();

  if (!description || description.length < 40) {
    risks.push("Description is short — buyers may ask repeated questions.");
  }

  if (cat.includes("tops") && !desc.includes("pit")) {
    risks.push("Missing pit-to-pit measurement.");
  }

  if (cat.includes("shoes") && !desc.includes("sole")) {
    risks.push("Missing sole condition detail.");
  }

  if (cat.includes("bags") && !desc.includes("strap")) {
    risks.push("Missing strap length info.");
  }

  if (ttl.includes("gucci") || ttl.includes("louis vuitton")) {
    risks.push("Designer keyword detected — be specific to avoid authenticity flags.");
  }

  if (!risks.length) {
    risks.push("Looks good — no major risk flags detected.");
  }

  return risks;
}

