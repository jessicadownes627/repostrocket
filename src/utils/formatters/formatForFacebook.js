import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForFacebook(item = {}) {
  const {
    title = "",
    description = "",
    condition = "",
    brand = "",
    size = "",
    color = "",
    tags = [],
    category = "",
  } = item;

  const baseTitle = title;
  const baseDesc =
    description || "Good condition. Available for pickup or local meet-up.";

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

Features:
${tags?.length ? tags.map((t) => `• ${t}`).join("\n") : "• Clean\n• Ready to use"}
`.trim();
}
