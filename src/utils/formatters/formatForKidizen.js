import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForKidizen(item = {}) {
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
    description || "Gently used. Comes from a smoke-free home.";

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

Style Notes:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Cute\n• Comfy"}
`.trim();
}
