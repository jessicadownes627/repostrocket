import React from "react";

export default function HotTagCard({ tag }) {
  if (!tag) return null;

  const { keyword, score } = tag;

  return (
    <div className="lux-bento-card p-4 mb-3 border border-[#26292B] rounded-xl bg-[#0B0D0F]">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-base">
          {keyword || "Tag"}
        </div>
        <div className="text-xs opacity-70">
          Heat: {typeof score === "number" ? score : "—"}
        </div>
      </div>

      <div className="text-xs opacity-70 mb-2">
        Sellers: High buyer activity — prices move quickly here.
      </div>

      <div className="text-xs opacity-60 mb-3">
        Buyers: Expect fewer deals this week — trending tags get sniped fast.
      </div>

      {keyword && (
        <a
          href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
            keyword
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline opacity-70 hover:opacity-100"
        >
          View Live Listings →
        </a>
      )}
    </div>
  );
}

