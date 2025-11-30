export default function formatForFacebook(listing = {}) {
  const {
    title = "",
    description = "",
    condition = "",
    brand = "",
    size = "",
    color = "",
    tags = [],
  } = listing;

  return `
${title}

${description || "Good condition. Available for pickup or local meet-up."}

Details:
• Brand: ${brand || "—"}
• Size: ${size || "—"}
• Color: ${color || "—"}
• Condition: ${condition || "—"}

Features:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Clean\n• Ready to use"}
`.trim();
}
