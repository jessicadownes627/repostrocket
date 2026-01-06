import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { loadListingLibrary } from "../utils/savedListings";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";

const STALE_TAG_KEYWORDS = [
  "holiday",
  "christmas",
  "halloween",
  "valentine",
  "easter",
  "spring",
  "summer",
  "winter",
  "mother's day",
  "father's day",
  "back to school",
];

const ABSENCE_PHRASES = [
  "No recent news mentions tied to this item.",
  "No buyer search acceleration detected.",
  "Comparable listings selling at typical velocity.",
];

function formatTimestamp(dateStr) {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getDecisionLabel(report) {
  if (!report) return "QUIET";
  if (report.eventLinked && (report.eventImpactScore ?? 0) >= 24) {
    return "ACTIVE";
  }
  if (report.eventLinked) {
    return "STABLE";
  }
  return "QUIET";
}

function getReasonText(report) {
  if (!report) return "No listings tracked yet.";
  if (report.eventLinked) {
    return (
      report.eventHeadline ||
      report.eventReasons?.[0] ||
      report.trendGuidance?.reason ||
      "New activity is tied to this listing."
    );
  }
  return "No new activity detected for this item.";
}

function getEventHeadline(report) {
  if (!report) return null;
  return (
    report.eventHeadline ||
    report.eventReasons?.[0] ||
    report.trendGuidance?.reason ||
    null
  );
}

function buildEffectText(report) {
  if (!report || !report.eventLinked) {
    return "No qualifying news or demand events detected.";
  }
  const pieces = [];
  const score = report.eventImpactScore ?? report.ts?.trendScore ?? 0;
  if (score >= 50) {
    pieces.push("Search interest ↑");
  } else if (score >= 30) {
    pieces.push("Search interest steady");
  }
  if (score >= 35) {
    pieces.push("Comps selling faster");
  }
  if (score >= 45) {
    pieces.push("Buyer interest rising");
  }
  return pieces.length ? pieces.join(" · ") : "Signals holding steady.";
}

const SAMPLE_REPORTS = [
  {
    item: { id: "sample-1", title: "1990s Starter Chicago Bulls Jacket" },
    eventLinked: true,
    eventHeadline:
      "Bulls playoff chatter triggered a merch spike across streaming and feeds.",
    eventHeadlines: [
      {
        source: "ESPN",
        title: "Playoff push sends vintage merch into buyers' carts",
        publishedAt: "2025-01-07T12:00:00Z",
        link: "https://www.espn.com",
        isHistorical: false,
      },
    ],
    eventTimestamp: "2025-01-07T12:00:00Z",
    eventReasons: [
      "NBA playoff coverage referenced Chicago merch.",
      "Listed after a viral highlight segment.",
    ],
    buyerHint: "List before tonight’s tipoff for peak interest.",
    trendGuidance: {
      action: "Increase",
      reason:
        "Playoff buzz is pushing demand — prices are rising on similar jackets.",
      headlineCount: 1,
      daysSinceHeadline: 1,
    },
    ts: {
      trendScore: 82,
      buyerHint: "Buyers expect premium pricing while the event is live.",
    },
    eventImpactScore: 42,
  },
];

const SAMPLE_INFINITY = {
  reports: SAMPLE_REPORTS,
  hotTags: [
    { keyword: "starter jacket", score: 78 },
    { keyword: "playoff merch", score: 62 },
    { keyword: "vintage outerwear", score: 54 },
  ],
};

export default function TrendSenseDashboard() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState([]);
  const [infinity, setInfinity] = useState(SAMPLE_INFINITY);

  useEffect(() => {
    const allowed = gate("trendsense", () => setHasAccess(true));
    if (!allowed) {
      setHasAccess(false);
      setReports(SAMPLE_REPORTS);
      setInfinity(SAMPLE_INFINITY);
      setLoading(false);
    }
  }, [gate]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    const loadTrendSense = async () => {
      setLoading(true);
      const library = loadListingLibrary() || [];
      if (!library.length) {
        if (!cancelled) {
          setReports([]);
          setInfinity(SAMPLE_INFINITY);
          setLoading(false);
        }
        return;
      }
      const data = await runTrendSenseInfinity(library);
      if (cancelled) return;
      if (data) {
        setReports(data.reports || []);
        setInfinity({
          reports: data.reports || [],
          hotTags: data.hotTags || [],
        });
      } else {
        setReports([]);
        setInfinity({ hotTags: [] });
      }
      setLoading(false);
    };
    loadTrendSense();
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  const sortedReports = useMemo(() => {
    return [...reports].sort((a, b) => {
      const aScore = (a?.eventImpactScore ?? a?.ts?.trendScore ?? 0) + (a?.eventLinked ? 10 : 0);
      const bScore = (b?.eventImpactScore ?? b?.ts?.trendScore ?? 0) + (b?.eventLinked ? 10 : 0);
      return bScore - aScore;
    });
  }, [reports]);

  const waitReports = sortedReports.filter(
    (report) => getDecisionLabel(report) === "QUIET"
  );
  const activeReports = sortedReports.filter(
    (report) => getDecisionLabel(report) !== "QUIET"
  );
  const topReports = activeReports.slice(0, 5);
  const waitCount = waitReports.length;
  const heroReport = sortedReports[0] || null;
  const heroDecision = getDecisionLabel(heroReport);
  const heroReason = getReasonText(heroReport);
  const heroSource =
    heroReport?.eventHeadlines?.[0]?.source || "TrendSense curated signal";
  const heroTiming =
    heroReport?.eventTimestamp ||
    heroReport?.eventHeadlines?.[0]?.publishedAt ||
    null;
  const heroEventHeadline =
    getEventHeadline(heroReport) ||
    selectAbsencePhrase(heroReport?.item?.id?.length || 0);
  const heroEffect = buildEffectText(heroReport);
  const heroEvidence = formatEvidenceChips(heroReport);
  const heroTimingLabel = heroTiming ? formatTimestamp(heroTiming) : null;
  const [heroPulseKey, setHeroPulseKey] = useState(0);
  const [heroActivePulse, setHeroActivePulse] = useState(false);
  const activeNewsReports = sortedReports.filter(
    (report) =>
      report.eventLinked &&
      (report.eventHeadline ||
        (report.eventHeadlines && report.eventHeadlines.length))
  );
  const liveSignalCount = activeNewsReports.length;
  const liveNewsItems = activeNewsReports.slice(0, 3).map((report, idx) => {
    const timestamp =
      report.eventTimestamp ||
      report.eventHeadlines?.[0]?.publishedAt ||
      null;
    return {
      id: report.item?.id || report.eventHeadline || `news-${idx}`,
      headline:
        report.eventHeadline ||
        report.eventHeadlines?.[0]?.title ||
        report.eventReasons?.[0] ||
        report.item?.title ||
        "Live signal detected",
      source: report.eventHeadlines?.[0]?.source || "TrendSense curated signal",
      timestampLabel: formatTimestamp(timestamp),
      why:
        report.trendGuidance?.reason ||
        report.buyerHint ||
        `Items like ${report.item?.title || "this listing"} are in focus.`,
    };
  });
  const opportunitySignals = activeReports
    .filter((report) => getDecisionLabel(report) === "ACTIVE")
    .slice(0, 3)
    .map((report, idx) => {
      const timestamp =
        report.eventTimestamp ||
        report.eventHeadlines?.[0]?.publishedAt ||
        null;
      return {
        id: report.item?.id || report.eventHeadline || `signal-${idx}`,
        heading: report.item?.title || "Tracked listing",
        reason: getReasonText(report),
        source: report.eventHeadlines?.[0]?.source || "TrendSense curated signal",
        timestampLabel: formatTimestamp(timestamp),
        why:
          report.buyerHint ||
          report.trendGuidance?.reason ||
          "Activity is forming around listings like yours.",
      };
    });

  useEffect(() => {
    setHeroPulseKey((prev) => prev + 1);
    if (heroDecision === "ACTIVE") {
      setHeroActivePulse(true);
      const timer = setTimeout(() => setHeroActivePulse(false), 1400);
      return () => clearTimeout(timer);
    }
    setHeroActivePulse(false);
  }, [heroDecision, heroReport?.eventTimestamp, heroReport?.eventImpactScore]);

  const tagList = (infinity?.hotTags || []).slice(0, 5);
  const filteredTagList = tagList.filter((tag) => {
    const lower = (tag.keyword || "").toLowerCase();
    return !STALE_TAG_KEYWORDS.some((stale) => lower.includes(stale));
  });
  const [expandedListing, setExpandedListing] = useState(null);
  const [showBuyerPerspective, setShowBuyerPerspective] = useState(false);
  const [showWaitList, setShowWaitList] = useState(false);

  const buyerInsights = topReports
    .map((report) => {
      const hint = report.buyerHint || report.ts?.buyerHint;
      if (!hint) return null;
      return {
        id: report.item?.id || report?.eventHeadline,
        title: report.item?.title || "Listing",
        hint,
      };
    })
    .filter(Boolean);

  const heroAvailable = Boolean(heroReport);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050807] text-[#E8E1D0] p-6">
        Loading TrendSense…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050807] text-[#E8E1D0] px-6 py-10 relative overflow-hidden">
      <div className="trend-background" aria-hidden="true" />
      <div className="max-w-3xl mx-auto space-y-8 relative z-10">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-1 hover:text-white transition"
        >
          ← Back
        </button>

        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="sparkly-header header-glitter text-3xl md:text-4xl">
              TrendSense
            </span>
            <div className="flex items-center gap-2 text-[11px] text-white/60">
              <span className="trend-live-indicator" />
              Live monitoring
            </div>
          </div>
          <p className="text-sm opacity-70">
            News-first signals that surface what’s moving in the market and why.
          </p>
          <p className="text-xs opacity-55">
            Every insight ties to a real event—news, drops, or demand shifts—so ACTIVE signals feel earned.
          </p>
          <div className="trend-live-summary">
            {liveSignalCount > 0 ? (
              <div className="flex items-center gap-2 text-sm text-white/70">
                <span className="gold-dot" aria-hidden="true" />
                <span>{liveSignalCount} live signals detected today</span>
              </div>
            ) : (
              <p className="text-sm text-white/60">
                TrendSense is scanning news and buyer behavior right now.
              </p>
            )}
          </div>
        </div>

        {heroAvailable ? (
          <div
            className={`bg-[#0b1318] border border-[#1f2c33] rounded-3xl p-6 space-y-4 trend-hero-card ${
              heroDecision !== "QUIET" ? "trend-hero-card-active" : ""
            }`}
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="state-row flex items-center gap-4">
                <span
                  className={`state-pill state-pill-${heroDecision.toLowerCase()} font-semibold tracking-[0.35em] text-[11px]`}
                >
                  {heroDecision}
                </span>
                <p className="text-sm uppercase tracking-[0.35em] text-white/60">
                  {heroReport.item?.title || "Listing readout"}
                </p>
              </div>
            </div>
            <div className="hero-reason-row flex items-start gap-3">
              {heroDecision === "ACTIVE" && (
                <span className="hero-arrow-large" aria-hidden="true">
                  →
                </span>
              )}
              <p
                className={`hero-reason text-[18px] md:text-[20px] font-semibold leading-tight ${
                  heroDecision === "ACTIVE" ? "hero-reason-active" : ""
                }`}
              >
                {heroReason}
              </p>
            </div>
            {heroDecision === "QUIET" ? (
              <p className="trend-quiet-note">Monitoring for new signals.</p>
            ) : (
              <p className="text-sm text-white/80 leading-snug">{heroEffect}</p>
            )}
            <div className="hero-evidence">
              <span className="text-[11px] uppercase tracking-[0.35em] text-white/50">
                Evidence
              </span>
              <ul
                key={`hero-evidence-${heroPulseKey}`}
                className="evidence-list text-[10px] text-white/70"
              >
                {heroEvidence.map((chip) => (
                  <li
                    key={`${chip.label}-${chip.status}`}
                    className={`evidence-line ${
                      heroDecision !== "QUIET" ? "evidence-active" : ""
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span>{chip.status}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
              <div className="text-[11px] uppercase tracking-[0.35em] text-white/50">
                {heroDecision === "ACTIVE"
                  ? "Why it’s active"
                  : heroDecision === "STABLE"
                  ? "What changed"
                  : "Why it’s quiet"}
              </div>
              <div className="space-y-2 text-sm text-white/80">
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40 mr-2">
                    Source
                  </span>
                  {heroSource}
                </div>
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40 mr-2">
                    Event
                  </span>
                  {heroEventHeadline ||
                    "No qualifying news or demand events detected."}
                </div>
                {heroTimingLabel && (
                  <div>
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40 mr-2">
                      Timing
                    </span>
                    {heroTimingLabel}
                  </div>
                )}
                <div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40 mr-2">
                    Effect
                  </span>
                  {heroEffect}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#0b1318] border border-[#1f2c33] rounded-3xl p-6 space-y-2">
            <div className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              No tracked listings yet
            </div>
            <p className="text-sm text-white/70">
              Add your first listing and TrendSense surfaces a reason-driven verdict with proof.
            </p>
          </div>
        )}

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            {liveSignalCount > 0 && <span className="gold-dot" aria-hidden="true" />}
            <h2 className="sparkly-header text-2xl">Live News</h2>
          </div>
          {liveNewsItems.length ? (
            <div className="space-y-3">
              {liveNewsItems.map((news) => (
                <div
                  key={news.id}
                  className="news-card border border-white/10 rounded-3xl p-4 bg-[#070b0f]"
                >
                  <div className="news-card-row flex gap-3">
                    <span className="hero-arrow-large" aria-hidden="true">
                      →
                    </span>
                    <div className="space-y-1">
                      <p className="text-lg font-semibold text-white">
                        {news.headline}
                      </p>
                      <div className="flex flex-wrap gap-4 text-[11px] text-white/60">
                        <span>Source: {news.source}</span>
                        {news.timestampLabel && <span>Updated: {news.timestampLabel}</span>}
                      </div>
                      <p className="text-sm text-white/70">
                        Why this matters — {news.why}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-white/60">
              No live news detected yet—checks are running.
            </p>
          )}
        </section>

        {opportunitySignals.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="sparkly-header text-2xl">Do you have any of these?</h2>
            </div>
            <div className="space-y-4">
              {opportunitySignals.map((signal) => (
                <div
                  key={signal.id}
                  className="opportunity-card border border-white/10 rounded-3xl p-4 bg-[#070b0f]"
                >
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-white">
                      {signal.heading}
                    </p>
                    <p className="opportunity-reason text-sm text-white/80 leading-snug">
                      <span className="hero-arrow-large" aria-hidden="true">
                        →
                      </span>
                      {signal.reason}
                    </p>
                    <div className="flex flex-wrap gap-3 text-[11px] text-white/60">
                      <span className="evidence-line">
                        <span>•</span>
                        <span>Source: {signal.source}</span>
                      </span>
                      {signal.timestampLabel && (
                        <span className="evidence-line">
                          <span>•</span>
                          <span>Updated: {signal.timestampLabel}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/70">
                      {signal.why}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="sparkly-header text-2xl">Live Listings</h2>
            <span className="text-[11px] text-white/60 uppercase tracking-[0.35em]">
              {hasAccess ? "Live" : "Preview"}
            </span>
          </div>
          <p className="text-xs text-white/60">
            Each row surfaces QUIET / STABLE / ACTIVE status with a single event-backed reason.
          </p>
          <div className="space-y-3">
            {topReports.length === 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-sm text-white/60">
                No listings are live—add a saved listing from Single Listing to begin realtime guidance.
              </div>
            )}
            {topReports.map((report) => (
              <ListingRow
                key={report.item?.id || report.eventHeadline}
                report={report}
                expanded={expandedListing === report.item?.id}
                onToggle={() =>
                  setExpandedListing((prev) =>
                    prev === report.item?.id ? null : report.item?.id
                  )
                }
              />
            ))}
          </div>
          {waitCount > 0 && (
            <div className="trend-quiet-summary rounded-2xl border border-white/10 bg-black/25 p-4 mt-2">
              <div className="flex items-center justify-between text-sm text-white/70">
                <p>Monitoring {waitCount} listings quietly.</p>
                <button
                  type="button"
                  onClick={() => setShowWaitList((prev) => !prev)}
                  className="text-[11px] uppercase tracking-[0.35em] text-white/60 border border-white/20 rounded-full px-3 py-1 hover:border-white/40 transition"
                >
                  {showWaitList ? "Hide details" : "Show details"}
                </button>
              </div>
              {showWaitList && (
                <div className="mt-3 space-y-2 text-[11px] text-white/60">
                  {waitReports.slice(0, 5).map((report) => (
                    <div
                      key={report.item?.id || report.eventHeadline}
                      className="rounded-xl border border-white/10 bg-black/15 p-3"
                    >
                      <div className="font-semibold text-white/80 text-sm">
                        {report.item?.title || "Tracked listing"}
                      </div>
                      <p className="text-[11px] text-white/60 mt-1">
                        {getEventHeadline(report) ||
                          selectAbsencePhrase(report?.item?.id?.length || 0)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="sparkly-header text-2xl">What buyers are searching now</h2>
          </div>
          <p className="text-xs text-white/60">
            Short-lived phrases appearing across your listings.
          </p>
          {filteredTagList.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filteredTagList.map((tag) => (
                <div
                  key={tag.keyword}
                  className="rounded-2xl border border-white/10 bg-black/25 p-4 text-sm"
                >
                  <div className="font-semibold text-white tracking-[0.3em] text-[11px] uppercase">
                    {tag.keyword}
                  </div>
                  <p className="text-white/70 mt-1 text-[12px]">
                    Appearing in your tracked listings—visibility may shift quickly.
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-white/60">
              No active buyer searches tied to your items right now.
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="sparkly-header text-2xl">Buyer Perspective</h2>
            <button
              type="button"
              onClick={() => setShowBuyerPerspective((prev) => !prev)}
              className="text-[11px] uppercase tracking-[0.35em] text-white/60 border border-white/20 rounded-full px-3 py-1 hover:border-white/40 transition"
            >
              {showBuyerPerspective ? "Hide buyer insights" : "Show buyer insights"}
            </button>
          </div>
          {showBuyerPerspective && (
            <div className="space-y-3">
              {buyerInsights.length ? (
                buyerInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70"
                  >
                    <div className="font-semibold text-white">
                      {insight.title}
                    </div>
                    <p className="text-white/60 mt-1">{insight.hint}</p>
                  </div>
                ))
              ) : (
                  <p className="text-sm text-white/60">
                    Buyer insights appear whenever TrendSense detects a concrete event.
                  </p>
              )}
            </div>
          )}
        </section>

        <p className="text-[11px] text-white/40 mt-6">
          Signals include news mentions, buyer search behavior, and live marketplace activity.
        </p>
      </div>

      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
      />
    </div>
  );
}

function ListingRow({ report, expanded, onToggle }) {
  const decision = getDecisionLabel(report);
  const reason = getReasonText(report);
  const source = report.eventHeadlines?.[0]?.source || "TrendSense curation";
  const timing =
    report.eventTimestamp ||
    report.eventHeadlines?.[0]?.publishedAt ||
    null;
  const eventHeadline =
    getEventHeadline(report) ||
    selectAbsencePhrase((report?.item?.id?.length || 0) + 1);
  const effect = buildEffectText(report);
  const evidenceChips = formatEvidenceChips(report);
  const listingActive = decision !== "QUIET";
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-black/30 p-4 space-y-3 listing-row ${
        listingActive ? "listing-row-active" : ""
      }`}
    >
        <div className="listing-header flex items-center justify-between flex-wrap gap-3">
          <div className="state-row flex items-center gap-3">
            <span
              className={`state-pill state-pill-${decision.toLowerCase()} px-3 py-1 rounded-full text-[11px] tracking-[0.35em]`}
            >
              {decision}
            </span>
            <p className="text-sm uppercase tracking-[0.35em] text-white/60">
              {report.item?.title || "Listing"}
            </p>
          </div>
        </div>
      <div className="listing-reason-row flex items-start gap-3">
        {decision === "ACTIVE" && (
          <span className="hero-arrow-large" aria-hidden="true">
            →
          </span>
        )}
        <p
          className={`listing-reason text-[15px] text-white leading-snug ${
            decision === "ACTIVE" ? "hero-reason-active" : ""
          }`}
        >
          {reason}
        </p>
      </div>
      {!listingActive && (
        <p className="trend-quiet-note text-xs text-white/60">
          Monitoring for new signals.
        </p>
      )}
      {listingActive && (
        <p className="listing-effect text-sm text-white/80">{effect}</p>
      )}
      <ul className="evidence-list text-[10px] text-white/70">
        {evidenceChips.map((chip) => (
          <li
            key={`${chip.label}-${chip.status}`}
            className={`evidence-line ${
              listingActive ? "evidence-active" : ""
            }`}
          >
            <span>{chip.label}</span>
            <span>{chip.status}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          className="text-[11px] uppercase tracking-[0.35em] border border-white/20 rounded-full px-3 py-1 transition hover:border-white/40"
        >
          {expanded ? "Hide why" : "View why"}
        </button>
      </div>
      {expanded && (
        <div className="expanded-why bg-white/5 border border-white/10 rounded-2xl p-3 text-sm text-white/70 space-y-2">
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mr-2">
              Source
            </span>
            {source}
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mr-2">
              Event
            </span>
            {eventHeadline}
          </div>
          {timing && (
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mr-2">
                Timing
              </span>
              {formatTimestamp(timing)}
            </div>
          )}
          <div>
            <span className="text-[10px] uppercase tracking-[0.3em] text-white/40 mr-2">
              Effect
            </span>
            {effect}
          </div>
        </div>
      )}
    </div>
  );
}
function selectAbsencePhrase(index = 0) {
  if (!ABSENCE_PHRASES.length) return "No qualifying news or demand events detected.";
  const idx = index % ABSENCE_PHRASES.length;
  return ABSENCE_PHRASES[idx];
}

function formatEvidenceChips(report) {
  const newsState = report?.eventLinked ? "fresh" : "none";
  const searchState =
    report?.ts?.searchBoost ?? report?.eventImpactScore
      ? "forming"
      : "calm";
  const listingsState =
    (report?.ts?.trendScore ?? 0) >= 50 ? "steady" : "calm";
  const scanState = report?.eventTimestamp
    ? formatTimestamp(report.eventTimestamp)
    : null;

  const chips = [
    { label: "News", status: newsState },
    { label: "Search", status: searchState },
    { label: "Listings", status: listingsState },
  ];
  if (scanState) {
    chips.push({ label: "Last scan", status: scanState });
  }
  return chips;
}
