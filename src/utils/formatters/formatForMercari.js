export default function formatForMercari(listing = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    color = "",
    size = "",
    condition = "",
    tags = [],
  } = listing;

  return `
${title}

${brand ? `Brand: ${brand}` : ""}
${size ? `Size: ${size}` : ""}
${color ? `Color: ${color}` : ""}
${condition ? `Condition: ${condition}` : ""}

${description || "Good condition. Smoke-free home."}

Details:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Trending\n• Great Fit"}
`.trim();
}
