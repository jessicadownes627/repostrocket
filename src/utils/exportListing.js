// src/utils/exportListing.js
// Builds deep links to various marketplace listing flows from a composed listing

export function buildListingExportLinks({ title, price, description }) {
  const safeTitle = title || "";
  const safeDesc = description || "";
  const safePrice =
    typeof price === "number" && !Number.isNaN(price) ? price.toString() : "";

  const encodedTitle = encodeURIComponent(safeTitle);
  const encodedDesc = encodeURIComponent(safeDesc);
  const encodedPrice = encodeURIComponent(safePrice);

  return {
    ebay: `https://www.ebay.com/sl/sell?title=${encodedTitle}&desc=${encodedDesc}&price=${encodedPrice}`,
    poshmark: `https://poshmark.com/create-listing?title=${encodedTitle}&description=${encodedDesc}&price=${encodedPrice}`,
    mercari: `https://www.mercari.com/sell/?title=${encodedTitle}&description=${encodedDesc}&price=${encodedPrice}`,
    depop: `https://www.depop.com/products/new/?title=${encodedTitle}&description=${encodedDesc}`,
    grailed: `https://www.grailed.com/sell/item?title=${encodedTitle}&description=${encodedDesc}&price=${encodedPrice}`,
  };
}

