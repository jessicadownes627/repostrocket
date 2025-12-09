import React, { useState } from "react";
import {
  runTrendSenseSearch,
  extractAutofillData,
} from "../utils/trendSenseSearch";

export default function TrendSenseSearchPanel() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch(e) {
    const v = e.target.value;
    setQuery(v);

    if (!v || v.trim().length < 2) {
      setResult(null);
      return;
    }

    setLoading(true);
    try {
      const out = await runTrendSenseSearch(v);
      setResult(out);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
      <input
        value={query}
        onChange={handleSearch}
        placeholder="Search any item…"
        className="w-full bg-[#050708] border border-[#2E3235] rounded-lg px-3 py-2 text-sm focus:outline-none mb-4"
      />

      {loading && (
        <div className="text-xs opacity-60">
          Scanning market signals…
        </div>
      )}

      {!loading && !result && query.trim().length < 2 && (
        <div className="text-xs opacity-40">
          Start typing any brand, item, or keyword.
        </div>
      )}

      {result && (
        <div className="space-y-4 mt-2">
          {/* Category */}
          <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
            <div className="font-medium mb-1">Category</div>
            <div className="text-sm opacity-80">
              {result.category || "—"}
            </div>
          </div>

          {/* Brand */}
          <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
            <div className="font-medium mb-1">Brand</div>
            <div className="text-sm opacity-80">
              {result.brand || "—"}
            </div>
            {result.demandLabel && (
              <div className="text-xs opacity-60 mt-2">
                Demand: {result.demandLabel}
              </div>
            )}
          </div>

          {/* Hot Tags */}
          {result.hotTags?.length > 0 && (
            <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
              <div className="font-medium mb-2">Hot Tags</div>
              {result.hotTags.slice(0, 5).map((t, i) => (
                <div
                  key={i}
                  className="text-sm opacity-80 mb-1"
                >
                  • {t.keyword}
                </div>
              ))}
              <div className="text-xs opacity-60 mt-2">
                Strong buyer activity around these keywords.
              </div>
            </div>
          )}

          {/* Events */}
          {result.eventHeadline && (
            <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
              <div className="font-medium mb-1">News Spike</div>
              <div className="text-sm opacity-80 mb-2">
                {result.eventHeadline}
              </div>
              <div className="text-xs opacity-60">
                Sellers: Ideal moment to list. Buyers: Expect fast
                sell-through.
              </div>
            </div>
          )}

          {/* Smart Price Bands (if present) */}
          {result.smartPriceRange && (
            <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
              <div className="font-medium mb-1">
                Smart Price Bands
              </div>
              <div className="text-sm opacity-80">
                ${result.smartPriceRange.min} –{" "}
                {result.smartPriceRange.max}
              </div>
              <div className="text-xs opacity-60 mt-2">
                Target Price: ${result.smartPriceRange.target}
              </div>
            </div>
          )}

          {/* Summary Score */}
          <div className="lux-bento-card p-4 border border-[#26292B] bg-[#0B0D0F] rounded-xl">
            <div className="font-medium mb-1">List Score</div>
            <div className="text-2xl font-semibold opacity-90">
              {typeof result.trendScore === "number"
                ? result.trendScore
                : "—"}
            </div>
            <div className="text-xs opacity-60 mt-2">
              {result.summary || "Strong market conditions detected."}
            </div>
          </div>

          {/* Autofill Button */}
          <button
            onClick={() => {
              const data = extractAutofillData(result);
              if (!data) return;
              try {
                window.localStorage.setItem(
                  "rr_autofill",
                  JSON.stringify(data)
                );
              } catch {
                // ignore storage failures
              }
            }}
            className="mt-4 w-full bg-[#E8D5A8] text-black rounded-lg py-2 text-sm font-medium hover:opacity-90"
          >
            Add to Listing
          </button>
          <div className="text-[10px] opacity-60 mt-2">
            Saved — open your listing editor to apply.
          </div>
        </div>
      )}
    </div>
  );
}
