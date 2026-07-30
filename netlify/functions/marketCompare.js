import { ensureMarketCompareQuery } from "./_marketCompare/queryBuilder.js";
import { getEnabledProviders } from "./_marketCompare/providers/index.js";
import {
  createMarketCompareResponse,
  createProviderReport,
  dedupeResults,
} from "./_marketCompare/schema.js";

const DEFAULT_PROVIDER_LIMIT = 6;
const DEFAULT_TIMEOUT_MS = 8000;

export async function handler(event) {
  if (event.httpMethod && event.httpMethod !== "POST") {
    return jsonResponse(
      405,
      createMarketCompareResponse({
        query: {},
        providers: [],
        results: [],
        errors: ["Method Not Allowed"],
      })
    );
  }

  try {
    const parsedBody = parseRequestBody(event.body);
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
      providers.map(async ({ name, search }) => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
          const result = await search({
            query,
            limit,
            signal: controller.signal,
          });
          return normalizeProviderResult(name, result);
        } catch (error) {
          return {
            provider: createProviderReport({
              provider: name,
              status: "error",
              error: error?.message || "Provider request failed",
            }),
            results: [],
          };
        } finally {
          clearTimeout(timer);
        }
      })
    );

    const providerReports = providerResponses.map((entry) => entry.provider);
    const results = dedupeResults(
      providerResponses.flatMap((entry) => entry.results || [])
    );
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
    const statusCode =
      error?.message === "Invalid JSON request body" ? 400 : 500;
    console.error("Market Compare Backend Error:", error);
    return jsonResponse(
      statusCode,
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

function parseRequestBody(body) {
  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new Error("Invalid JSON request body");
  }
}

function normalizeProviderResult(name, result) {
  const safeResult =
    result && typeof result === "object" ? result : { provider: null, results: [] };
  const provider =
    safeResult.provider && typeof safeResult.provider === "object"
      ? safeResult.provider
      : createProviderReport({
          provider: name,
          status: "error",
          error: "Malformed provider response",
        });

  return {
    provider: {
      ...provider,
      provider: provider.provider || name,
      resultCount: Array.isArray(safeResult.results) ? safeResult.results.length : 0,
    },
    results: Array.isArray(safeResult.results) ? safeResult.results : [],
  };
}
