import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForVinted(item = {}) {
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
  const baseDesc = description || "Nice piece in good condition.";

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
Brand: ${brand || "—"}
Size: ${size || "—"}
Color: ${color || "—"}
Condition: ${condition || "—"}

Style:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Trendy\n• Comfortable"}
`.trim();
}
