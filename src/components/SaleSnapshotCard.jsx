import React from "react";
import Sparkline from "./Sparkline";

function formatDate(value) {
  if (!value) return "";
  const d =
    typeof value === "number"
      ? new Date(value)
      : new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function SaleSnapshotCard({ item, snapshot }) {
  if (!snapshot) return null;

  const { smartPriceRange, soldPrice } = snapshot;
  const target = smartPriceRange?.target;

  let comparisonText = "";
  if (soldPrice != null && target != null) {
    const diff = soldPrice - target;
    const pct =
      target > 0 ? Math.round((diff / target) * 100) : 0;
    if (pct > 0) {
      comparisonText = `Sold ${pct}% above target.`;
    } else if (pct < 0) {
      comparisonText = `Sold ${Math.abs(pct)}% below target.`;
    } else {
      comparisonText = "Sold right at target.";
    }
  }

  return (
    <div className="lux-bento-card p-4 border border-[#E8D5A8] rounded-xl mb-4 bg-[#050807]">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs bg-[#E8D5A8] text-black px-2 py-1 rounded">
          SOLD{soldPrice != null ? ` for $${soldPrice}` : ""}
        </span>
        {snapshot.soldDate && (
          <span className="text-xs opacity-60">
            {formatDate(snapshot.soldDate)}
          </span>
        )}
      </div>

      <div className="text-sm font-semibold mb-2">
        {item.title || "Untitled Listing"}
      </div>

      <Sparkline points={snapshot.sparkline || []} />

      {snapshot.trendScoreAtSale != null && (
        <div className="text-xs opacity-70 mt-3">
          TrendScore at sale: {snapshot.trendScoreAtSale}
        </div>
      )}

      {snapshot.demandLabel && (
        <div className="text-xs opacity-70">
          Demand: {snapshot.demandLabel}
        </div>
      )}

      {smartPriceRange && (
        <div className="text-xs opacity-70 mt-2">
          Price band at sale: ${smartPriceRange.min}–$
          {smartPriceRange.max} (target $
          {smartPriceRange.target})
        </div>
      )}

      {soldPrice != null && (
        <div className="text-xs opacity-70">
          Sold at: ${soldPrice}
        </div>
      )}

      {comparisonText && (
        <div className="text-xs opacity-70 mt-1">
          {comparisonText}
        </div>
      )}

      {snapshot.eventHeadline && (
        <div className="text-xs opacity-70 mt-2">
          News at the time: {snapshot.eventHeadline}
        </div>
      )}

      {snapshot.nextSuggestion && (
        <div className="text-xs opacity-70 mt-3">
          Next move: {snapshot.nextSuggestion.title}
        </div>
      )}
    </div>
  );
}

