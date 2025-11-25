import { useMemo } from "react";

export function useAutoTitle({ platform, features, brand, category }) {
  return useMemo(() => {
    if (!features) return "";

    const {
      colorName,
      style,
      material,
      length,
      itemType,
      condition,
    } = features;

    // Base building blocks
    const color = colorName ? capitalize(colorName) : "";
    const styleText = style ? capitalize(style) : "";
    const mat = material ? capitalize(material) : "";
    const len = length ? capitalize(length) : "";
    const brandName = brand ? capitalize(brand) : "";

    // Default item descriptor
    const item =
      itemType ||
      category?.name ||
      "Item";

    // Condition prefix (optional for Mercari/Poshmark)
    const cond =
      condition && !["Good"].includes(condition)
        ? `${condition} `
        : "";

    // ============================
    // PLATFORM-SPECIFIC GENERATION
    // ============================

    let title = "";

    switch (platform) {
      case "mercari":
        // clean, searchable, no fluff
        title = `${cond}${brandName} ${color} ${item} ${styleText} ${mat}`
          .replace(/\s+/g, " ")
          .trim();
        break;

      case "poshmark":
        // brand → item → color
        title = `${brandName} ${item} ${color} ${styleText}`
          .replace(/\s+/g, " ")
          .trim();
        break;

      case "depop":
        // aesthetic + vibe
        title = `${color} ${styleText} ${brandName} ${item}`
          .replace(/\s+/g, " ")
          .trim();
        break;

      case "ebay":
        // longform keywords for SEO
        title = [
          brandName,
          color,
          item,
          styleText,
          mat,
          len,
          condition ? `(${condition})` : "",
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        break;

      default:
        title = `${brandName} ${color} ${item}`.trim();
        break;
    }

    return title;
  }, [platform, features, brand, category]);
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
