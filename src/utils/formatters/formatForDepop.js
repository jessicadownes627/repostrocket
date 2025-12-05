import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForDepop(item = {}) {
  const {
    title = "",
    brand = "",
    size = "",
    color = "",
    condition = "",
    description = "",
    tags = [],
    category = "",
  } = item;

  const baseTitle = title;
  const baseDesc = description || "Sick piece. Great condition.";

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

Tags:
${tags?.length ? tags.map((t) => `#${t}`).join(" ") : "#streetwear #y2k #vintage"}
`.trim();
}
