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
    const eventHeadlines = rep?.eventHeadlines || [];

    const recentHeadlines = (eventHeadlines || []).filter(
      (headline) => !headline.isHistorical
    );

    if (eventLinked && eventHeadline && recentHeadlines.length) {
      alerts.push({
        type: "event-spike",
        itemId: item.id,
        message: `${item.title}: ${eventHeadline}`,
        headlines: recentHeadlines.slice(0, 3),
      });
    }

    // 2) Demand surge
    if (ts.demandLabel === "peak" && recentHeadlines.length) {
      alerts.push({
        type: "demand-peak",
        itemId: item.id,
        message: `${item.title}: demand is at its peak today.`,
        headlines: recentHeadlines.slice(0, 2),
      });
    }

    // 3) TrendScore spike
    if (
      typeof trendScore === "number" &&
      trendScore >= 80 &&
      recentHeadlines.length
    ) {
      alerts.push({
        type: "trend-surge",
        itemId: item.id,
        message: `${item.title}: trend score surged to ${trendScore}.`,
        headlines: recentHeadlines.slice(0, 2),
      });
    }

    // 4) Category momentum alert (if present on ts)
    if (ts.categoryMomentum === "rising" && recentHeadlines.length) {
      alerts.push({
        type: "category-rising",
        itemId: item.id,
        message: `${item.category}: category is heating up — great timing.`,
        headlines: recentHeadlines.slice(0, 2),
      });
    }
  }

  return alerts;
}
