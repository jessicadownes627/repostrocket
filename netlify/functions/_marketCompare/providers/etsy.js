import { normalizeEtsyItem } from "../normalize.js";
import { createProviderReport } from "../schema.js";

const ETSY_LISTINGS_URL = "https://openapi.etsy.com/v3/application/listings/active";

export async function searchEtsyListings({ query, limit = 6, signal } = {}) {
  const fetchedAt = new Date().toISOString();
  const apiKeyHeader = resolveEtsyApiKeyHeader();

  if (!apiKeyHeader) {
    return {
      provider: createProviderReport({
        provider: "etsy",
        status: "not_configured",
        error:
          "Missing Etsy credentials. Set ETSY_API_KEY_HEADER or ETSY_API_KEY with ETSY_SHARED_SECRET.",
      }),
      results: [],
    };
  }

  try {
    const url = new URL(ETSY_LISTINGS_URL);
    url.searchParams.set("keywords", query.searchText);
    url.searchParams.set("limit", String(Math.max(1, Math.min(limit, 20))));
    url.searchParams.set("sort_on", "score");
    url.searchParams.set("sort_order", "down");
    url.searchParams.set(
      "includes",
      [
        "Images(url_170x135,url_570xN,url_fullxfull)",
        "Shop(shop_name)",
      ].join(",")
    );

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": apiKeyHeader,
      },
      signal,
    });

    if (!response.ok) {
      const message = await safeReadText(response);
      throw new Error(`Etsy Open API ${response.status}: ${message}`);
    }

    const payload = await response.json();
    const items = Array.isArray(payload?.results) ? payload.results : [];
    const results = items.map((item) => normalizeEtsyItem(item, query, fetchedAt));

    return {
      provider: createProviderReport({
        provider: "etsy",
        status: "ok",
        resultCount: results.length,
      }),
      results,
    };
  } catch (error) {
    return {
      provider: createProviderReport({
        provider: "etsy",
        status: "error",
        error: error.message,
      }),
      results: [],
    };
  }
}

function resolveEtsyApiKeyHeader() {
  if (process.env.ETSY_API_KEY_HEADER) {
    return process.env.ETSY_API_KEY_HEADER;
  }
  if (process.env.ETSY_API_KEY && process.env.ETSY_SHARED_SECRET) {
    return `${process.env.ETSY_API_KEY}:${process.env.ETSY_SHARED_SECRET}`;
  }
  return null;
}

async function safeReadText(response) {
  try {
    return (await response.text()).slice(0, 300);
  } catch {
    return "Unable to read response body";
  }
}
