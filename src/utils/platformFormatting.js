export const platformLinks = {
  poshmark: { deep: "poshmark://create", web: "https://poshmark.com/single-listing" },
  mercari: { deep: "mercari://sell", web: "https://www.mercari.com/sell" },
  ebay: { deep: "ebay://selling/create", web: "https://www.ebay.com/sl/sell" },
  depop: { deep: "depop://selling/create", web: "https://www.depop.com/sell/" },
  "facebook marketplace": { deep: "fb://marketplace/sell", web: "https://www.facebook.com/marketplace/create/item" },
  vinted: { deep: "vinted://sell/item", web: "https://www.vinted.com/items/new" },
  kidizen: { deep: "", web: "https://www.kidizen.com/items/new" },
  etsy: { deep: "", web: "https://www.etsy.com/your/shops/me/listings/create" },
  shopify: { deep: "", web: "https://shopify.com" },
  grailed: { deep: "", web: "https://www.grailed.com/sell" },
};

export function formatTagPreview(tags, type) {
  if (!tags) return "";
  if (type === "hashtags") return Array.isArray(tags) ? tags.join(" ") : tags;
  if (type === "keywords") return typeof tags === "string" ? tags : (tags || []).join(", ");
  if (Array.isArray(tags)) return tags.join(", ");
  return "";
}
