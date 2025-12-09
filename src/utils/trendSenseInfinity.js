import { runTrendSenseUltra } from "./trendSenseUltra";

export async function runTrendSenseInfinity(library) {
  if (!library || library.length === 0) return null;

  const reports = [];

  // Run TrendSense ULTRA for every item
  for (const itm of library) {
    try {
      const ts = await runTrendSenseUltra(itm);
      if (ts) {
        const price = itm.price;
        const maxBand = ts.smartPriceRange?.max;
        const potentialProfit =
          typeof maxBand === "number" && typeof price === "number"
            ? Math.max(0, maxBand - price)
            : null;

        reports.push({
          id: itm.id,
          item: itm,
          ts: {
            ...ts,
            profitPotential: potentialProfit,
          },
        });
      }
    } catch (err) {
      console.error("Infinity error:", err);
    }
  }

  if (reports.length === 0) return null;

  const computeCategoryMomentum = (items) => {
    const buckets = {};

    items.forEach((r) => {
      const cat = r.item.category || "Other";
      if (!buckets[cat]) {
        buckets[cat] = { count: 0, score: 0 };
      }
      buckets[cat].count += 1;
      buckets[cat].score += r.ts.trendScore || 0;
    });

    const out = {};
    Object.entries(buckets).forEach(([cat, obj]) => {
      const avg = Math.round(obj.score / obj.count);

      out[cat] = {
        score: avg,
        direction:
          avg > 66 ? "Rising" : avg > 40 ? "Steady" : "Falling",
      };
    });

    return out;
  };

  const computeCategoryCurves = (items) => {
    const curves = {};

    items.forEach((r) => {
      const cat = r.item.category || "Other";
      if (!curves[cat]) {
        curves[cat] = [];
      }
      curves[cat].push(r.ts.trendScore || 0);
    });

    const out = {};
    Object.entries(curves).forEach(([cat, scores]) => {
      if (!scores.length) {
        out[cat] = [];
        return;
      }

      const today = Math.round(
        scores.reduce((sum, v) => sum + v, 0) / scores.length
      );

      const base = Number.isFinite(today) ? today : 0;

      const curve = [
        base - 8,
        base - 4,
        base - 2,
        base,
        base + 3,
        base + 7,
        base + 5,
      ].map((v) => Math.max(0, Math.min(100, v)));

      out[cat] = curve;
    });

    return out;
  };

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
    .slice(0, 10)
    .map(([keyword, count]) => ({
      keyword,
      score: count,
    }));

  return {
    reports,
    listNext,
    flipPotential,
    hotTags,
    categoryMomentum: computeCategoryMomentum(reports),
    categoryCurves: computeCategoryCurves(reports),
  };
}
