// Aggregate multiple RSS feeds into a single flat list of entries via the Netlify RSS proxy.

import { fetchRSSFeedsViaProxy } from "../trends/fetchRSS";

const isValidUrl = (url) =>
  typeof url === "string" && /^https?:\/\//i.test(url.trim());

export async function fetchRSSFeeds(urls = []) {
  const targets = Array.isArray(urls) ? urls.filter(isValidUrl) : [];
  if (!targets.length) return [];

  try {
    const feeds = await fetchRSSFeedsViaProxy(targets);
    const results = [];

    feeds.forEach((feed) => {
      if (!Array.isArray(feed?.items)) return;
      feed.items.forEach((entry) => {
        results.push({
          title: entry?.title || "",
          description: entry?.description || "",
          link: entry?.link || "",
          source: feed.url || "",
          publishedAt: entry?.publishedAt || null,
        });
      });
    });

    return results;
  } catch (err) {
    console.error("fetchRSSFeeds failed:", err);
    return [];
  }
}
