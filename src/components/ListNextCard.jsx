import React from "react";

export default function ListNextCard({ report }) {
  if (!report) return null;

  const { item, ts } = report;
  const demandLabel = ts?.demandLabel || "steady";
  const smartBands = ts?.smartBands;
  const smartPriceRange = ts?.smartPriceRange;
  const buyerHint = ts?.buyerHint;

  return (
    <div className="lux-bento-card bg-[#0A0D0F] border border-[#2A2F33] rounded-xl p-4 mb-4">
      {/* Title */}
      <div className="text-lg font-semibold text-[#E8D5A8] mb-1">
        {item?.title || "Untitled Listing"}
      </div>

      {/* Demand Label */}
      <div className="text-xs text-[#E8E1D0] opacity-80 mb-2">
        Demand: <span className="text-[#E8D5A8]">{demandLabel}</span>
      </div>

      {/* Price Band */}
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

      {/* Seller Insight */}
      <div className="text-xs opacity-80 text-[#E8E1D0] mb-1">
        Seller Insight: Strong momentum — ideal to list next.
      </div>

      {/* Buyer Hint */}
      <div className="text-xs italic text-[#9AA0A6] mb-3">
        Buyer Tip:{" "}
        {buyerHint ||
          "If you're trying to buy, you may find softer pricing this week."}
      </div>

      {/* Link */}
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
