export default function formatForKidizen(listing = {}) {
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

${description || "Gently used. Comes from a smoke-free home."}

Details:
• Brand: ${brand || "—"}
• Size: ${size || "—"}
• Color: ${color || "—"}
• Condition: ${condition || "—"}

Style Notes:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Cute\n• Comfy"}
`.trim();
}
