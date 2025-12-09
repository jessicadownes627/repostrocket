import React from "react";

export default function TrendingTodayCard({ report }) {
  if (!report) return null;

  const { item, trendScore, eventHeadline, buyerHint } = report;

  return (
    <div className="lux-bento-card bg-[#0A0D0F] border border-[#2A2F33] rounded-xl p-4 mb-4">
      {/* TITLE */}
      <div className="text-lg font-semibold text-[#E8D5A8] mb-1">
        {item?.title || "Untitled Listing"}
      </div>

      {/* EVENT / HEADLINE */}
      {eventHeadline && (
        <div className="text-xs text-[#C7B693] italic mb-2">
          {eventHeadline}
        </div>
      )}

      {/* TREND SCORE */}
      <div className="text-sm text-[#E8E1D0] mb-2">
        Trend Score:{" "}
        <span className="text-[#E8D5A8] font-semibold">
          {typeof trendScore === "number" ? trendScore : "—"}
        </span>
      </div>

      {/* SELLER LINE */}
      <div className="text-xs text-[#E8E1D0] opacity-80 mb-1">
        Seller Insight: Great time to list this.
      </div>

      {/* BUYER HINT */}
      <div className="text-xs text-[#9AA0A6] italic mb-3">
        Buyer Tip:{" "}
        {buyerHint ||
          "If you're trying to buy, you may find softer pricing this week."}
      </div>

      {/* LINK OUT */}
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

