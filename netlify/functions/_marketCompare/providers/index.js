import { searchEbayListings } from "./ebay.js";
import { searchEtsyListings } from "./etsy.js";

export const marketCompareProviders = {
  ebay: searchEbayListings,
  etsy: searchEtsyListings,
};

export function getEnabledProviders() {
  return Object.entries(marketCompareProviders).map(([name, search]) => ({
    name,
    search,
  }));
}
