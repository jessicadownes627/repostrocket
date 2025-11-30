export default function formatForGrailed(listing = {}) {
  const {
    title = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    description = "",
  } = listing;

  return `
${title}

${description || "Gently worn. No major flaws."}

Brand: ${brand || "—"}
Size: ${size || "—"}
Color: ${color || "—"}
Condition: ${condition || "—"}
`.trim();
}
