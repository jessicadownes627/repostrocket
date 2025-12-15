// src/utils/trendSenseEvents.js
// Bridge between real-world news and a specific inventory item.

import { fetchRSSFeeds } from "./fetchRSSFeeds";

export const HEADLINE_RECENCY_LIMIT_DAYS = 21;
const CATALYST_KEYWORDS = [
  "spike",
  "surge",
  "drop",
  "dip",
  "soar",
  "launch",
  "release",
  "restock",
  "shortage",
  "sellout",
  "sold out",
  "rumor",
  "trade",
  "delay",
  "breakout",
  "viral",
  "record",
  "frenzy",
  "buzz",
  "shock",
  "halt",
  "listing",
  "auction",
  "bid",
  "demand",
  "supply",
];

export async function getTrendEventsForItem(item = {}) {
  const {
    title = "",
    brand = "",
    category = "",
    athlete = "",
    sport = "",
    team = "",
    tags = [],
  } = item;

  // 1. Pull live RSS headlines (multiple categories at once)
  const rssData = await fetchRSSFeeds([
    "https://www.espn.com/espn/rss/news", // sports general
    "https://www.espn.com/mlb/rss/news", // MLB
    "https://www.espn.com/nfl/rss/news", // NFL
    "https://www.espn.com/nba/rss/news", // NBA
    "https://www.espn.com/nhl/rss/news", // NHL
    "https://www.tmz.com/rss.xml", // celeb news
    "https://www.eonline.com/syndication/feeds/rssfeeds", // fashion/celeb
    "https://variety.com/feed/", // entertainment
    "https://www.vogue.com/feed/rss", // fashion
    "https://www.hypebeast.com/feed", // streetwear
    "https://www.complex.com/rss", // pop culture drops
  ]);

  const searchTerms = [
    title,
    brand,
    category,
    athlete,
    sport,
    team,
    ...tags,
  ]
    .map((t) => t?.toLowerCase())
    .filter(Boolean);

  const matches = [];

  // 2. Scan each headline for matches
  rssData.forEach((entry) => {
    const headline = (entry.title || "").toLowerCase();
    const description = (entry.description || "").toLowerCase();

    let score = 0;
    const termsHit = [];

    searchTerms.forEach((term) => {
      if (!term) return;
      if (headline.includes(term)) {
        score += 10;
        termsHit.push(term);
      }
      if (description.includes(term)) {
        score += 6;
        termsHit.push(term);
      }
    });

    if (score > 0) {
      matches.push({
        headline: entry.title,
        description: entry.description || "",
        source: entry.source,
        publishedAt: entry.publishedAt,
        link: entry.link,
        score,
        termsHit,
      });
    }
  });

  const sortedMatches = matches.sort((a, b) => b.score - a.score);
  if (sortedMatches.length === 0) {
    return {
      eventLinked: false,
      eventImpactScore: 0,
      eventReasons: [],
      eventHeadline: null,
      eventTimestamp: null,
      eventHeadlines: [],
      trendGuidance: buildTrendGuidance(null, item, []),
    };
  }

  const mappedMatches = sortedMatches.map((entry) => {
    const daysSince = daysSinceDate(entry.publishedAt);
    const isRecent =
      daysSince != null ? daysSince <= HEADLINE_RECENCY_LIMIT_DAYS : false;
    const hasCatalyst = hasCatalystSignal(entry.headline, entry.description);
    return {
      ...entry,
      formattedSource: formatSource(entry.source),
      daysSince,
      isRecent,
      hasCatalyst,
    };
  });
  const topHeadlines = mappedMatches.slice(0, 3).map((entry) => ({
    title: entry.headline,
    source: entry.formattedSource,
    publishedAt: entry.publishedAt || null,
    link: entry.link || entry.source || "",
    isHistorical: !entry.isRecent || !entry.hasCatalyst,
  }));
  const recentMatches = mappedMatches.filter(
    (entry) => entry.isRecent && entry.hasCatalyst
  );
  const bestRecent = recentMatches[0] || null;

  if (!bestRecent) {
    return {
      eventLinked: false,
      eventImpactScore: 0,
      eventReasons: [],
      eventHeadline: null,
      eventTimestamp: null,
      eventHeadlines: topHeadlines.map((h) => ({ ...h, isHistorical: true })),
      trendGuidance: buildTrendGuidance(null, item, topHeadlines),
    };
  }

  return {
    eventLinked: true,
    eventImpactScore: bestRecent.score,
    eventReasons: [
      `Matched terms: ${bestRecent.termsHit.join(", ")}`,
      `Recent news: ${bestRecent.headline}`,
    ],
    eventHeadline: bestRecent.headline,
    eventTimestamp: bestRecent.publishedAt,
    eventHeadlines: topHeadlines,
    trendGuidance: buildTrendGuidance(bestRecent, item, topHeadlines),
  };
}

function buildTrendGuidance(bestMatch, item, headlines = []) {
  const recentHeadlines = Array.isArray(headlines)
    ? headlines.filter((h) => !h.isHistorical)
    : [];
  const count = recentHeadlines.length;
  const latestDate = recentHeadlines[0]?.publishedAt || null;
  const daysSince = latestDate ? daysSinceDate(latestDate) : null;
  const fallbackDate = headlines[0]?.publishedAt || null;
  const fallbackDays = fallbackDate ? daysSinceDate(fallbackDate) : null;
  if (!bestMatch) {
    return {
      action: "Hold",
      reason:
        daysSince != null
          ? `No relevant headlines in the last ${daysSince} days — pricing usually stays steady.`
          : fallbackDays != null
          ? `Only historical headlines found (last relevant was ${fallbackDays} days ago).`
          : "No major headlines tied to this listing — pricing usually stays steady.",
      headlineCount: 0,
      daysSinceHeadline: daysSince ?? fallbackDays,
    };
  }
  const score = bestMatch.score || 0;
  let action = "Hold";
  if (score >= 24) {
    action = "Increase";
  } else if (score >= 12) {
    action = "Watch";
  }

  const sourceLabel = formatSource(bestMatch.source);
  const term = formatPrimaryTerm(bestMatch, item);
  const actionPhrase =
    action === "Increase"
      ? "may support firmer pricing for a moment"
      : action === "Watch"
      ? "may shift demand soon — worth monitoring"
      : "often keeps prices steady";
  const baseReason = `${term} just appeared in ${sourceLabel}'s coverage, so demand ${actionPhrase}.`;
  const detail =
    count > 0
      ? `Based on ${count} recent headline${count > 1 ? "s" : ""}.`
      : daysSince != null
      ? `No relevant headlines in the last ${daysSince} days.`
      : "No recent headlines yet.";

  return {
    action,
    reason: `${baseReason} ${detail}`,
    headlineCount: count,
    daysSinceHeadline: daysSince,
  };
}

function formatSource(url) {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return hostname || "the news";
  } catch {
    return "the news";
  }
}

function formatPrimaryTerm(match, item) {
  if (match?.termsHit?.length) {
    return titleCase(match.termsHit[0]);
  }
  return (
    item?.athlete ||
    item?.team ||
    item?.brand ||
    (item?.title ? item.title.split(" ")[0] : "This item")
  );
}

function titleCase(str = "") {
  return str
    .toString()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function daysSinceDate(dateStr) {
  const parsed = Date.parse(dateStr);
  if (Number.isNaN(parsed)) return null;
  return Math.max(0, Math.round((Date.now() - parsed) / (1000 * 60 * 60 * 24)));
}

function hasCatalystSignal(...texts) {
  return texts.some((text) => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return CATALYST_KEYWORDS.some((keyword) => lower.includes(keyword));
  });
}
