export function getShippingSuggestions(listingData) {
  if (!listingData) return [];

  const title = (listingData.title || "").toLowerCase();
  const desc = (listingData.description || "").toLowerCase();

  const suggestions = [];

  if (title.includes("dress") || title.includes("shirt") || title.includes("top") || title.includes("skirt")) {
    suggestions.push("Light clothing often qualifies for USPS First Class (under 1 lb).");
  }

  if (title.includes("shoe") || title.includes("heel") || title.includes("boot")) {
    suggestions.push("Shoes can be heavy—Ground Advantage may be the cheaper option.");
  }

  if (desc.includes("charger") || desc.includes("camera") || title.includes("phone") || title.includes("ipad") || desc.includes("electronics")) {
    suggestions.push("Electronics: 'Ship on your own' may offer better insurance coverage.");
  }

  if (desc.includes("glass") || desc.includes("ceramic") || desc.includes("fragile") || desc.includes("porcelain")) {
    suggestions.push("Fragile items may need extra padding—choose a method that supports insurance.");
  }

  if (desc.includes("coat") || desc.includes("jacket") || desc.includes("comforter") || desc.includes("blanket") || title.includes("coat")) {
    suggestions.push("Bulky items: compare UPS vs USPS—UPS is often cheaper for large boxes.");
  }

  if (suggestions.length === 0) {
    suggestions.push("Choose the shipping method you're most comfortable with — weight, size, and packaging can vary.");
  }

  return suggestions;
}
