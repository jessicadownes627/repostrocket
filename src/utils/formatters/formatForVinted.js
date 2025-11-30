export default function formatForVinted(listing = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    tags = [],
  } = listing;

  return `
${title}

${description || "Nice piece in good condition."}

Brand: ${brand || "—"}
Size: ${size || "—"}
Color: ${color || "—"}
Condition: ${condition || "—"}

Style:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Trendy\n• Comfortable"}
`.trim();
}
