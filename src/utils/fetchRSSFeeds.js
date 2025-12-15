// Aggregate multiple RSS feeds into a single flat list of entries.
// Relies on the browser-friendly fetch helper in src/trends/fetchRSS.js.

import { fetchRSSFeed } from "../trends/fetchRSS";

export async function fetchRSSFeeds(urls = []) {
  const results = [];

  for (const url of urls) {
    try {
      const items = await fetchRSSFeed(url);
      results.push(
        ...items.map((entry) => ({
          title: entry.title || "",
          description: entry.description || "",
          link: entry.link || "",
          source: url,
          publishedAt: entry.publishedAt || null,
        }))
      );
    } catch (err) {
      console.warn("fetchRSSFeeds error:", url, err);
    }
  }

  return results;
}
