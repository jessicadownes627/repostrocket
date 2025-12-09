import React from "react";

export default function FlipPotentialCard({ report }) {
  if (!report) return null;

  const { item, ts } = report;
  const {
    trendScore,
    demandLabel,
    smartPriceRange,
    smartBands,
    buyerHint,
    profitPotential,
  } = ts || {};

  let effectiveProfit = profitPotential;
  if (
    typeof effectiveProfit !== "number" &&
    smartBands &&
    typeof item?.price === "number"
  ) {
    effectiveProfit = Math.max(0, smartBands.ceiling - item.price);
  }

  return (
    <div className="lux-bento-card bg-[#0A0D0F] border border-[#2A2F33] rounded-xl p-4 mb-4">
      {/* TITLE */}
      <div className="text-lg font-semibold text-[#E8D5A8] mb-1">
        {item?.title || "Untitled Listing"}
      </div>

      {/* PROFIT POTENTIAL */}
      {typeof effectiveProfit === "number" && (
        <div className="text-sm mb-2">
          Potential Profit:{" "}
          <span className="text-[#E8D5A8] font-semibold">
            ${effectiveProfit}
          </span>
        </div>
      )}

      {/* DEMAND */}
      {demandLabel && (
        <div className="text-xs text-[#E8E1D0] opacity-80 mb-1">
          Demand: <span className="text-[#E8D5A8]">{demandLabel}</span>
        </div>
      )}

      {/* PRICE BAND */}
      {smartBands ? (
        <div className="text-xs text-[#E8E1D0] mb-2">
          Price Band:{" "}
          <span className="text-[#E8D5A8]">
            ${smartBands.floor}–${smartBands.ceiling}
          </span>{" "}
          (target ${smartBands.target})
        </div>
      ) : smartPriceRange ? (
        <div className="text-xs text-[#E8E1D0] mb-2">
          Price Band:{" "}
          <span className="text-[#E8D5A8]">
            ${smartPriceRange.min}–${smartPriceRange.max}
          </span>{" "}
          (target ${smartPriceRange.target})
        </div>
      ) : null}

      {/* SELLER INSIGHT */}
      <div className="text-xs opacity-80 text-[#E8E1D0] mb-1">
        Seller Insight: Strong upside if priced at the high end.
      </div>

      {/* BUYER HINT */}
      <div className="text-xs italic text-[#9AA0A6] mb-3">
        Buyer Tip:{" "}
        {buyerHint ||
          "If you're trying to buy, you may find softer pricing this week."}
      </div>

      {/* LINK TO LIVE LISTINGS */}
      {item?.title && (
        <a
          href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
            item.title
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[#E8D5A8] underline hover:opacity-90"
        >
          View Live Listings →
        </a>
      )}
    </div>
  );
}
