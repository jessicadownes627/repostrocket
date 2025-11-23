export const platformLinks = {
  poshmark: "https://poshmark.com/create-listing",
  mercari: "https://www.mercari.com/sell",
  ebay: "https://www.ebay.com/sl/sell",
  depop: "https://www.depop.com/sell/",
  "facebook marketplace": "https://www.facebook.com/marketplace/create/item",
  vinted: "https://www.vinted.com/items/new",
  kidizen: "https://www.kidizen.com/items/new",
  etsy: "https://www.etsy.com/your/shops/me/listings/create",
  shopify: "https://shopify.com",
  grailed: "https://www.grailed.com/sell",
};

export function formatTagPreview(tags, type) {
  if (!tags) return "";
  if (type === "hashtags") return Array.isArray(tags) ? tags.join(" ") : tags;
  if (type === "keywords") return typeof tags === "string" ? tags : (tags || []).join(", ");
  if (Array.isArray(tags)) return tags.join(", ");
  return "";
}
