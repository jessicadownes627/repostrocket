// src/utils/salesMonitor.js
// Builds seller-facing alerts from existing TrendSense ULTRA results

// report here is the object produced in TrendSenseDashboard: { item, ...ts }
export function analyzeListingForAlerts(report) {
  if (!report) return null;

  const {
    item,
    trendScore,
    smartPriceRange,
    eventLinked,
    eventHeadline,
  } = report;

  const alerts = [];

  // 1) Price raise suggestion – high trend score, strong band
  if (trendScore > 70 && smartPriceRange?.target) {
    alerts.push({
      type: "price-raise",
      message: `Demand is rising fast — consider raising price to $${smartPriceRange.target}.`,
    });
  }

  // 2) Price drop suggestion – weak trend score
  if (trendScore < 40 && smartPriceRange?.min) {
    alerts.push({
      type: "price-drop",
      message: `Market softened — dropping price toward $${smartPriceRange.min} may help.`,
    });
  }

  // 3) Event spike / news headline
  if (eventLinked && eventHeadline) {
    alerts.push({
      type: "event",
      message: `News spike detected: “${eventHeadline}”. Expect surge in search traffic.`,
    });
  }

  // 4) Stale listing (based on savedAt/createdAt)
  const ageDays = getAgeInDays(item?.createdAt || item?.savedAt);
  if (ageDays > 14) {
    alerts.push({
      type: "stale",
      message: `This listing is ${ageDays} days old — a small price refresh can help visibility.`,
    });
  }

  // Simple sparkline based on trendScore for visual context
  const base = typeof trendScore === "number" ? trendScore : 50;
  const sparkline = [
    base - 8,
    base - 4,
    base - 2,
    base,
    base + 3,
    base + 6,
    base + 4,
  ].map((v) => Math.max(0, Math.min(100, v)));

  return {
    alerts,
    trendScore,
    smartPriceRange,
    eventLinked,
    eventHeadline,
    sparkline,
  };
}

function getAgeInDays(dateValue) {
  if (!dateValue) return 0;
  const ts =
    typeof dateValue === "number"
      ? dateValue
      : new Date(dateValue).getTime() || 0;
  if (!ts) return 0;
  const ms = Date.now() - ts;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

