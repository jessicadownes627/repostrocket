export function enhanceStyle(baseStyle = "", listingText = "") {
  const text = listingText.toLowerCase();

  if (text.includes("lace")) return "romantic lace detailing";
  if (text.includes("satin") || text.includes("silk")) return "smooth satin drape";
  if (text.includes("beaded") || text.includes("embellished")) return "delicate embellished touches";
  if (text.includes("tulle")) return "ethereal tulle silhouette";
  if (text.includes("wedding")) return "elegant bridal silhouette";
  if (text.includes("boho")) return "boho-inspired flowy shape";
  if (text.includes("vintage")) return "vintage-inspired elegance";

  return baseStyle;
}
