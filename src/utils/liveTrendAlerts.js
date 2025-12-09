// Live Trend Alerts engine
// Produces a lightweight array of alert objects:
// { type, message, itemId }

export function getLiveTrendAlerts(reports) {
  const alerts = [];

  if (!Array.isArray(reports)) return alerts;

  for (const rep of reports) {
    const { item, trendScore, eventLinked, eventHeadline, ts } = rep || {};

    if (!item || !ts) continue;

    // 1) News/Event spike
    if (eventLinked && eventHeadline) {
      alerts.push({
        type: "event-spike",
        itemId: item.id,
        message: `${item.title}: ${eventHeadline}`,
      });
    }

    // 2) Demand surge
    if (ts.demandLabel === "peak") {
      alerts.push({
        type: "demand-peak",
        itemId: item.id,
        message: `${item.title}: demand is at its peak today.`,
      });
    }

    // 3) TrendScore spike
    if (typeof trendScore === "number" && trendScore >= 80) {
      alerts.push({
        type: "trend-surge",
        itemId: item.id,
        message: `${item.title}: trend score surged to ${trendScore}.`,
      });
    }

    // 4) Category momentum alert (if present on ts)
    if (ts.categoryMomentum === "rising") {
      alerts.push({
        type: "category-rising",
        itemId: item.id,
        message: `${item.category}: category is heating up — great timing.`,
      });
    }
  }

  return alerts;
}

