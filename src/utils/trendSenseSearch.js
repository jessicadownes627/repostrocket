import { runTrendSenseUltra } from "./trendSenseUltra";
import {
  getCategoryFromText,
  getBrandFromText,
  getTagsFromText,
} from "./textClassifiers";

// Run a TrendSense-style analysis against free-form text.
// Returns a structure similar to ULTRA, plus category/brand/hotTags.
export async function runTrendSenseSearch(query) {
  const q = query?.trim() || "";
  if (q.length < 2) {
    return null;
  }

  const tempItem = {
    id: "search-preview",
    title: q,
    description: q,
    category: getCategoryFromText(q),
    brand: getBrandFromText(q),
  };

  const ultra = (await runTrendSenseUltra(tempItem)) || {};

  const hotTags = getTagsFromText(q);

  return {
    ...ultra,
    hotTags,
    category: tempItem.category,
    brand: tempItem.brand,
  };
}

// Extracts a compact Autofill payload suitable for CreateListing / SingleListing.
export function extractAutofillData(result) {
  if (!result) return null;

  return {
    category: result.category || "",
    brand: result.brand || "",
    tags: result.hotTags?.map((t) => t.keyword) || [],
    suggestedPrice: result.smartPriceRange?.target || "",
    priceMin: result.smartPriceRange?.min || "",
    priceMax: result.smartPriceRange?.max || "",
    demandLabel: result.demandLabel || "",
    trendScore: result.trendScore || "",
  };
}

