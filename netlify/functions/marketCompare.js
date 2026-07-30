import { ensureMarketCompareQuery } from "./_marketCompare/queryBuilder.js";
import { getEnabledProviders } from "./_marketCompare/providers/index.js";
import { createMarketCompareResponse } from "./_marketCompare/schema.js";

const DEFAULT_PROVIDER_LIMIT = 6;
const DEFAULT_TIMEOUT_MS = 8000;

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  try {
    const parsedBody = JSON.parse(event.body || "{}");
    const query = ensureMarketCompareQuery(parsedBody);

    if (!query) {
      return jsonResponse(
        400,
        createMarketCompareResponse({
          query: {},
          providers: [],
          results: [],
          errors: ["Missing searchable listing context"],
        })
      );
    }

    const timeoutMs = resolveTimeoutMs();
    const limit = resolveLimit(parsedBody.limit);
    const providers = getEnabledProviders();

    const providerResponses = await Promise.all(
      providers.map(async ({ search }) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          return await search({
            query,
            limit,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timer);
        }
      })
    );

    const providerReports = providerResponses.map((entry) => entry.provider);
    const results = providerResponses.flatMap((entry) => entry.results || []);
    const errors = providerReports
      .filter((provider) => provider?.status === "error" || provider?.status === "not_configured")
      .map((provider) => `${provider.provider}: ${provider.error}`);

    return jsonResponse(
      200,
      createMarketCompareResponse({
        query,
        providers: providerReports,
        results,
        errors,
      })
    );
  } catch (error) {
    console.error("Market Compare Backend Error:", error);
    return jsonResponse(
      500,
      createMarketCompareResponse({
        query: {},
        providers: [],
        results: [],
        errors: [error.message || "Unexpected market compare error"],
      })
    );
  }
}

function resolveLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_PROVIDER_LIMIT;
  return Math.max(1, Math.min(Math.floor(parsed), 20));
}

function resolveTimeoutMs() {
  const parsed = Number(process.env.MARKET_COMPARE_TIMEOUT_MS);
  if (!Number.isFinite(parsed)) return DEFAULT_TIMEOUT_MS;
  return Math.max(1000, Math.min(Math.floor(parsed), 15000));
}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
