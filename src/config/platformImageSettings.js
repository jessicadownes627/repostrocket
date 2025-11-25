export const IMAGE_VARIANTS = {
  mercari: {
    name: "Square",
    width: 1080,
    height: 1080,
    mode: "cover",
  },
  poshmark: {
    name: "Square",
    width: 1200,
    height: 1600,
    mode: "cover",
  },
  depop: {
    name: "Vertical",
    width: 1080,
    height: 1350,
    mode: "cover",
  },
  ebay: {
    name: "HD",
    mode: "longest",
    longest: 1600,
  },
  facebook: {
    name: "Landscape",
    width: 1200,
    height: 900,
    mode: "cover",
  },
  etsy: {
    name: "Landscape",
    width: 1200,
    height: 900,
    mode: "cover",
  },
};

export function getVariantForPlatform(platform = "") {
  const key = platform.toLowerCase();
  if (key === "poshmark") return "poshmark";
  if (key === "depop") return "depop";
  if (key === "ebay") return "ebay";
  if (key === "facebook marketplace") return "facebook";
  if (key === "etsy") return "etsy";
  if (key === "vinted" || key === "kidizen") return "facebook";
  if (key === "grailed") return "poshmark";
  if (key === "mercari") return "mercari";
  return "facebook";
}
