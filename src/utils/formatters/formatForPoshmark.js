export default function formatForPoshmark(listing = {}) {
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
${brand ? brand + " ·" : ""} ${size || ""}

${description || "Cute and comfy. Great condition!"}

Color: ${color || "—"}
Condition: ${condition || "—"}

Style Tags:
${tags?.length ? tags.map((t) => `#${t}`).join(" ") : "#cute #style #trending"}
`.trim();
}
