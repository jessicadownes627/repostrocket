export default function formatForDepop(listing = {}) {
  const {
    title = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    description = "",
    tags = [],
  } = listing;

  return `
${title}

${description || "Sick piece. Great condition."}

Brand: ${brand || "—"}
Size: ${size || "—"}
Color: ${color || "—"}
Condition: ${condition || "—"}

Tags:
${tags?.length ? tags.map((t) => `#${t}`).join(" ") : "#streetwear #y2k #vintage"}
`.trim();
}
