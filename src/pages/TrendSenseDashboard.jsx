import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRSSFeeds } from "../utils/fetchRSSFeeds";
import { loadListingLibrary } from "../utils/savedListings";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";

const LIVE_FEEDS = [
  "https://www.espn.com/espn/rss/news",
  "https://www.espn.com/mlb/rss/news",
  "https://www.espn.com/nfl/rss/news",
  "https://www.espn.com/nba/rss/news",
  "https://www.espn.com/nhl/rss/news",
  "https://www.tmz.com/rss.xml",
  "https://www.eonline.com/syndication/feeds/rssfeeds",
  "https://variety.com/feed/",
  "https://www.vogue.com/feed/rss",
  "https://www.hypebeast.com/feed",
  "https://www.complex.com/rss",
];

const FALLBACK_NEWS = [
  {
    headline: "Travis Kelce headlines Taylor Swift’s Kansas City visit",
    source: "Pop Culture Daily",
    timestamp: new Date().toISOString(),
    why: "Celebrity pairing keeps Chiefs merch and related drops in buyer focus.",
  },
  {
    headline: "Marvel announces limited drop ahead of new series premiere",
    source: "Streaming Brief",
    timestamp: new Date().toISOString(),
    why: "Launch chatter lifts visibility for related apparel and collectibles.",
  },
];

const SELLER_FAMILIAR_KEYWORDS = [
  "psa",
  "bgs",
  "cgc",
  "jordan",
  "nike",
  "supreme",
  "lebron",
  "kobe",
  "travis kelce",
  "taylor swift",
  "lego",
  "marvel",
  "star wars",
  "disney",
  "vogue",
  "variety",
  "collectible",
  "nba",
  "mlb",
  "nfl",
  "sports card",
  "pop culture",
  "concert",
  "auction",
]
  .map((value) => value.toLowerCase())
  .filter(Boolean);

const FALLBACK_OPPORTUNITIES = [
  "PSA-graded sports cards",
  "Jordan retros and iconic sneaker drops",
  "Vintage LEGO and entertainment builds",
  "Pop culture apparel tied to current headlines",
];

export default function TrendSenseDashboard() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedItems, setSavedItems] = useState([]);
  const [newsEntries, setNewsEntries] = useState(FALLBACK_NEWS.map(normalizeFallback));
  const [reports, setReports] = useState([]);

  useEffect(() => {
    const allowed = gate("trendsense", () => setHasAccess(true));
    if (!allowed) {
      setHasAccess(false);
      setLoading(false);
    }
  }, [gate]);

  useEffect(() => {
    if (!hasAccess) return;
    let cancelled = false;
    const loadTrendSense = async () => {
      setLoading(true);
      const library = loadListingLibrary() || [];
      const [newsFeed, infinityData] = await Promise.all([
        fetchRSSFeeds(LIVE_FEEDS),
        library.length ? runTrendSenseInfinity(library) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      setSavedItems(library);
      const normalized = normalizeNewsEntries(newsFeed);
      if (normalized.length) {
        setNewsEntries(normalized);
      }
      setReports(infinityData?.reports || []);
      setLoading(false);
    };
    loadTrendSense().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  const itemStories = useMemo(() => {
    return buildItemStories(savedItems, reports, newsEntries);
  }, [savedItems, reports, newsEntries]);

  const savedKeywords = useMemo(() => {
    return buildSavedKeywords(savedItems);
  }, [savedItems]);

  const todaysCall = useMemo(() => {
    return buildTodaysCall(itemStories);
  }, [itemStories]);

  const marketPulse = useMemo(() => {
    return buildMarketPulse(newsEntries, savedKeywords);
  }, [newsEntries, savedKeywords]);

  const opportunityPrompts = useMemo(() => {
    return buildOpportunityPrompts(savedKeywords);
  }, [savedKeywords]);

  const upcomingMoments = useMemo(() => {
    return buildUpcomingMoments(newsEntries);
  }, [newsEntries]);

  const negativeSignals = useMemo(() => {
    return buildNegativeSignals(newsEntries);
  }, [newsEntries]);

  const personalizedSuggestions = useMemo(() => {
    return buildPersonalizedSuggestions(savedItems);
  }, [savedItems]);

  if (loading) {
    return <div className="trend-page-loading">Preparing today’s briefing…</div>;
  }

  return (
    <div className="trend-page">
      <header className="trend-header">
        <span className="gold-dot" aria-hidden="true" />
        <div>
          <h1>TrendSense</h1>
          <p className="trend-subtitle">
            Live market intelligence for sellers who care about timing.
          </p>
          <p className="trend-quiet-note">
            TrendSense stays quiet by design. It only surfaces moments when real-world events meaningfully affect buyer attention.
          </p>
        </div>
      </header>
      <div className="trend-gold-bar" aria-hidden="true" />

      <section className="todays-call">
        <div className={`todays-call-card todays-call-${todaysCall.status}`}>
          <p className="call-label">Today’s Call</p>
          <h2>{todaysCall.label}</h2>
          <div className="call-status-row">
            <span className={`status-indicator ${todaysCall.status}`} aria-hidden="true" />
            <p className="call-status-text">Status: {todaysCall.label}</p>
          </div>
          <p className="call-reason">{todaysCall.reasonLine}</p>
          <div className="call-actions">
            <button type="button" className="primary-cta">
              {todaysCall.ctaLabel}
            </button>
          </div>
        </div>
      </section>

      {todaysCall.status === "standBy" && (
        <section className="watch-next">
          <div className="section-heading">
            <h2>What to Watch Next</h2>
          </div>
          <div className="watch-next-body">
            {personalizedSuggestions.length > 0 && (
              <article className="watch-next-block watch-next-personal-block">
                <h3>Based on what you’re watching</h3>
                <ul>
                  {personalizedSuggestions.slice(0, 2).map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </article>
            )}
            <article className="watch-next-block watch-next-guidance-block">
              <h3>General guidance</h3>
              <ul className="watch-next-list">
                <li>
                  Major film, TV, or gaming franchises (Star Wars collectibles, Marvel figures, Stranger Things comics).
                </li>
                <li>
                  Widely collected sneaker lines (Nike Air Jordan releases, Adidas Yeezy).
                </li>
                <li>
                  Sports memorabilia or seasonal collectibles tied to playoff runs and cultural moments.
                </li>
              </ul>
              <div className="watch-next-cta">
                <button type="button" className="primary-cta">
                  Add another item to watch
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="item-affected">
        <div className="section-heading">
          <h2>Your Listings</h2>
          <p className="section-subtitle">
            TrendSense keeps them in view—quiet monitoring unless an active moment appears.
          </p>
        </div>
        <div className="item-affected-grid">
          {itemStories.map((story) => (
            <article
              key={`item-${story.id}`}
              className={`item-card-affected ${story.active ? "item-active" : ""}`}
            >
              <div className="item-affected-row">
                {story.active && (
                  <span className="item-arrow" aria-hidden="true">
                    <MovementArrowIcon />
                  </span>
                )}
                <div className="item-affected-content">
                  <div className="item-card-body">
                  {story.listingUrl ? (
                    <a
                      href={story.listingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="item-link"
                    >
                      {story.itemName}
                    </a>
                  ) : (
                    <p className="item-prefix">{story.itemName}</p>
                  )}
                    <p className="item-status">
                      <span
                        className={`status-indicator ${story.active ? "active" : "quiet"}`}
                        aria-hidden="true"
                      />
                      <span className="status-label">
                        Status: {story.active ? "ACTIVE" : "QUIET"}
                      </span>
                      {story.active && <span className="watching-dot" aria-hidden="true" />}
                    </p>
                    {story.active ? (
                      <>
                        <a
                          href={story.link || "#"}
                          target="_blank"
                          rel="noreferrer"
                          className="item-headline"
                        >
                          {story.headline}
                        </a>
                        <p className="item-meta">
                          {story.source}
                          {story.timestampLabel ? ` · ${story.timestampLabel}` : ""}
                        </p>
                        <p className="item-why">Why this matters — {story.why}</p>
                        <div className="timing-block">
                          <p className="timing-title">Why now might matter</p>
                          <p className="timing-copy">{story.timingNow}</p>
                          <p className="timing-title">Why waiting could also make sense</p>
                          <p className="timing-copy">{story.timingWait}</p>
                        </div>
                      </>
                    ) : null}
                  </div>
                  <div className="item-actions">
                    <button type="button" className="tracking-pill">
                      Remove from tracking
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="market-pulse">
        <div className="section-heading">
          <h2>Market Pulse — What’s Moving Buyer Attention</h2>
        </div>
        <p className="market-pulse-note">
          These are the real-world moments currently shaping buyer attention across collectibles, fashion, sports, and media.
        </p>
        <div className="news-grid">
          {marketPulse.map((news) => (
            <article key={news.headline} className="news-card">
              <div className="news-headline-row">
                <span className="market-pulse-bullet" aria-hidden="true" />
                <a
                  href={news.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="news-headline"
                >
                  {news.headline}
                </a>
              </div>
              <p className="news-meta">
                {news.source}
                {news.dateTimeLabel ? ` · ${news.dateTimeLabel}` : ""}
              </p>
              {news.why && <p className="news-why">{news.why}</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="opportunity-prompt">
        <div className="section-heading">
          <h2>Do You Own Any of These?</h2>
        </div>
        <ul className="prompt-list">
          {opportunityPrompts.map((prompt) => (
            <li key={prompt}>{prompt}</li>
          ))}
        </ul>
        <div className="prompt-ctas">
          <button type="button" className="primary-cta">
            Add an Item to Watch
          </button>
          <button type="button" className="secondary-cta">
            List with Repost Rocket
          </button>
        </div>
      </section>

      {upcomingMoments.length > 0 && (
        <section className="upcoming-section">
          <div className="section-heading">
            <h2>Upcoming Moments to Watch</h2>
          </div>
          <ul className="upcoming-list">
            {upcomingMoments.map((moment) => (
              <li key={moment}>{moment}</li>
            ))}
          </ul>
        </section>
      )}

      {negativeSignals.length > 0 && (
        <section className="negative-section">
          <div className="section-heading">
            <h2>Negative Signals</h2>
          </div>
          <ul className="negative-list">
            {negativeSignals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="credibility-block">
        <p>TrendSense watches verified news sources, media releases, sports moments, auction behavior, and demand shifts.</p>
      </section>

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

function normalizeFallback(item) {
  return {
    headline: item.headline,
    source: item.source,
    timestamp: item.timestamp,
    timestampLabel: formatTimestamp(item.timestamp),
    why: item.why,
    link: item.link || "#",
    context: item.headline,
    dateLabel: formatDateOnly(item.timestamp),
    dateTimeLabel: formatDateTime(item.timestamp),
  };
}

function normalizeNewsEntries(entries = []) {
  const normalized = (entries || [])
    .filter((entry) => entry?.title)
    .sort(
      (a, b) =>
        new Date(b.publishedAt || b.pubDate || Date.now()) -
        new Date(a.publishedAt || a.pubDate || Date.now())
    )
    .slice(0, 6)
      .map((entry) => ({
        headline: entry.title,
        source: formatSource(entry.source || entry.link || "TrendSense desk"),
        link: entry.link || entry.source || "#",
        timestamp: entry.publishedAt || entry.pubDate || null,
        timestampLabel: formatTimestamp(entry.publishedAt || entry.pubDate),
        dateTimeLabel: formatDateTime(entry.publishedAt || entry.pubDate),
        why: buildWhyLine(entry),
        context: `${entry.title} ${entry.description || ""}`,
      }));
  return normalized;
}

function buildItemStories(savedItems = [], reports = [], newsEntries = []) {
  if (!savedItems?.length) {
    return [];
  }
  const stories = savedItems.map((item, idx) => {
    const report = reports.find((r) => r.id === item.id);
    if (report?.ts?.eventLinked) {
      const context = [
        report.ts.eventHeadline,
        ...(report.ts.eventHeadlines || []).map((h) => h.title),
        ...(report.ts.eventReasons || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const strongTerms = new Set(
        [
          item.brand,
          item.team,
          item.athlete,
          item.title,
          item.celebrity,
        ]
          .filter(Boolean)
          .map((value) => value.toLowerCase())
      );
      const hasDirectMatch = Array.from(strongTerms).some((term) =>
        matchesDirectTerm(term, context)
      );
      if (!hasDirectMatch) {
        return {
          id: item.id || `item-${idx}`,
          itemName: item.title || "Saved listing",
          active: false,
        };
      }
      const headline =
        report.ts.eventHeadline ||
        report.ts.eventHeadlines?.[0]?.title ||
        item.title ||
        "Market mention";
      const source =
        report.ts.eventHeadlines?.[0]?.source ||
        report.ts.eventHeadlines?.[0]?.link ||
        "Verified news";
      const timestamp =
        report.ts.eventTimestamp ||
        report.ts.eventHeadlines?.[0]?.publishedAt ||
        null;
      const timestampLabel = formatTimestamp(timestamp);
      const why = buildItemWhy(headline, item);
      const timingNow =
        report.ts.trendGuidance?.reason ||
        "Fresh coverage is keeping this item top of mind.";
      const timingWait =
        "Let the current storyline settle before judging sustained interest.";
      const impactScore = report.ts.eventImpactScore || 0;
      const guidanceAction = report.ts.trendGuidance?.action || "Hold";
      return {
        id: item.id || `item-${idx}`,
        itemName: item.title || "Saved listing",
        active: true,
        headline,
        source,
        timestampLabel,
        why,
        link: report.ts.eventHeadlines?.[0]?.link || "#",
        timingNow,
        timingWait,
        impactScore,
        guidanceAction,
        listingUrl: item.listingUrl || item.url || null,
      };
    }
      return {
        id: item.id || `item-${idx}`,
        itemName: item.title || "Saved listing",
        active: false,
        listingUrl: item.listingUrl || item.url || null,
      };
  });
  return stories;
}

function buildMarketPulse(entries = [], savedKeywords = []) {
  if (!entries.length) {
    return FALLBACK_NEWS;
  }
  const filtered = entries.filter((entry) =>
    matchesSellerKeyword(entry.headline, savedKeywords)
  );
  if (filtered.length) {
    return filtered.slice(0, 4);
  }
  return FALLBACK_NEWS;
}

function buildOpportunityPrompts(savedKeywords = []) {
  const prompts = [];
  const unique = new Set();
  savedKeywords.forEach((keyword) => {
    const label = `Items tied to ${titleCase(keyword)}`;
    if (!unique.has(label)) {
      unique.add(label);
      prompts.push(label);
    }
  });
  if (!prompts.length) {
    FALLBACK_OPPORTUNITIES.forEach((prompt) => {
      if (!unique.has(prompt)) {
        unique.add(prompt);
        prompts.push(prompt);
      }
    });
  }
  return prompts.slice(0, 4);
}

function buildUpcomingMoments(entries = []) {
  const keywords = ["premiere", "launch", "tour", "drop", "auction"];
  return entries
    .filter((entry) =>
      keywords.some((kw) => entry.headline.toLowerCase().includes(kw))
    )
    .map((entry) => `${entry.headline} · ${entry.timestampLabel}`);
}

function buildNegativeSignals(entries = []) {
  const signals = entries
    .filter((entry) =>
      ["reprint", "oversupply", "reissue", "cheap"].some((kw) =>
        entry.headline.toLowerCase().includes(kw)
      )
    )
    .map((entry) => `${entry.headline} may cool demand.`);
  return signals.slice(0, 2);
}

function matchesSellerKeyword(headline = "", savedKeywords = []) {
  const normalized = new Set(
    [
      ...savedKeywords,
      ...SELLER_FAMILIAR_KEYWORDS,
    ]
      .map((value) => value?.toLowerCase().trim())
      .filter(Boolean)
  );
  const text = (headline || "").toLowerCase();
  return Array.from(normalized).some((keyword) => text.includes(keyword));
}

function matchesDirectTerm(term = "", text = "") {
  const normalizedTerm = term?.toLowerCase().trim();
  if (!normalizedTerm) return false;
  const escaped = escapeRegExp(normalizedTerm);
  const regex = new RegExp(`\\b${escaped}\\b`, "i");
  return regex.test(text);
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSavedKeywords(items = []) {
  const set = new Set();
  items.forEach((item) => {
    [
      item.brand,
      item.team,
      item.athlete,
      item.celebrity,
      item.title,
      item.category,
      ...(item.tags || []),
    ]
      .filter(Boolean)
      .forEach((value) => set.add(value.toLowerCase()));
  });
  return Array.from(set);
}

function buildTodaysCall(itemStories = []) {
  const activeStories = itemStories.filter((story) => story.active);
  if (!activeStories.length) {
      return {
        status: "standBy",
        label: "Stand by today",
        reasonLine:
          "No major market-moving coverage tied to your listings right now.",
        affectedItems: [],
        ctaLabel: "Check back later",
      };
  }
  const uniqueNames = [...new Set(activeStories.map((story) => story.itemName))];
  const primeStory = activeStories.find(
    (story) => story.guidanceAction === "Increase" && story.impactScore >= 35
  );
  const heroStory = primeStory || activeStories[0];
  if (primeStory) {
    return {
      status: "list",
      label: "List now",
      reasonLine: heroStory.why,
      affectedItems: uniqueNames,
      ctaLabel: "Review and list",
    };
  }

  return {
    status: "prepare",
    label: "Prepare, don’t list yet",
    reasonLine: heroStory.why,
    affectedItems: uniqueNames,
    ctaLabel: "Review affected items",
  };
}

function formatSource(source) {
  if (!source) return "TrendSense desk";
  const trimmed = source.replace(/^https?:\/\//, "").split("/")[0];
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function formatTimestamp(dateStr) {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDateOnly(dateStr) {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr) {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildWhyLine(entry) {
  const text = `${entry.title} ${entry.description || ""}`.toLowerCase();
  if (text.includes("release") || text.includes("premiere")) {
    return "Release coverage is nudging buyers toward similar items.";
  }
  if (text.includes("documentary") || text.includes("finale")) {
    return "Cultural attention is aligning brands and collectibles with renewed relevance.";
  }
  if (text.includes("tournament") || text.includes("playoff")) {
    return "Competition cycles often drive renewed interest in related memorabilia.";
  }
  return "Media attention is keeping this category front of mind for buyers.";
}

function buildItemWhy(headline, item) {
  const highlighted = item.brand || item.category || item.title;
  if (highlighted) {
    return `${headline} mentions ${highlighted}, so buyers see your listing in the same storyline.`;
  }
  return `${headline} is pushing demand for this kind of item right now.`;
}

function titleCase(str = "") {
  return str
    .toString()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const PERSONALIZED_PATTERNS = [
  {
    keywords: ["lego"],
    suggestion:
      "Sellers who watch LEGO sets often also track large build kits and designer collaborations.",
  },
  {
    keywords: ["jordan", "sneaker", "nike", "yeezy", "adidas"],
    suggestion:
      "Similar sneaker lines and athlete editions—Jordan retros, Nike Airs, and Yeezy drops—keep resale buyers engaged.",
  },
  {
    keywords: ["sports card", "psa", "bgs", "cgc", "nba", "mlb", "nfl"],
    suggestion:
      "Sports memorabilia tied to playoff teams or embossed by grading houses stays in demand when seasons heat up.",
  },
  {
    keywords: ["holiday", "christmas", "easter", "super bowl"],
    suggestion:
      "Seasonal collectibles—holiday décor, Super Bowl pieces, or festival-themed sets—capture renewed interest each year.",
  },
];

function buildPersonalizedSuggestions(items = []) {
  const suggestions = [];
  const seen = new Set();
  const builtText = (item) =>
    [
      item.title,
      item.brand,
      item.category,
      item.team,
      item.athlete,
      item.tags?.join(" ") || "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  items.forEach((item) => {
    const text = builtText(item);
    PERSONALIZED_PATTERNS.forEach(({ keywords, suggestion }) => {
      if (suggestions.length >= 3) return;
      if (
        keywords.some((keyword) => text.includes(keyword)) &&
        !seen.has(suggestion)
      ) {
        suggestions.push(suggestion);
        seen.add(suggestion);
      }
    });
  });

  return suggestions.slice(0, 2);
}

function MovementArrowIcon() {
  return (
    <svg
      width="28"
      height="36"
      viewBox="0 0 28 36"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M2 32L8 24L14 28L20 18L26 10"
        stroke="#e4d6b2"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
