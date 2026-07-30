import { createResult } from "./schema.js";

export function buildMatchScore(query = {}, text = "") {
  const haystack = String(text || "").toLowerCase();
  const keywords = Array.isArray(query?.keywords) ? query.keywords : [];
  if (!haystack || !keywords.length) return 0;

  let matches = 0;
  keywords.forEach((keyword) => {
    if (haystack.includes(String(keyword).toLowerCase())) {
      matches += 1;
    }
  });

  const exactTitleBoost =
    query?.title && haystack.includes(String(query.title).toLowerCase()) ? 0.2 : 0;
  const rawScore = matches / keywords.length + exactTitleBoost;
  return Math.max(0, Math.min(1, rawScore));
}

export function normalizeEbayItem(item = {}, query = {}, fetchedAt) {
  const priceValue = item?.price?.value;
  const shippingValue =
    item?.shippingOptions?.[0]?.shippingCost?.value ??
    item?.shippingOptions?.[0]?.importCharges?.value ??
    null;

  return createResult({
    provider: "ebay",
    listingId: item?.itemId || item?.legacyItemId || item?.itemWebUrl,
    title: item?.title || "",
    price: priceValue,
    currency: item?.price?.currency || "USD",
    shipping: shippingValue,
    condition: item?.condition || item?.conditionId || "",
    url: item?.itemWebUrl || "",
    imageUrl: item?.image?.imageUrl || item?.thumbnailImages?.[0]?.imageUrl || "",
    sellerName: item?.seller?.username || "",
    location: item?.itemLocation?.country || "",
    listingState: inferEbayListingState(item),
    matchScore: buildMatchScore(query, item?.title || ""),
    fetchedAt,
    metadata: {
      buyingOptions: Array.isArray(item?.buyingOptions) ? item.buyingOptions : [],
      itemGroupType: item?.itemGroupType || "",
    },
  });
}

export function normalizeEtsyItem(item = {}, query = {}, fetchedAt) {
  const price = normalizeEtsyMoney(item?.price);

  return createResult({
    provider: "etsy",
    listingId: item?.listing_id || item?.url,
    title: item?.title || "",
    price: price.amount,
    currency: price.currency,
    shipping: null,
    condition: deriveEtsyCondition(item),
    url: item?.url || "",
    imageUrl:
      item?.images?.[0]?.url_fullxfull ||
      item?.images?.[0]?.url_570xN ||
      item?.images?.[0]?.url_170x135 ||
      "",
    sellerName: item?.shop_name || "",
    location: item?.shop_location || "",
    listingState: item?.state || "active",
    matchScore: buildMatchScore(query, item?.title || ""),
    fetchedAt,
    metadata: {
      categoryPath: item?.taxonomy_path || [],
      quantity: typeof item?.quantity === "number" ? item.quantity : null,
    },
  });
}

function normalizeEtsyMoney(money) {
  if (!money) return { amount: null, currency: "USD" };
  if (typeof money.amount === "number") {
    const divisor = Number.isFinite(Number(money.divisor)) ? Number(money.divisor) : 1;
    return {
      amount: divisor > 0 ? money.amount / divisor : money.amount,
      currency: money.currency_code || "USD",
    };
  }
  if (typeof money === "number") {
    return { amount: money, currency: "USD" };
  }
  return { amount: null, currency: money.currency_code || "USD" };
}

function deriveEtsyCondition(item = {}) {
  if (item?.item_condition) return item.item_condition;
  if (item?.is_vintage) return "Vintage";
  if (item?.state === "active") return "Active listing";
  return "";
}

function inferEbayListingState(item = {}) {
  const status = item?.estimatedAvailabilityStatus || "";
  if (status) return String(status).toLowerCase();
  return "active";
}
