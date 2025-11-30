export default function formatForEtsy(listing = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    tags = [],
    category = "",
  } = listing;

  return `
${title}

${description || "Lovely item in good condition, ready to be enjoyed."}

Details:
• Brand: ${brand || "—"}
• Size: ${size || "—"}
• Color: ${color || "—"}
• Condition: ${condition || "—"}
• Category: ${category || "—"}

Highlights:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Quality Item\n• Great Gift"}

Processing + Shipping:
Packed with care, quick dispatch.

Keywords:
${[title, brand, size, color, ...tags].filter(Boolean).join(", ")}
`.trim();
}
