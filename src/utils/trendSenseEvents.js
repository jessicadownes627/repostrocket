// src/utils/trendSenseEvents.js
// Bridge between real-world news and a specific inventory item.

import { fetchRSSFeeds } from "./fetchRSSFeeds";

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
        source: entry.source,
        publishedAt: entry.publishedAt,
        score,
        termsHit,
      });
    }
  });

  if (matches.length === 0) {
    return {
      eventLinked: false,
      eventImpactScore: 0,
      eventReasons: [],
      eventHeadline: null,
      eventTimestamp: null,
    };
  }

  // 3. Pick the strongest match (highest score; if tie, whichever appears first after sort)
  const best = matches.sort((a, b) => b.score - a.score)[0];

  return {
    eventLinked: true,
    eventImpactScore: best.score,
    eventReasons: [
      `Matched terms: ${best.termsHit.join(", ")}`,
      `Recent news: ${best.headline}`,
    ],
    eventHeadline: best.headline,
    eventTimestamp: best.publishedAt,
  };
}

