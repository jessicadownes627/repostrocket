import React from "react";

export default function SmartPriceBandCard({ entry }) {
  if (!entry) return null;

  const { item, ts } = entry;
  const range = ts?.smartPriceRange;

  if (!item || !range) return null;

  const { min, target, max } = range;

  return (
    <div className="lux-bento-card p-4 mb-4 border border-[#26292B] rounded-xl bg-[#0B0D0F]">
      <div className="text-base font-medium mb-1">
        {item.title || "Untitled Listing"}
      </div>

      <div className="text-xs opacity-60 mb-4">
        Ideal pricing based on similar sell-throughs and real-time demand.
      </div>

      <div className="flex items-center justify-between text-sm mb-3">
        <div className="flex flex-col">
          <span className="opacity-50">Min</span>
          <span>${min}</span>
        </div>
        <div className="flex flex-col text-[#E4D3A1] font-semibold">
          <span className="opacity-50">Target</span>
          <span>${target}</span>
        </div>
        <div className="flex flex-col">
          <span className="opacity-50">Max</span>
          <span>${max}</span>
        </div>
      </div>

      <div className="text-xs opacity-60 mb-3">
        Seller: Price at target for fastest sell-through.
      </div>

      <div className="text-xs opacity-60 mb-3">
        Buyer: Deals appear below <strong>${min}</strong>. Watch for underpriced
        listings.
      </div>

      {item.title && (
        <a
          href={`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(
            item.title
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs underline opacity-60 hover:opacity-100"
        >
          View live listings →
        </a>
      )}
    </div>
  );
}

