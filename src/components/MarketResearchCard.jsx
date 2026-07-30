import { useMemo, useState } from "react";

const PROVIDERS = [
  {
    id: "ebay",
    label: "eBay",
    badge: "e",
    badgeClassName: "market-research-provider-badge--ebay",
  },
  {
    id: "etsy",
    label: "Etsy",
    badge: "E",
    badgeClassName: "market-research-provider-badge--etsy",
  },
];

export default function MarketResearchCard({
  status = "idle",
  data = null,
  error = "",
}) {
  const providerReports = useMemo(
    () => indexProviderReports(data?.providers),
    [data?.providers]
  );
  const results = useMemo(() => sanitizeListings(data?.results), [data?.results]);
  const [sortMode, setSortMode] = useState("lowest");

  const groupedResults = useMemo(() => {
    return PROVIDERS.reduce((acc, provider) => {
      const providerResults = results.filter(
        (entry) => entry?.provider === provider.id
      );
      acc[provider.id] = sortListings(providerResults, sortMode);
      return acc;
    }, {});
  }, [results, sortMode]);

  return (
    <div className="market-research-card">
      <div className="market-research-header">
        <div>
          <div className="market-research-title">Market Research</div>
          <div className="market-research-sub">
            Active listings from official marketplace APIs
          </div>
        </div>

        <div className="market-research-sorter" role="group" aria-label="Sort market research">
          <button
            type="button"
            className={`market-research-sort-button ${
              sortMode === "lowest" ? "is-active" : ""
            }`}
            onClick={() => setSortMode("lowest")}
          >
            Lowest Price
          </button>
          <button
            type="button"
            className={`market-research-sort-button ${
              sortMode === "highest" ? "is-active" : ""
            }`}
            onClick={() => setSortMode("highest")}
          >
            Highest Price
          </button>
        </div>
      </div>

      {status === "idle" && (
        <StatePanel
          title="Ready when you are"
          body="Add a title or brand to start market research."
        />
      )}

      {status === "loading" && (
        <div className="market-research-loading">
          <div className="market-research-loading-copy">
            Searching supported marketplaces...
          </div>
          <div className="market-research-skeleton-grid" aria-hidden="true">
            <div className="market-research-skeleton-card" />
            <div className="market-research-skeleton-card" />
          </div>
        </div>
      )}

      {status === "error" && (
        <StatePanel
          title="Market research unavailable"
          body={error || "Unable to load market research right now."}
          tone="error"
        />
      )}

      {status === "success" && (
        <>
          <div className="market-research-provider-list">
            {PROVIDERS.map((provider) => {
              const report = providerReports[provider.id] || null;
              const listings = groupedResults[provider.id] || [];

              return (
                <ProviderSection
                  key={provider.id}
                  provider={provider}
                  report={report}
                  listings={listings}
                />
              );
            })}
          </div>

          {!results.length && !hasComingSoon(Object.values(providerReports)) && (
            <StatePanel
              title="No active listings found"
              body="Try a more specific title or brand to refine the search."
            />
          )}
        </>
      )}
    </div>
  );
}

function ProviderSection({ provider, report, listings }) {
  const status = report?.status || "idle";
  const showComingSoon = status === "not_configured";
  const hasManyResults = listings.length > 3;
  const [expanded, setExpanded] = useState(false);
  const visibleListings =
    expanded || !hasManyResults ? listings : listings.slice(0, 3);

  return (
    <div className="market-research-provider">
      <div className="market-research-provider-head">
        <div className="market-research-provider-meta">
          <div
            className={`market-research-provider-icon ${provider.badgeClassName || ""}`}
            aria-hidden="true"
          >
            {provider.badge || provider.label.slice(0, 1)}
          </div>
          <div>
            <div className="market-research-provider-name">{provider.label}</div>
            <div className="market-research-provider-caption">
              {buildProviderCaption(status, report?.resultCount, listings.length)}
            </div>
          </div>
        </div>

        {hasManyResults ? (
          <button
            type="button"
            className="market-research-toggle"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? "Show Less" : `Show ${listings.length - 3} More`}
          </button>
        ) : null}
      </div>

      {showComingSoon ? (
        <div className="market-research-provider-state market-research-provider-state--coming">
          Coming Soon
        </div>
      ) : listings.length ? (
        <div className="market-research-results">
          <div
            className="market-research-grid market-research-grid--head"
            role="row"
            aria-hidden="true"
          >
            <div className="market-research-grid-label">Price</div>
            <div className="market-research-grid-label">Shipping</div>
            <div className="market-research-grid-label">Condition</div>
            <div className="market-research-grid-label">View</div>
          </div>

          <div className="market-research-result-list" role="table" aria-label={`${provider.label} market research`}>
            {visibleListings.map((listing) => (
              <div
                key={`${provider.id}-${listing.listingId || listing.url}`}
                className="market-research-grid market-research-grid--row"
                role="row"
              >
                <div className="market-research-grid-cell" data-label="Price">
                  <span className="market-research-grid-value">
                    {formatPrice(listing.price, listing.currency)}
                  </span>
                </div>
                <div className="market-research-grid-cell" data-label="Shipping">
                  <span className="market-research-grid-value">
                    {formatShipping(listing.shipping, listing.currency)}
                  </span>
                </div>
                <div className="market-research-grid-cell" data-label="Condition">
                  <span className="market-research-grid-value">
                    {listing.condition || "—"}
                  </span>
                </div>
                <div className="market-research-grid-cell" data-label="View">
                  {listing.url ? (
                    <a
                      href={listing.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="market-research-link"
                    >
                      View
                    </a>
                  ) : (
                    <span className="market-research-grid-value">—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : status === "error" ? (
        <div className="market-research-provider-state">Unavailable</div>
      ) : (
        <div className="market-research-provider-state">No active listings</div>
      )}
    </div>
  );
}

function StatePanel({ title, body, tone = "neutral" }) {
  return (
    <div className={`market-research-state-panel market-research-state-panel--${tone}`}>
      <div className="market-research-state-title">{title}</div>
      <div className="market-research-state-body">{body}</div>
    </div>
  );
}

function formatPrice(value, currency = "USD") {
  if (typeof value !== "number") return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `$${value.toFixed(2)}`;
  }
}

function formatShipping(value, currency = "USD") {
  if (typeof value !== "number") return "—";
  return formatPrice(value, currency);
}

function hasComingSoon(providers = []) {
  return providers.some((provider) => provider?.status === "not_configured");
}

function sortListings(listings = [], mode = "lowest") {
  return [...listings].sort((a, b) => {
    const aPrice = typeof a?.price === "number" ? a.price : Number.POSITIVE_INFINITY;
    const bPrice = typeof b?.price === "number" ? b.price : Number.POSITIVE_INFINITY;

    if (mode === "highest") {
      return bPrice - aPrice;
    }

    return aPrice - bPrice;
  });
}

function buildProviderCaption(status, count = 0, listingsLength = 0) {
  if (status === "not_configured") return "Official API not connected yet";
  if (status === "error") return "Provider unavailable right now";
  if (!listingsLength) return "No active listings found";
  if (count === 1) return "1 active listing";
  return `${count || listingsLength} active listings`;
}

function indexProviderReports(reports) {
  const entries = Array.isArray(reports) ? reports : [];
  return entries.reduce((acc, report) => {
    const key = String(report?.provider || "").toLowerCase();
    if (!key) return acc;
    acc[key] = report;
    return acc;
  }, {});
}

function sanitizeListings(results) {
  if (!Array.isArray(results)) return [];

  return results.filter((entry) => {
    if (!entry || typeof entry !== "object") return false;
    if (!entry.provider) return false;
    if (!entry.url && !entry.listingId) return false;
    return true;
  });
}
