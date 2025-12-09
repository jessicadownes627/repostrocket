// Smart Price Band Engine
// Computes floor, target (fair), ceiling, and negotiation risk
// based on item info, TrendSense signals, and optional comps.

export function computeSmartPriceBands(item, ts, comps = []) {
  if (!ts) return null;

  // 1. Extract basics
  const demand = ts.demandLabel || "steady";
  const trend = ts.trendScore || 50;
  const eventImpact = ts.eventLinked ? 10 : 0;

  // 2. Extract comp prices (filter obvious outliers / trash)
  const sold = (comps || [])
    .map((c) => c.price)
    .filter((p) => typeof p === "number" && p > 5 && p < 2000);

  const compMin = sold.length ? Math.min(...sold) : null;
  const compMax = sold.length ? Math.max(...sold) : null;
  const compAvg = sold.length
    ? Math.round(sold.reduce((a, b) => a + b, 0) / sold.length)
    : null;

  // 3. Base price anchor (choose the best available source)
  const anchor =
    (typeof item?.price === "number" && item.price) ||
    compAvg ||
    compMin ||
    20; // fallback baseline if nothing exists

  // 4. Trend multipliers
  let multiplier = 1;

  if (trend >= 85) multiplier += 0.12;
  else if (trend >= 70) multiplier += 0.07;
  else if (trend >= 55) multiplier += 0.03;

  if (demand === "peak") multiplier += 0.1;
  if (demand === "high") multiplier += 0.05;

  multiplier += eventImpact / 100; // event adds up to ~10%

  // 5. Compute bands
  const floor = Math.max(
    5,
    Math.round(
      (compMin || anchor * 0.8) * (trend < 40 ? 0.95 : 1)
    )
  );

  const fair = Math.round(anchor * multiplier);

  const peak = Math.round(
    (compMax || fair * 1.2) * (multiplier + 0.05)
  );

  // 6. Negotiation Risk
  let negotiationRisk = "medium";
  if (trend >= 80 && demand === "peak") negotiationRisk = "low";
  else if (trend < 50) negotiationRisk = "high";
  else if (trend < 35) negotiationRisk = "severe";

  return {
    floor,
    target: fair,
    ceiling: peak,
    anchor,
    negotiationRisk,
    compsUsed: sold.length,
  };
}

