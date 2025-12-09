import React from "react";

export default function CategoryMomentumCard({ category, data }) {
  if (!data) return null;

  const { score, direction, trend: incomingTrend, insight: incomingInsight } =
    data;

  // Derive a simple trend keyword from direction if not provided
  let trend = incomingTrend;
  if (!trend && direction) {
    const d = String(direction).toLowerCase();
    if (d.includes("rise")) trend = "up";
    else if (d.includes("fall")) trend = "down";
    else trend = "flat";
  }

  // Derive a default insight if none provided
  let insight = incomingInsight;
  if (!insight) {
    if (trend === "up") {
      insight =
        "Demand is trending up — items here may sell faster at stronger prices.";
    } else if (trend === "down") {
      insight =
        "Demand is softening — expect a bit more negotiation on price.";
    } else {
      insight =
        "Category is holding steady — pricing is behaving as expected.";
    }
  }

  return (
    <div className="lux-bento-card p-4 mb-4 border border-[#26292B] rounded-xl bg-[#0B0D0F]">
      <div className="flex items-center justify-between mb-2">
        <div className="text-base font-medium">
          {category || "Other"}
        </div>
        <div
          className={`text-sm ${
            trend === "up"
              ? "text-[#D7C28A]"
              : trend === "down"
              ? "text-[#C47A7A]"
              : "text-[#8B8D8E]"
          }`}
        >
          {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
        </div>
      </div>

      <div className="text-xs opacity-60 mb-3">
        Momentum Score:{" "}
        <span className="opacity-100">{score ?? "—"}</span>
      </div>

      <div className="text-xs opacity-60 mb-3">{insight}</div>

      <div className="text-xs opacity-60">
        Buyer Tip:{" "}
        {trend === "up"
          ? "Expect fewer deals — rising demand."
          : trend === "down"
          ? "Great time to negotiate — softer demand."
          : "Steady pricing — nothing surprising this week."}
      </div>
    </div>
  );
}

