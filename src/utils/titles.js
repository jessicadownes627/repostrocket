export function generatePlatformTitles(listingData = {}) {
  const { title = "", category = "", condition = "", price = "" } = listingData;
  const baseTitle = title || "";
  const casedCondition = condition ? condition.toLowerCase() : "";

  
  return {
    poshmark: `${baseTitle} – ${condition}`.trim(),
    mercari: `${baseTitle} | ${condition} | ${category}`.trim(),
    depop: `${baseTitle} (${casedCondition})`.trim(),
    ebay: `${baseTitle} ${category} ${condition} $${price} Fast Ship`.trim(),
    "facebook marketplace": `${baseTitle} - $${price}`.trim(),
    vinted: `${baseTitle} | ${condition}`.trim(),
    kidizen: `${baseTitle} – Kids ${category}`.trim(),
    etsy: `${baseTitle} | Vintage | ${condition}`.trim(),
    shopify: baseTitle.trim(),
    grailed: `${baseTitle} | ${condition}`.trim(),
  };
}
