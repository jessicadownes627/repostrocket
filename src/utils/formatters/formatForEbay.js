export default function formatForEbay(listing = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    color = "",
    size = "",
    condition = "",
    tags = [],
    category = "",
  } = listing;

  return `
${title}

${brand ? `Brand: ${brand}` : ""}
${size ? `Size: ${size}` : ""}
${color ? `Color: ${color}` : ""}
${condition ? `Condition: ${condition}` : ""}
${category ? `Category: ${category}` : ""}

Description:
${description || "Great item in good condition."}

Features:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Stylish\n• Great Quality"}

Shipping:
Carefully packed and shipped fast.

Search Keywords:
${[brand, title, category, ...tags].filter(Boolean).join(", ")}
`.trim();
}
