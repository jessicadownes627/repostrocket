const RSS_PROXY_ENDPOINT = "/.netlify/functions/fetchRSS";

async function requestFeeds(payload = {}) {
  const response = await fetch(RSS_PROXY_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`RSS proxy returned ${response.status}`);
  }

  return response.json();
}

export async function fetchRSSFeed(url) {
  if (!url) return [];

  try {
    const payload = await requestFeeds({ urls: [url] });
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      payload.errors.forEach((error) => {
        console.warn(
          "RSS feed error:",
          error?.url || url,
          error?.error || "Unknown error"
        );
      });
    }
    const feed =
      Array.isArray(payload?.data) &&
      payload.data.find((entry) => entry.url === url);
    return Array.isArray(feed?.items) ? feed.items : [];
  } catch (err) {
    console.warn("RSS error:", url, err);
    return [];
  }
}

export async function fetchRSSFeedsViaProxy(urls = []) {
  const payload = await requestFeeds({ urls });
  if (Array.isArray(payload?.errors) && payload.errors.length) {
    payload.errors.forEach((error) => {
      console.warn(
        "RSS feed error:",
        error?.url || "unknown",
        error?.error || "Unknown error"
      );
    });
  }
  return Array.isArray(payload?.data) ? payload.data : [];
}
