import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";
import { runTrendSenseUltra } from "../utils/trendSenseUltra";
import { loadListingLibrary } from "../utils/savedListings";
import { getLiveTrendAlerts } from "../utils/liveTrendAlerts";
import Sparkline from "../components/Sparkline";
import TrendingTodayCard from "../components/TrendingTodayCard";
import ListNextCard from "../components/ListNextCard";
import FlipPotentialCard from "../components/FlipPotentialCard";
import HotTagCard from "../components/HotTagCard";
import SmartPriceBandCard from "../components/SmartPriceBandCard";
import CategoryMomentumCard from "../components/CategoryMomentumCard";
import TrendSenseSearchPanel from "../components/TrendSenseSearchPanel";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";
import {
  trendingPairs,
  trendingOpportunities,
} from "../data/trendingOpportunities";
import {
  IconFlame,
  IconChart,
  IconFlip,
  IconBolt,
  IconPrice,
  IconBrain,
} from "../components/LuxIcons";

const HEADLINE_RECENCY_LIMIT_DAYS = 21;

function formatRelativeDate(dateStr) {
  if (!dateStr) return "recent";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "recent";
  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? "just now" : `${diffMinutes} mins ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  return diffWeeks === 1 ? "1 week ago" : `${diffWeeks} weeks ago`;
}

function getDaysSince(dateStr) {
  if (!dateStr) return null;
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.floor((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

function isHeadlineRecent(headline) {
  const days = getDaysSince(headline?.publishedAt);
  if (days == null) return false;
  return days <= HEADLINE_RECENCY_LIMIT_DAYS;
}

function hasRecentCatalystHeadlines(headlines = []) {
  return headlines.some(
    (headline) => !headline?.isHistorical && isHeadlineRecent(headline)
  );
}

function formatLastCheckedText(daysSinceHeadline, fallbackTime) {
  if (daysSinceHeadline == null || daysSinceHeadline <= 0) {
    return `Today at ${fallbackTime}`;
  }
  if (daysSinceHeadline === 1) return "1 day ago";
  return `${daysSinceHeadline} days ago`;
}

function getActionExplainer(action) {
  const map = {
    Hold: "No catalyst detected — pricing stability confirmed.",
    Watch: "Monitoring catalysts — prepare to act if signals strengthen.",
    Increase: "Demand catalyst detected — lean into pricing confidence.",
    Decrease: "Cooling demand detected — consider pricing protection.",
  };
  return map[action] || "Monitoring catalysts in real time.";
}

const SAMPLE_REPORTS = [
  {
    item: { id: "sample-1", title: "90s Starter Chicago Bulls Jacket" },
    trendScore: 82,
    eventLinked: true,
    eventHeadline: "Playoff spike pushing prices 30% higher",
    eventHeadlines: [
      {
        source: "ESPN",
        title: "Bulls push for playoffs fuels merch sales",
        publishedAt: "2025-01-07T12:00:00Z",
        link: "https://www.espn.com",
        isHistorical: false,
      },
      {
        source: "CNBC",
        title: "Chicago sports gear sees surge",
        publishedAt: "2025-01-06T09:00:00Z",
        link: "https://www.cnbc.com",
        isHistorical: false,
      },
    ],
    buyerHint: "List before tonight's tipoff for peak demand.",
    trendGuidance: {
      action: "Increase",
      reason: "Bulls playoff chatter is filling feeds. Based on 2 recent headlines.",
      headlineCount: 2,
      daysSinceHeadline: 1,
    },
    ts: {
      demandLabel: "Heating",
      smartBands: { floor: 110, target: 135, ceiling: 160 },
      smartPriceRange: { min: 110, target: 135, max: 160 },
      buyerHint: "BIN + watchers captures the premium right now.",
      profitPotential: 45,
    },
  },
];

const SAMPLE_INFINITY = {
  listNext: SAMPLE_REPORTS,
  flipPotential: [
    {
      item: { id: "sample-2", title: "Shohei Rookie Chrome PSA 9", price: 95 },
      ts: {
        demandLabel: "Hot",
        smartBands: { floor: 140, target: 165, ceiling: 190 },
        smartPriceRange: { min: 140, target: 165, max: 190 },
        buyerHint: "Opening week buzz is fueling bids.",
        profitPotential: 70,
      },
    },
  ],
  hotTags: [
    { keyword: "starter jacket", score: 78 },
    { keyword: "shohei rookie", score: 83 },
  ],
  categoryMomentum: {
    "Vintage Outerwear": {
      score: 72,
      direction: "rise",
      trend: "up",
      insight: "NBA playoff merch is driving traffic.",
    },
  },
  reports: SAMPLE_REPORTS.map((rep) => ({
    ...rep,
  })),
};

const SAMPLE_ALERTS = [
  {
    message: "Starter jackets up +45% week over week in Chicago.",
    headlines: [
      {
        source: "Retail Dive",
        title: "Vintage merch jumps during playoff runs",
        publishedAt: "2025-01-06T00:00:00Z",
        link: "https://www.retaildive.com",
      },
    ],
  },
];

export default function TrendSenseDashboard() {
  const [reports, setReports] = useState([]);
  const [infinity, setInfinity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState(null);
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const [hasAccess, setHasAccess] = useState(false);
  const [openListingId, setOpenListingId] = useState(null);

  useEffect(() => {
    const allowed = gate("trendsense", () => setHasAccess(true));
    if (!allowed) {
      setHasAccess(false);
      setReports(SAMPLE_REPORTS);
      setInfinity(SAMPLE_INFINITY);
      setAlerts(SAMPLE_ALERTS);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasAccess !== true) return;
    async function load() {
      const items = loadListingLibrary() || [];
      if (!items.length) {
        setReports([]);
        setInfinity({
          reports: [],
          listNext: [],
          flipPotential: [],
          hotTags: [],
          categoryMomentum: {},
        });
        setLoading(false);
        return;
      }

      const rep = [];
      for (const item of items) {
        const r = await runTrendSenseUltra(item);
        if (r) {
          rep.push({ item, ...r });
        }
      }

      const inf =
        (await runTrendSenseInfinity(items)) || {
          reports: [],
          listNext: [],
          flipPotential: [],
          hotTags: [],
          categoryMomentum: {},
        };

      const alertList = getLiveTrendAlerts(rep);

      setReports(rep);
      setInfinity(inf);
      setAlerts(alertList);
      setLoading(false);
    }
    load();
  }, [hasAccess]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050807] text-[#E8E1D0] p-6">
        Loading TrendSense…
      </div>
    );
  }

  const trendingToday = reports.filter((r) => r.eventLinked);
  const listNext = infinity.listNext || [];
  const flipPotential = infinity.flipPotential || [];
  const hotTags = infinity.hotTags || [];
  const savedListingCount = reports.length;
  const categorySet = new Set(
    reports.map((r) => (r.item?.category || "").trim()).filter(Boolean)
  );
  const hasCategoryMomentum =
    infinity?.categoryMomentum &&
    Object.keys(infinity.categoryMomentum).length > 0;
  const smartPriceEntries =
    infinity?.reports?.filter((rep) => rep.ts?.smartPriceRange) || [];

  const actionableAlerts = Array.isArray(alerts)
    ? alerts
        .map((a) => {
          const recentHeadlines = (a.headlines || []).filter(
            (headline) => !headline.isHistorical && isHeadlineRecent(headline)
          );
          if (!recentHeadlines.length) return null;
          return { ...a, headlines: recentHeadlines.slice(0, 3) };
        })
        .filter(Boolean)
    : [];
  const canShowListNext =
    savedListingCount >= 1 &&
    hasCategoryMomentum &&
    Array.isArray(listNext) &&
    listNext.length > 0;
  const canShowFlipPotential =
    savedListingCount >= 2 &&
    Array.isArray(flipPotential) &&
    flipPotential.length > 0;
  const canShowAlerts = actionableAlerts.length > 0;
  const canShowSmartPrice =
    savedListingCount >= 1 && smartPriceEntries.length > 0;
  const canShowCategoryMomentum =
    savedListingCount >= 3 && categorySet.size >= 2 && hasCategoryMomentum;
  const canShowHotTags =
    savedListingCount >= 2 &&
    Array.isArray(hotTags) &&
    hotTags.length > 0;
  const previewGuidance =
    reports[0]?.trendGuidance || {
      action: "Hold",
      reason:
        "TrendSense watches your saved listings and adapts as you add more cards, apparel, and collectibles.",
      headlineCount: 0,
      daysSinceHeadline: null,
    };
  const filteredTrendingPairs = trendingPairs.filter((pair) => {
    const leftRecent = hasRecentCatalystHeadlines(pair.left.headlines || []);
    const rightRecent = hasRecentCatalystHeadlines(pair.right.headlines || []);
    return leftRecent || rightRecent;
  });
  const trendingPair = filteredTrendingPairs[0] || null;
  const filteredOpportunities = trendingOpportunities.filter((item) =>
    hasRecentCatalystHeadlines(item.headlines || [])
  );
  const previewGuidanceDetail =
    previewGuidance.headlineCount > 0
      ? `Based on ${previewGuidance.headlineCount} recent headline${
          previewGuidance.headlineCount > 1 ? "s" : ""
        }.`
      : previewGuidance.daysSinceHeadline != null
      ? `Monitoring — no demand-shifting headlines in the last ${previewGuidance.daysSinceHeadline} days.`
      : "Monitoring — no recent demand-shifting news detected.";
  const currentTimeLabel = new Date().toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const lastCheckedCopy = formatLastCheckedText(
    previewGuidance.daysSinceHeadline,
    currentTimeLabel
  );
  const guidanceSources = previewGuidance.headlineCount ?? 0;
  const reassuranceCopy = `Last checked: ${lastCheckedCopy} • Sources scanned: ${guidanceSources}`;
  const actionExplainer = getActionExplainer(previewGuidance.action);
  const renderHeadlineList = (headlines) => {
    if (!Array.isArray(headlines) || !headlines.length) return null;
    return (
      <div className="mt-3 space-y-1 text-[11px] text-white/60">
        {headlines.slice(0, 3).map((headline, idx) => {
          const isHistorical =
            headline.isHistorical ??
            !isHeadlineRecent(headline);
          return (
            <div key={`${headline.title || idx}-${idx}`}>
              {headline.link ? (
                <a
                  href={headline.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#E8D5A8] hover:opacity-80"
                >
                  {headline.source || "Source"}
                </a>
              ) : (
                <span className="text-[#E8D5A8]">
                  {headline.source || "Source"}
                </span>
              )}
              <span className="opacity-80"> — {headline.title}</span>
              <span className="opacity-40 ml-1">
                • {formatRelativeDate(headline.publishedAt)}
              </span>
              {isHistorical && (
                <span className="ml-2 text-[#E57373] uppercase tracking-[0.25em] text-[9px]">
                  Historical
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="sparkly-header header-glitter text-3xl mb-3">
          TrendSense
        </h1>
        <p className="text-sm opacity-70 mb-8">
          Live demand signals, category momentum, and smart “list next”
          insights for your saved listings.
        </p>
        {hasAccess === false && (
          <div className="text-xs uppercase tracking-[0.35em] text-center text-white/60 bg-black/30 border border-white/10 rounded-full py-2 mb-6">
            Preview mode — upgrade to Premium for live TrendSense data.
          </div>
        )}

        {/* TrendSense Preview */}
        <div className="lux-bento-card bg-[#05090C] border border-[#1D252C] rounded-2xl p-6 mb-10 relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 bg-gradient-to-r from-transparent via-[#0b2a23]/40 to-transparent animate-pulse-slow"></div>
          <div className="relative z-10 grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)] items-start">
            <div>
              <div className="flex items-center gap-3 text-xs uppercase tracking-[0.35em] text-white/60">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(19,236,158,0.5)] animate-pulse"></span>
                TrendSense Preview
                <MonitoringBadge active label="Live" />
              </div>
              <div className="text-sm text-white/75 mt-2">
                Watching headlines, comps, and saved listings.
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-[13px] text-white/80 leading-relaxed mt-5">
                {previewGuidance.reason}
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {previewGuidanceDetail && (
                  <HelperChip>{previewGuidanceDetail}</HelperChip>
                )}
                <HelperChip>
                  TrendSense adapts as you add cards, apparel, or collectibles.
                </HelperChip>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                <HelperChip>{reassuranceCopy}</HelperChip>
                <HelperChip>
                  What would trigger this? A verified catalyst within 21 days or
                  a new marketplace event.
                </HelperChip>
              </div>
            </div>
            <GuidancePanel
              action={previewGuidance.action}
              explainer={actionExplainer}
              detail={previewGuidanceDetail}
            />
          </div>
        </div>

        {/* 🔎 TrendSense Search */}
        <div className="mt-8 mb-12">
          <TrendSenseSearchPanel disabled={hasAccess === false} />
        </div>

        {/* Your Listings */}
        <div className="mt-6 mb-12">
          <div className="flex items-center justify-between mb-2">
            <h2 className="sparkly-header text-2xl">Your Listings</h2>
            <MonitoringBadge
              active={reports.length > 0}
              label={reports.length > 0 ? "Tracking" : "Monitoring"}
            />
          </div>
          <p className="text-xs opacity-60 mb-4">
            Each saved listing gets a live status — expand any row for evidence.
          </p>

          {reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((report, index) => {
                const id = report.item?.id ?? `report-${index}`;
                return (
                  <ListingGuidanceItem
                    key={id}
                    report={report}
                    isOpen={openListingId === id}
                    onToggle={() =>
                      setOpenListingId(openListingId === id ? null : id)
                    }
                  />
                );
              })}
            </div>
          ) : (
            <EmptyStateCard
              title="No saved listings yet."
              helper="Add a listing and TrendSense will start monitoring it instantly."
            />
          )}
        </div>

        {/* 🔥 Trending Today Panel */}
        <div className="mt-6 mb-10">
          <div className="flex items-center justify-between mb-2">
            <h2 className="sparkly-header text-2xl">
              Trending Today
            </h2>
            <MonitoringBadge
              active={trendingToday.length > 0}
              label={trendingToday.length > 0 ? "Signal live" : "Monitoring"}
            />
          </div>
          <p className="text-xs opacity-60 mb-4">
            Items seeing the strongest real-time momentum.
          </p>

          {trendingToday.length > 0 ? (
            trendingToday.slice(0, 5).map((rep) => (
              <TrendingTodayCard key={rep.item.id} report={rep} />
            ))
          ) : (
            <EmptyStateCard
              title="Monitoring — no recent demand-shifting news detected."
              helper="TrendSense will surface picks the moment a catalyst hits."
            />
          )}
        </div>

        {/* SIDE-BY-SIDE TRENDING DUO */}
        <Section
          title={
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <IconFlame />
                Today’s Trending Duo
              </div>
              <MonitoringBadge
                active={Boolean(trendingPair)}
                label={trendingPair ? "Signal live" : "Monitoring"}
              />
            </div>
          }
        >
      {trendingPair ? (
        <div className="grid grid-cols-2 gap-4">
              {/* LEFT BOX */}
              <div className="bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4">
                <div className="text-xs uppercase opacity-60 mb-1">
                  Do you have this?
                </div>
                <Title>{trendingPair.left.title}</Title>
                <Details>{trendingPair.left.reason}</Details>
                <Details className="opacity-60 text-xs mt-1">
                  Category: {trendingPair.left.category}
                </Details>
                {renderHeadlineList(trendingPair.left.headlines)}
                <button
                  className="mt-3 text-xs px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                  onClick={() => navigate("/prep")}
                >
                  Add Listing
                </button>
              </div>

              {/* RIGHT BOX */}
              <div className="bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4">
                <div className="text-xs uppercase opacity-60 mb-1">
                  No? You definitely have this.
                </div>
                <Title>{trendingPair.right.title}</Title>
                <Details>{trendingPair.right.reason}</Details>
                <Details className="opacity-60 text-xs mt-1">
                  Category: {trendingPair.right.category}
                </Details>
                {renderHeadlineList(trendingPair.right.headlines)}
                <button
                  className="mt-3 text-xs px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                  onClick={() => navigate("/prep")}
                >
                  Add Listing
                </button>
              </div>
        </div>
      ) : (
            <EmptyStateCard
              title="No strong momentum signals this week — TrendSense will surface a duo when new headlines break."
              helper="Triggered by two listings with fresh catalyst headlines."
            />
          )}
        </Section>

        {/* OPPORTUNITY PANEL — Only if no saved listings */}
        {reports.length === 0 && (
          <Section
            title={
              <>
                <IconFlame />
                Trending Opportunities
              </>
            }
          >
            {filteredOpportunities.length > 0 ? (
              filteredOpportunities.map((op, i) => (
                <Card key={i}>
                  <Title>{op.title}</Title>
                  <Details>{op.reason}</Details>
                  <Details className="opacity-60 text-xs mt-1">
                    Category: {op.category}
                  </Details>
                  {renderHeadlineList(op.headlines)}

                  <div className="flex gap-3 mt-3 text-xs">
                    <button
                      className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
                      onClick={() => navigate("/prep")}
                    >
                      Add Your First Listing
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <EmptyStateCard
                title="Monitoring — no breakout opportunities yet."
                helper="Triggered by at least one saved listing plus a fresh, demand-shifting headline."
              />
            )}
          </Section>
        )}

        {canShowListNext && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">List Next</h2>
            <p className="text-xs opacity-60 mb-4">
              Based on demand, price signals, and category momentum.
            </p>
            {listNext.slice(0, 5).map((entry) => (
              <ListNextCard key={entry.id} report={entry} />
            ))}
          </div>
        )}

        {canShowFlipPotential && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">
              Flip Potential
            </h2>
            <p className="text-xs opacity-60 mb-4">
              High-upside items with strong sell-through signals.
            </p>
            {flipPotential.slice(0, 5).map((entry) => (
              <FlipPotentialCard key={entry.id} report={entry} />
            ))}
          </div>
        )}

        {canShowAlerts && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">
              Live Trend Alerts
            </h2>
            {actionableAlerts.map((alert, i) => (
              <div
                key={`${alert.itemId || i}-${i}`}
                className="text-sm text-[#E8E1D0] mb-4"
              >
                <div className="font-semibold text-[#E8D5A8]">
                  • {alert.message}
                </div>
                {renderHeadlineList(alert.headlines)}
              </div>
            ))}
          </div>
        )}

        {canShowSmartPrice && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">
              Smart Price Bands
            </h2>
            <p className="text-xs opacity-60 mb-4">
              Min–Target–Max pricing predicted from active demand and comps.
            </p>
            {smartPriceEntries.slice(0, 5).map((entry) => (
              <SmartPriceBandCard key={entry.item.id} entry={entry} />
            ))}
          </div>
        )}

        {canShowCategoryMomentum && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">
              Category Momentum
            </h2>
            <p className="text-xs opacity-60 mb-4">
              Which categories are heating up or cooling off this week.
            </p>
            {Object.entries(infinity.categoryMomentum)
              .slice(0, 8)
              .map(([category, data]) => (
                <CategoryMomentumCard
                  key={category}
                  category={category}
                  data={data}
                />
              ))}
          </div>
        )}

        {canShowHotTags && (
          <div className="mt-14 mb-10">
            <h2 className="sparkly-header text-2xl mb-2">
              Hot Tags This Week
            </h2>
            <p className="text-xs opacity-60 mb-4">
              Emerging keywords across the resale market.
            </p>
            {hotTags.slice(0, 10).map((t, index) => (
              <HotTagCard key={`${t.keyword || index}-${index}`} tag={t} />
            ))}
          </div>
        )}

      </div>

      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
      />

      {openItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 z-50">
          <div className="bg-[#0A0D0F] w-full max-w-lg border border-[#E8D5A8] rounded-xl p-6 relative">
            <button
              className="absolute right-4 top-4 text-[#E8D5A8]/70 hover:text-[#E8D5A8]"
              onClick={() => setOpenItem(null)}
            >
              ✕
            </button>

            <h2 className="text-xl mb-3">
              {openItem.item?.title || "Listing"}
            </h2>

            {(() => {
              const ultra = openItem.ts || openItem;
              const floor =
                ultra.priceFloor ?? ultra.smartPriceRange?.min ?? "—";
              const target =
                ultra.priceTarget ??
                ultra.smartPriceRange?.target ??
                "—";
              const ceil =
                ultra.priceCeiling ?? ultra.smartPriceRange?.max ?? "—";
              const catKey = openItem.item?.category || "Other";
              const catInfo =
                infinity.categoryMomentum &&
                infinity.categoryMomentum[catKey];
              const flipScore =
                ultra.priceCeiling && ultra.priceFloor
                  ? ultra.priceCeiling - ultra.priceFloor
                  : null;

              return (
                <div className="space-y-2 text-sm opacity-80">
                  <div>
                    <strong>Headline:</strong>{" "}
                    {ultra.eventHeadline || "—"}
                  </div>
                  <div>
                    <strong>Why:</strong>{" "}
                    {ultra.eventReasons?.join(" • ") || "—"}
                  </div>
                  <div>
                    <strong>Price Band:</strong>{" "}
                    {floor} → {target} → {ceil}
                  </div>
                  <div>
                    <strong>Flip Potential:</strong>{" "}
                    {flipScore ?? "—"}
                  </div>
                  <div>
                    <strong>Category Momentum:</strong>{" "}
                    {catInfo?.direction || "—"}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

/* ——————— Reusable Components ——————— */

function Section({ title, children }) {
  return (
    <div className="mb-10">
      <h2 className="text-xl font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Card({ children, item, navigate, onClick }) {
  return (
    <div
      className="relative bg-black/30 border border-[#E8D5A8]/60 rounded-lg p-4 mb-3 hover:bg-black/40 transition cursor-pointer"
      onClick={onClick}
    >
      <div>{children}</div>

      {item && navigate && (
        <div className="flex gap-3 mt-3 text-xs">
          <button
            onClick={() => navigate(`/inventory?open=${item.id}`)}
            className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
          >
            Open Listing
          </button>

          <button
            onClick={() =>
              navigate("/launch-listing", { state: { item } })
            }
            className="px-2 py-1 border border-[#E8D5A8]/60 rounded hover:bg-[#E8D5A8]/10"
          >
            LaunchDeck
          </button>
        </div>
      )}
    </div>
  );
}

function Title({ children }) {
  return <div className="font-semibold text-[#E8D5A8]">{children}</div>;
}

function Subtitle({ children }) {
  return <div className="mt-2 font-medium">{children}</div>;
}

function Details({ children, className = "" }) {
  return (
    <div
      className={`text-xs mt-1 opacity-75 leading-relaxed ${className}`}
    >
      {children}
    </div>
  );
}

function Empty({ children }) {
  return <div className="text-xs opacity-50 italic p-2">{children}</div>;
}

function MonitoringBadge({ active, label }) {
  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-white/55">
      <span
        className={`inline-flex h-2 w-2 rounded-full ${
          active
            ? "bg-emerald-400 shadow-[0_0_10px_rgba(19,236,158,0.55)]"
            : "bg-white/30"
        } animate-pulse`}
      ></span>
      {label || (active ? "Signal live" : "Monitoring")}
    </div>
  );
}

function HelperChip({ children }) {
  return (
    <div className="inline-flex items-center px-3 py-1 rounded-full border border-white/15 text-[11px] text-white/70 bg-white/5 backdrop-blur-sm">
      {children}
    </div>
  );
}

function EmptyStateCard({ title, helper }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-xl p-4 text-sm text-white/80">
      <MonitoringBadge active={false} label="Monitoring" />
      <div className="mt-2 text-[13px] text-white/80">{title}</div>
      {helper && (
        <div className="mt-3">
          <HelperChip>{helper}</HelperChip>
        </div>
      )}
    </div>
  );
}

function ListingGuidanceItem({ report, isOpen, onToggle }) {
  if (!report) return null;
  const item = report.item || {};
  const action = report.trendGuidance?.action || "Hold";
  const reason =
    report.trendGuidance?.reason ||
    "Hold — no catalyst detected. Pricing typically stays steady.";
  const firstPhoto = Array.isArray(item.photos) ? item.photos[0] : null;
  const cover =
    (typeof firstPhoto === "string" ? firstPhoto : firstPhoto?.url) ||
    item.photo?.url ||
    item.coverPhoto ||
    item.photoUrl ||
    null;
  const recentHeadlines = (report.eventHeadlines || []).filter(
    (headline) => !headline?.isHistorical && isHeadlineRecent(headline)
  );
  const primaryHeadline = recentHeadlines[0] || null;
  const collapsedLine = primaryHeadline
    ? `${primaryHeadline.source || "Source"} • ${formatRelativeDate(
        primaryHeadline.publishedAt
      )}`
    : "Hold — no catalyst detected.";
  const actionAccent =
    action === "Increase"
      ? "text-emerald-300"
      : action === "Watch"
      ? "text-[#F7E7A5]"
      : "text-white";

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-black/30 transition hover:border-white/30 ${
        isOpen ? "ring-1 ring-[#E8D5A8]/60 bg-black/40" : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        <div className="h-14 w-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center text-white/40 text-lg uppercase">
          {cover ? (
            <img
              src={cover}
              alt={item.title || "Listing"}
              className="h-full w-full object-cover"
            />
          ) : (
            (item.title || "?").slice(0, 1)
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold text-white truncate">
              {item.title || "Untitled Listing"}
            </div>
            <span
              className={`text-[11px] uppercase tracking-[0.35em] ${actionAccent}`}
            >
              {action}
            </span>
          </div>
          <div className="text-xs text-white/60 mt-1 truncate">
            {collapsedLine}
          </div>
        </div>
        <span
          className={`text-white/60 transition-transform ${
            isOpen ? "rotate-45" : ""
          }`}
        >
          +
        </span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-sm text-white/80 space-y-3">
          <div>{reason}</div>
          {recentHeadlines.length > 0 ? (
            <div>
              <div className="text-[10px] uppercase tracking-[0.35em] text-white/40 mb-1">
                Evidence
              </div>
              <div className="space-y-1 text-[11px] text-white/70">
                {recentHeadlines.slice(0, 3).map((headline, idx) => (
                  <div key={`${headline.title || idx}-${idx}`}>
                    {headline.link ? (
                      <a
                        href={headline.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#E8D5A8] hover:opacity-80"
                      >
                        {headline.source || "Source"}
                      </a>
                    ) : (
                      <span className="text-[#E8D5A8]">
                        {headline.source || "Source"}
                      </span>
                    )}
                    <span className="opacity-80">
                      {" "}
                      — {headline.title || "Headline"}
                    </span>
                    <span className="opacity-40 ml-1">
                      • {formatRelativeDate(headline.publishedAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <HelperChip>Hold — no catalyst detected</HelperChip>
          )}
        </div>
      )}
    </div>
  );
}

function GuidancePanel({ action, explainer, detail }) {
  const accent =
    action === "Increase"
      ? "text-emerald-300"
      : action === "Watch"
      ? "text-[#F7E7A5]"
      : action === "Hold"
      ? "text-white"
      : "text-white";
  return (
    <div className="relative p-5 rounded-2xl border border-[#1F4133] bg-gradient-to-b from-[#07130F] via-[#050909] to-[#040606] shadow-[0_20px_40px_rgba(0,0,0,0.45)] overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(19,236,158,0.25),_transparent_60%)] opacity-50"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em] text-white/50 mb-2">
          <span>Current Guidance</span>
          <span className="flex items-center gap-1 text-[#6FE0B8]">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(19,236,158,0.6)] animate-pulse"></span>
            Live
          </span>
        </div>
        <div className={`text-4xl font-semibold ${accent} drop-shadow-[0_0_25px_rgba(19,236,158,0.35)]`}>
          {action}
        </div>
        <div className="text-xs text-white/70 mt-3">{explainer}</div>
        {detail && (
          <div className="text-[11px] text-white/40 mt-2">{detail}</div>
        )}
      </div>
    </div>
  );
}
