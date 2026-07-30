const PROVIDERS = [
  { id: "ebay", label: "eBay" },
  { id: "etsy", label: "Etsy" },
];

export default function MarketResearchCard({
  status = "idle",
  data = null,
  error = "",
}) {
  const providerReports = Array.isArray(data?.providers) ? data.providers : [];
  const results = Array.isArray(data?.results) ? data.results : [];

  return (
    <div className="market-research-card">
      <div className="market-research-title">Market Research</div>
      <div className="market-research-sub">
        Active listings from official marketplace APIs
      </div>

      {status === "idle" && (
        <div className="market-research-state">
          Add a title or brand to start market research.
        </div>
      )}

      {status === "loading" && (
        <div className="market-research-state">Loading marketplace data...</div>
      )}

      {status === "error" && (
        <div className="market-research-state">
          {error || "Unable to load market research right now."}
        </div>
      )}

      {status === "success" && (
        <>
          <div className="market-research-provider-list">
            {PROVIDERS.map((provider) => {
              const report = providerReports.find(
                (entry) => entry?.provider === provider.id
              );
              const listing = results.find(
                (entry) => entry?.provider === provider.id
              );

              return (
                <ProviderSection
                  key={provider.id}
                  provider={provider}
                  report={report}
                  listing={listing}
                />
              );
            })}
          </div>

          {!results.length && !hasComingSoon(providerReports) && (
            <div className="market-research-state">
              No comparable active listings found.
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ProviderSection({ provider, report, listing }) {
  const status = report?.status || "idle";
  const showComingSoon = status === "not_configured";

  return (
    <div className="market-research-provider">
      <div className="market-research-provider-name">{provider.label}</div>

      {showComingSoon ? (
        <div className="market-research-provider-state">Coming Soon</div>
      ) : listing ? (
        <div
          className="market-research-grid"
          role="table"
          aria-label={`${provider.label} market research`}
        >
          <div className="market-research-grid-label">Price</div>
          <div className="market-research-grid-label">Shipping</div>
          <div className="market-research-grid-label">Condition</div>
          <div className="market-research-grid-label">View</div>

          <div className="market-research-grid-value">
            {formatPrice(listing.price, listing.currency)}
          </div>
          <div className="market-research-grid-value">
            {formatShipping(listing.shipping, listing.currency)}
          </div>
          <div className="market-research-grid-value">
            {listing.condition || "—"}
          </div>
          <div className="market-research-grid-value">
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
              "—"
            )}
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
