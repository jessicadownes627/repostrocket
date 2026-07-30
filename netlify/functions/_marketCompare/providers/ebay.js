import { normalizeEbayItem } from "../normalize.js";
import { createProviderReport } from "../schema.js";

const EBAY_OAUTH_URL = "https://api.ebay.com/identity/v1/oauth2/token";
const EBAY_BROWSE_URL = "https://api.ebay.com/buy/browse/v1/item_summary/search";
const EBAY_SCOPE = "https://api.ebay.com/oauth/api_scope";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

export async function searchEbayListings({ query, limit = 6, signal } = {}) {
  const fetchedAt = new Date().toISOString();
  const credentialsReady = Boolean(process.env.EBAY_CLIENT_ID && process.env.EBAY_CLIENT_SECRET);

  if (!credentialsReady) {
    return {
      provider: createProviderReport({
        provider: "ebay",
        status: "not_configured",
        error: "Missing EBAY_CLIENT_ID or EBAY_CLIENT_SECRET",
      }),
      results: [],
    };
  }

  try {
    const accessToken = await getEbayAccessToken(signal);
    const url = new URL(EBAY_BROWSE_URL);
    url.searchParams.set("q", query.searchText);
    url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 20))));
    url.searchParams.set("sort", "price");

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
      signal,
    });

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(`eBay Browse API ${response.status}: ${message}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.itemSummaries) ? payload.itemSummaries : [];
    const results = items.map((item) => normalizeEbayItem(item, query, fetchedAt));

    return {
      provider: createProviderReport({
        provider: "ebay",
        status: "ok",
        resultCount: results.length,
      }),
      results,
    };
  } catch (error) {
    return {
      provider: createProviderReport({
        provider: "ebay",
        status: "error",
        error: error.message,
      }),
      results: [],
    };
  }
}

async function getEbayAccessToken(signal) {
  const now = Date.now();
  if (cachedToken && cachedTokenExpiresAt - 60_000 > now) {
    return cachedToken;
  }

  const basicAuth = Buffer.from(
    `${process.env.EBAY_CLIENT_ID}:${process.env.EBAY_CLIENT_SECRET}`
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: EBAY_SCOPE,
  });

  const response = await fetch(EBAY_OAUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    signal,
  });

  if (!response.ok) {
    const message = await safeReadText(response);
    throw new Error(`eBay OAuth ${response.status}: ${message}`);
  }

  const payload = await response.json();
  cachedToken = payload?.access_token || null;
  const expiresIn = Number(payload?.expires_in) || 7200;
  cachedTokenExpiresAt = now + expiresIn * 1000;

  if (!cachedToken) {
    throw new Error("eBay OAuth response missing access_token");
  }

  return cachedToken;
}

async function safeReadText(response) {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "Unable to read response body";
  }
}
