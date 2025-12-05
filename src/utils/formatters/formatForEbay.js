import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForEbay(item = {}) {
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
  const baseDesc = description || "Great item in good condition.";

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
${category ? `Category: ${category}` : ""}

Description:
${baseDesc}
${collectibleBlock}
Features:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Stylish\n• Great Quality"}

Shipping:
Carefully packed and shipped fast.

Search Keywords:
${[brand, collectibleTitle || title, category, ...tags].filter(Boolean).join(", ")}
`.trim();
}
