import { buildCollectibleDetails } from "./collectibleHelpers";

export default function formatForPoshmark(item = {}) {
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
  const baseDesc = description || "Cute and comfy. Great condition!";

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
${brand ? brand + " ·" : ""} ${size || ""}

${baseDesc}
${collectibleBlock}
Color: ${color || "—"}
Condition: ${condition || "—"}

Style Tags:
${tags?.length ? tags.map((t) => `#${t}`).join(" ") : "#cute #style #trending"}
`.trim();
}
