import { useEffect, useMemo, useRef, useState } from "react";
import { fetchRSSFeeds } from "../utils/fetchRSSFeeds";
import { loadListingLibrary, setListingTracked } from "../utils/savedListings";
import { runTrendSenseInfinity } from "../utils/trendSenseInfinity";
import { useNavigate } from "react-router-dom";
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
    headline: "Legacy franchises anchor today’s headlines",
    source: "TrendSense desk",
    publishedAt: new Date().toISOString(),
    description: "Collectors keep a close eye on cultural heavyweights whenever attention clusters.",
    link: "#",
  },
];

const CATEGORY_SOURCE_MAP = {
  "espn.com": "sports",
  "tmz.com": "media",
  "eonline.com": "media",
  "variety.com": "media",
  "vogue.com": "fashion",
  "hypebeast.com": "fashion",
  "complex.com": "culture",
};

const CATEGORY_KEYWORDS = {
  sports: ["playoff", "championship", "team", "trade", "nba", "nfl", "mlb", "nhl"],
  retail: ["designer", "collection", "runway", "brand", "fashion", "apparel", "luxury"],
  media: ["movie", "series", "music", "culture", "celebrity", "broadcast", "premiere", "documentary"],
  business: ["earnings", "deal", "launch", "industry", "platform", "company", "investment"],
  policy: ["regulation", "policy", "legislation", "govern", "law"],
  tech: ["ai", "technology", "streaming", "platform", "software", "hardware"],
};
const CATEGORY_DISPLAY = {
  sports: "Sports",
  retail: "Retail",
  media: "Media",
  business: "Business",
  policy: "Policy",
  tech: "Tech",
};
export default function TrendSenseDashboard() {
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savedItems, setSavedItems] = useState([]);
  const [glowingIds, setGlowingIds] = useState([]);
  const [reports, setReports] = useState([]);
  const [newsEntries, setNewsEntries] = useState(
    FALLBACK_NEWS.map(normalizeFallback)
  );
  const previousStatuses = useRef({});

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
      const trackedLibrary = library.filter((item) => item.isTracked !== false);
      setSavedItems(trackedLibrary);
      setNewsEntries(normalizeNewsEntries(newsFeed));
      setReports(infinityData?.reports || []);
      setLoading(false);
    };
    loadTrendSense().catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [hasAccess]);

  const marketPulse = useMemo(() => buildMarketPulse(newsEntries), [newsEntries]);
  const itemStories = useMemo(
    () => buildItemStories(savedItems, reports),
    [savedItems, reports]
  );
  const sortedItemStories = useMemo(() => {
    return [...itemStories].sort((a, b) => {
      if (a.active === b.active) return 0;
      return a.active ? -1 : 1;
    });
  }, [itemStories]);

  const handleRemoveFromTracking = (id) => {
    setListingTracked(id, false);
    setSavedItems((prev) => prev.filter((item) => item.id !== id));
  };

  useEffect(() => {
    const timerIds = [];
    const newStatusMap = {};
    itemStories.forEach((story) => {
      newStatusMap[story.id] = story.active;
      const wasActive = previousStatuses.current[story.id];
      if (story.active && !wasActive) {
        setGlowingIds((prev) => [...prev, story.id]);
        const timer = setTimeout(() => {
          setGlowingIds((prev) => prev.filter((id) => id !== story.id));
        }, 750);
        timerIds.push(timer);
      }
    });
    previousStatuses.current = newStatusMap;
    return () => {
      timerIds.forEach((timer) => clearTimeout(timer));
    };
  }, [itemStories]);

  if (loading) {
    return <div className="trend-page-loading">Preparing today’s briefing…</div>;
  }

  return (
    <div className="trend-page trend-briefing">
      <section className="hero-section">
        <h1 className="hero-title text-display">TrendSense</h1>
      </section>
      <div className="hero-gold-separator" aria-hidden="true" />

      <section className="attention-strip" aria-label="Live attention">
        <p className="attention-label text-meta">ATTENTION IS CLUSTERING AROUND:</p>
        <div className="attention-chips">
          {buildAttentionChips(marketPulse).map((chip) => (
            <span key={chip} className="attention-chip text-meta">
              {chip}
            </span>
          ))}
        </div>
      </section>

      <div className="section-accent" aria-hidden="true" />
      <section className="live-listings">
        <div className="section-heading">
          <p className="section-label text-headline">LIVE LISTINGS</p>
          <p className="section-subhead text-meta">
            See how today’s cultural spotlight connects to your saved items.
          </p>
        </div>
        <div className="live-listings-grid">
          {sortedItemStories.length ? (
            sortedItemStories.map((story) => (
              <article
                key={story.id}
                className={`live-listing-card ${story.active ? "active" : "quiet"} ${
                  glowingIds.includes(story.id) ? "glow" : ""
                }`}
              >
                <div className="live-status">
                  <span className={`status-icon ${story.active ? "active" : "quiet"}`}>
                    {story.active ? (
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M4 16L10 10L13.5 13.5L20 7"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M20 7V13.5H13.5"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : (
                      <span className="minus-sign">—</span>
                    )}
                  </span>
                  <span className="status-label text-meta">
                    {story.active ? "ACTIVE" : "QUIET"}
                  </span>
                </div>
                <p className="live-listing-name text-headline">
                  {story.itemName}
                </p>
                {story.active && (
                  <p className="live-listing-context text-body">
                    {buildListingContextLine(story)}
                  </p>
                )}
                <div className="live-listing-actions">
                  <button
                    type="button"
                    className="live-remove"
                    onClick={() => handleRemoveFromTracking(story.id)}
                  >
                    Remove from tracking
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="text-meta">
              Add items to your watch list to see live attention for each listing.
            </p>
          )}
        </div>
      </section>
      <div className="section-divider" aria-hidden="true" />

      <section className="market-pulse">
        <div className="section-heading">
          <p className="section-label text-headline">MARKET PULSE</p>
          <p className="section-subhead text-meta">
            What’s happening in the world right now
          </p>
        </div>
        <div className="pulse-list">
          {marketPulse.slice(0, 5).map((entry) => (
            <article key={entry.headline} className="pulse-card">
              <div className="pulse-headline-row">
                <span className="pulse-bullet" aria-hidden="true" />
                <a
                  href={entry.link || "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="pulse-headline text-headline headline-link"
                >
                  {entry.headline}
                </a>
              </div>
              <p className="pulse-meta text-meta">
                {entry.source}
                {entry.publishedLabel ? ` · ${entry.publishedLabel}` : ""}
              </p>
              <div className={`pulse-tags ${entry.tagsDimmed ? "dimmed" : ""}`}>
                {(entry.tags || []).map((tag) => (
                  <span
                    key={`${entry.headline}-${tag.text}`}
                    className={`pulse-tag pulse-tag--${tag.variant}`}
                  >
                    {tag.text}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
      <div className="market-pulse-divider" aria-hidden="true" />

      <section className="check-closet">
        <p className="section-intro text-meta">If any of this sounds familiar…</p>
        <h3 className="text-headline">Check your closet for:</h3>
        <ul className="closet-bullets">
          {buildClosetChecklist(marketPulse).map((bullet) => (
            <li key={bullet} className="text-body">
              {bullet}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="primary-cta"
          onClick={() =>
            navigate("/single-listing", { state: { fromTrendSense: true } })
          }
        >
          Add an item
        </button>
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

function buildMarketPulse(entries = []) {
  const selected = selectBalancedPulse(entries);
  return applyTagStacks(selected);
}

function buildAttentionChips(entries = []) {
  const seen = new Set();
  const chips = [];
  const tokenStopWords = new Set([
    "where",
    "inside",
    "source",
    "sources",
    "source(s)",
    "goal",
    "what",
    "today",
    "trend",
    "update",
    "roster",
    "power rankings",
  ]);
  for (const entry of entries) {
    for (const tag of entry.tags || []) {
      if (tag.variant === "category") continue;
      const label = tag.text;
      const normalized = label.toLowerCase();
      if (tokenStopWords.has(normalized)) continue;
      if (!isSemanticChip(label)) continue;
      if (seen.has(normalized)) continue;
      seen.add(normalized);
      chips.push(label);
      if (chips.length >= 10) break;
    }
    if (chips.length >= 10) break;
  }
  return chips && chips.length ? chips : ["No major headlines detected"];
}

const CLOSET_MATCHERS = [
  {
    keywords: ["Calvin Klein", "Gucci", "Prada", "Hermès", "Dior", "Louis Vuitton", "Chanel"],
    build: (match) => `Designer clothing & accessories (${match} coverage today)`,
  },
  {
    keywords: ["LEGO"],
    build: () => "LEGO sets & collectibles (LEGO coverage today)",
  },
  {
    keywords: ["Nike", "Adidas", "Jordan", "Yeezy"],
    build: (match) => `Collectible sneakers & sport apparel (${match} coverage today)`,
  },
  {
    keywords: ["NFL", "NBA", "MLB", "NHL"],
    build: (match) => `${match} team apparel & player memorabilia`,
  },
  {
    keywords: ["Trade", "Deal"],
    build: () => "Player trading cards & signed memorabilia (trade coverage today)",
  },
  {
    keywords: ["Streaming", "Media rights"],
    build: () => "Streaming & media merchandise (platform coverage today)",
  },
];

function buildClosetChecklist(entries = []) {
  const tags = new Set();
  entries.forEach((entry) => {
    (entry.tags || []).forEach((tag) => {
      if (tag.variant === "category") return;
      tags.add(tag.text);
    });
  });
  const normalizedTags = new Set(
    Array.from(tags).map((tag) => tag.toLowerCase().trim())
  );
  const bullets = [];
  for (const matcher of CLOSET_MATCHERS) {
    if (bullets.length >= 5) break;
    const match = matcher.keywords.find((keyword) =>
      normalizedTags.has(keyword.toLowerCase())
    );
    if (match) {
      const text = matcher.build(match);
      if (!bullets.includes(text)) {
        bullets.push(text);
      }
    }
  }
  if (!bullets.length && tags.size) {
    const fallback = `${Array.from(tags)[0]} related pieces & collectibles`;
    bullets.push(fallback);
  }
  return bullets.slice(0, 5);
}
function isSemanticChip(label = "") {
  const normalized = label.toLowerCase();
  if (!label.trim()) return false;
  if (normalized.includes(" ")) return true;
  const singleWord = !label.includes(" ");
  const teamPattern = /^[A-Z][a-z]+s$/;
  const brandSet = new Set([
    "nike",
    "adidas",
    "gucci",
    "lego",
    "supreme",
    "amazon",
    "apple",
    "psa",
    "bgs",
    "cgc",
  ]);
  const uppercase = label === label.toUpperCase();
  if (!singleWord) return false;
  return (
    teamPattern.test(label) || uppercase || brandSet.has(normalized) || label.length > 5
  );
}

function selectBalancedPulse(entries = []) {
  if (!entries.length) return [];
  const targetSize = 5;
  const sportsLimit = Math.floor(targetSize / 2);
  const buckets = entries.reduce((acc, entry) => {
    const category = entry.category || "media";
    (acc[category] = acc[category] || []).push(entry);
    return acc;
  }, {});
  const prioritized = ["business", "retail", "media", "policy", "tech"];
  const selected = [];
  const appendFromBucket = (name, limit = 1) => {
    const bucket = buckets[name] || [];
    while (bucket.length && selected.length < targetSize && limit > 0) {
      const candidate = bucket.shift();
      if (!selected.includes(candidate)) {
        selected.push(candidate);
        limit -= 1;
      }
    }
  };
  prioritized.forEach((category) => appendFromBucket(category));
  const nonSportsExtras = entries.filter(
    (entry) => entry.category !== "sports" && !selected.includes(entry)
  );
  for (const entry of nonSportsExtras) {
    if (selected.length >= targetSize) break;
    selected.push(entry);
  }
  let sportsCount = selected.filter((entry) => entry.category === "sports").length;
  for (const candidate of (buckets.sports || [])) {
    if (selected.length >= targetSize || sportsCount >= sportsLimit) break;
    if (!selected.includes(candidate)) {
      selected.push(candidate);
      sportsCount += 1;
    }
  }
  for (const entry of entries) {
    if (selected.length >= targetSize) break;
    if (!selected.includes(entry)) {
      selected.push(entry);
    }
  }
  return selected.slice(0, targetSize);
}

function normalizeFallback(entry) {
  return {
    headline: entry.headline,
    source: entry.source,
    link: entry.link || "#",
    publishedLabel: formatDateTime(entry.publishedAt),
    category: "media",
    why: entry.description || "",
    tags: buildTagList(entry, "media"),
  };
}

function normalizeNewsEntries(entries = []) {
  if (!entries.length) {
    return FALLBACK_NEWS.map(normalizeFallback);
  }
  return entries
    .filter((entry) => entry?.title)
    .slice(0, 6)
    .map((entry) => {
      const category = categorizeEntry(entry);
      return {
        headline: entry.title,
        source: formatSource(entry.source || entry.link || "TrendSense desk"),
        link: entry.link || entry.source || "#",
        publishedLabel: formatDateTime(entry.publishedAt || entry.pubDate),
        category,
        why: buildWhyLine(entry, category),
        tags: buildTagList(entry, category),
      };
    });
}

function buildItemStories(savedItems = [], reports = []) {
  if (!savedItems.length) return [];
  return savedItems.map((item, idx) => {
    const report = reports.find((r) => r.id === item.id);
    const base = {
      id: item.id || `item-${idx}`,
      itemName: item.title || "Saved listing",
      active: false,
      listingUrl: item.listingUrl || item.url || null,
    };
    if (!report?.ts?.eventLinked) return base;
    const context = [
      report.ts.eventHeadline,
      ...(report.ts.eventHeadlines || []).map((h) => h.title),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const terms = [item.brand, item.team, item.athlete, item.title]
      .filter(Boolean)
      .map((value) => value.toLowerCase());
    const directMatch = terms.some((term) => matchesDirectTerm(term, context));
    if (!directMatch) return base;
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
    return {
      ...base,
      active: true,
      headline,
      source,
      timestampLabel: formatTimestamp(timestamp),
      why: buildItemWhy(headline, item),
      link: report.ts.eventHeadlines?.[0]?.link || "#",
    };
  });
}

function buildListingContextLine(story) {
  const nouns = extractProperNouns(story.headline || "");
  const entity = nouns[0] || story.source || "today's news";
  return `Touched by ${entity} coverage today`;
}

function matchesDirectTerm(term = "", text = "") {
  const normalized = term?.trim();
  if (!normalized) return false;
  const regex = new RegExp(`\\b${escapeRegExp(normalized)}\\b`, "i");
  return regex.test(text);
}

function buildWhyLine(entry, category) {
  const text = `${entry.title} ${entry.description || ""}`.toLowerCase();
  const base = entry.title;
  switch (category) {
    case "sports":
      return `Coverage like this pulls vintage team apparel and game-worn pieces back into buyer focus.`;
    case "fashion":
      return `High-profile mentions often lift designer names, making secondary-market samples more visible.`;
    case "culture":
      return `Cultural buzz around this story can spark renewed curiosity in related collectibles.`;
    case "business":
      return `Platform shifts like this push interest toward early or discontinued releases on resale.`;
    default:
      if (text.includes("release") || text.includes("premiere")) {
        return "New drops often resurface past launches into secondary-market view.";
      }
      if (text.includes("documentary") || text.includes("finale")) {
        return "Documentaries and finales bring earlier seasons back into buyer conversations.";
      }
      if (text.includes("tournament") || text.includes("playoff")) {
        return "Competition cycles keep related memorabilia in the buyer spotlight.";
      }
      return `${base} keeps this category relevant for resellers today.`;
  }
}

function categorizeEntry(entry) {
  const text = `${entry.title} ${entry.description || ""}`.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((keyword) => text.includes(keyword))) {
      return category;
    }
  }
  return "media";
}

function buildTagList(entry, category) {
  const stopWords = ["source", "inside", "goal", "where", "what", "today", "trend"];
  const tags = [];
  const categoryLabel = CATEGORY_DISPLAY[category] || CATEGORY_DISPLAY.media;
  tags.push({ text: categoryLabel, variant: "category" });
  const nouns = extractProperNouns(`${entry.headline} ${entry.description || ""}`);
  nouns.slice(0, 3).forEach((noun) => {
    const normalized = noun.toLowerCase();
    if (stopWords.includes(normalized)) return;
    if (!tags.find((tag) => tag.text === noun)) {
      tags.push({ text: noun, variant: "entity" });
    }
  });
  const contexts = extractContexts(entry);
  contexts.slice(0, 2).forEach((ctx) => {
    const normalized = ctx.toLowerCase();
    if (stopWords.includes(normalized)) return;
    if (!tags.find((tag) => tag.text === ctx)) {
      tags.push({ text: ctx, variant: "context" });
    }
  });
  return tags;
}

function extractContexts(entry) {
  const contextTerms = [
    { key: "nfl", label: "NFL" },
    { key: "mlb", label: "MLB" },
    { key: "nba", label: "NBA" },
    { key: "trade", label: "Trade" },
    { key: "deal", label: "Deal" },
    { key: "earnings", label: "Earnings" },
    { key: "licensing", label: "Licensing" },
    { key: "media rights", label: "Media rights" },
    { key: "streaming", label: "Streaming" },
    { key: "apparel", label: "Apparel" },
    { key: "retail", label: "Retail" },
    { key: "ai", label: "AI" },
    { key: "tour", label: "Tour" },
    { key: "release", label: "Release" },
    { key: "nike", label: "Nike" },
    { key: "adidas", label: "Adidas" },
    { key: "gucci", label: "Gucci" },
    { key: "lego", label: "LEGO" },
    { key: "supreme", label: "Supreme" },
    { key: "amazon", label: "Amazon" },
    { key: "apple", label: "Apple" },
  ];
  const text = `${entry.title} ${entry.description || ""}`.toLowerCase();
  const found = [];
  for (const { key, label } of contextTerms) {
    if (found.length >= 2) break;
    if (text.includes(key)) {
      found.push(label);
    }
  }
  return found;
}

function extractProperNouns(text = "") {
  const matches = [...text.matchAll(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g)];
  const seen = new Set();
  const nouns = [];
  for (const match of matches) {
    const normalized = match[0];
    const key = normalized.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      nouns.push(normalized);
    }
    if (nouns.length >= 3) break;
  }
  return nouns;
}

function extractSourceName(source = "") {
  if (!source) return "";
  try {
    const hostname = new URL(source).hostname;
    const parts = hostname.split(".").filter(Boolean);
    const candidate =
      parts[0] === "www" && parts.length > 1 ? parts[1] : parts[0];
    return candidate.replace(/[^a-z]/gi, "").toLowerCase();
  } catch {
    return "";
  }
}

function extractEntities(text = "") {
  const matches = [...text.matchAll(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g)];
  const entities = { person: "", place: "", team: "" };
  for (const match of matches) {
    const value = match[0];
    if (!entities.person) {
      entities.person = value;
      continue;
    }
    if (!entities.place && /(City|Park|Square|Stadium|Village|Island|Studio|Bridge)/.test(value)) {
      entities.place = value;
      continue;
    }
    if (!entities.team && /(Team|FC|Club|Crew|League|Sports|Company)/.test(value)) {
      entities.team = value;
      continue;
    }
  }
  return entities;
}

function applyTagStacks(entries = []) {
  const stackCounts = {};
  let previousKey = "";
  return entries.map((entry) => {
    const tags = buildTagList(entry, entry.category);
    const key = tags.map((tag) => tag.text).join("|");
    stackCounts[key] = (stackCounts[key] || 0) + 1;
    const tagsDimmed = previousKey === key;
    previousKey = key;
    return {
      ...entry,
      tags,
      tagsDimmed,
    };
  });
}

function buildItemWhy(headline, item) {
  const highlighted = item.brand || item.category || item.title;
  if (highlighted) {
    return `${highlighted} connects to today’s coverage—this moment keeps it relevant.`;
  }
  return `${headline} keeps this kind of item visible right now.`;
}

function formatSource(source) {
  if (!source) return "TrendSense desk";
  try {
    return new URL(source).hostname.replace(/^www\\./, "");
  } catch {
    return source;
  }
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

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&");
}
