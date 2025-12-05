import { runTrendSenseUltra } from "./trendSenseUltra";

export async function runTrendSenseInfinity(library) {
  if (!library || library.length === 0) return null;

  const reports = [];

  // Run TrendSense ULTRA for every item
  for (const itm of library) {
    try {
      const ts = await runTrendSenseUltra(itm);
      if (ts) {
        reports.push({
          id: itm.id,
          item: itm,
          ts,
        });
      }
    } catch (err) {
      console.error("Infinity error:", err);
    }
  }

  if (reports.length === 0) return null;

  // 1 — Sort “List Next” by searchBoost + trendScore
  const listNext = [...reports]
    .sort(
      (a, b) =>
        b.ts.searchBoost + b.ts.trendScore -
        (a.ts.searchBoost + a.ts.trendScore)
    )
    .slice(0, 3);

  // 2 — Top Flip Potential (priceCeiling - priceFloor)
  const flipPotential = [...reports]
    .sort(
      (a, b) =>
        (b.ts.priceCeiling - b.ts.priceFloor) -
        (a.ts.priceCeiling - a.ts.priceFloor)
    )
    .slice(0, 3);

  // 3 — Hot tags across entire library
  const tagMap = {};
  for (const r of reports) {
    for (const t of r.item.tags || []) {
      tagMap[t] = (tagMap[t] || 0) + 1;
    }
  }
  const hotTags = Object.entries(tagMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    reports,
    listNext,
    flipPotential,
    hotTags,
  };
}

