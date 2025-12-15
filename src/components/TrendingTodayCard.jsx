import React from "react";

const HEADLINE_RECENCY_LIMIT_DAYS = 21;

function formatRelativeDate(dateStr) {
  if (!dateStr) return "recent";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "recent";
  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? "just now" : `${diffMinutes} mins ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
}

function isHeadlineRecent(headline) {
  if (!headline?.publishedAt) return false;
  const parsed = Date.parse(headline.publishedAt);
  if (Number.isNaN(parsed)) return false;
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24))
  );
  return diffDays <= HEADLINE_RECENCY_LIMIT_DAYS;
}

export default function TrendingTodayCard({ report }) {
  if (!report) return null;

  const { item, trendScore, eventHeadline, buyerHint, trendGuidance } = report;
  const guidanceAction = trendGuidance?.action || "Hold";
  const guidanceReason =
    trendGuidance?.reason ||
    "No major headlines tied to this item — pricing usually stays steady.";
  const supportingHeadlines = (report.eventHeadlines || []).filter(
    (headline) => !headline.isHistorical && isHeadlineRecent(headline)
  );

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
        Seller Insight:{" "}
        <span className="text-[#E8D5A8] font-semibold">{guidanceAction}</span>
      </div>
      <div className="text-xs text-[#9AA0A6] mb-2">
        {guidanceReason}
      </div>

      {/* BUYER HINT */}
      <div className="text-xs text-[#9AA0A6] italic mb-3">
        Buyer Tip:{" "}
        {buyerHint ||
          "If you're trying to buy, you may find softer pricing this week."}
      </div>

      {supportingHeadlines.length > 0 && (
        <div className="border-t border-white/10 pt-3 mt-3">
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-1">
            Headlines powering this
          </div>
          <div className="space-y-1 text-[11px] text-[#9AA0A6]">
            {supportingHeadlines.slice(0, 3).map((headline, idx) => (
              <div key={`${headline.title || idx}-${idx}`}>
                {headline.link ? (
                  <a
                    href={headline.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#E8D5A8] hover:opacity-80"
                  >
                    {headline.source || "Source"}
                  </a>
                ) : (
                  <span className="text-[#E8D5A8]">
                    {headline.source || "Source"}
                  </span>
                )}
                <span className="opacity-80"> — {headline.title}</span>
                <span className="opacity-40 ml-1">
                  • {formatRelativeDate(headline.publishedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
