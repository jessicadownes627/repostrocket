import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForEtsy(item = {}) {
  const {
    title = "",
    description = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    tags = [],
    category = "",
  } = item;

  const baseTitle = title;
  const baseDesc =
    description || "Lovely item in good condition, ready to be enjoyed.";

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

${baseDesc}
${collectibleBlock}
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
${[collectibleTitle || title, brand, size, color, ...tags].filter(Boolean).join(", ")}
`.trim();
}
