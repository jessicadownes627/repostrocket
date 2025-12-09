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
          source: url,
          // The existing fetchRSSFeed helper does not expose pubDate yet,
          // so we default this to null for now.
          publishedAt: entry.publishedAt || null,
        }))
      );
    } catch (err) {
      console.warn("fetchRSSFeeds error:", url, err);
    }
  }

  return results;
}

