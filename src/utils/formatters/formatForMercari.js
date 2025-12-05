import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForMercari(item = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    color = "",
    size = "",
    condition = "",
    tags = [],
    category = "",
  } = item;

  const baseTitle = title;
  const baseDesc = description || "Good condition. Smoke-free home.";

  const collectibleBlock = buildCollectibleDetails(item);

  const collectibleTitle =
    ["Sports Cards", "Collectibles"].includes(category)
      ? `${item.cardPlayer || ""} • ${item.cardSet || ""}${
          item.variant ? ` • ${item.variant}` : ""
        }${
          item.gradingCompany
            ? ` • ${item.gradingCompany} ${item.gradeNumber || ""}`
            : ""
        }`.trim()
      : baseTitle;

  return `
${collectibleTitle}

${brand ? `Brand: ${brand}` : ""}
${size ? `Size: ${size}` : ""}
${color ? `Color: ${color}` : ""}
${condition ? `Condition: ${condition}` : ""}

${baseDesc}
${collectibleBlock}
Details:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Trending\n• Great Fit"}
`.trim();
}
