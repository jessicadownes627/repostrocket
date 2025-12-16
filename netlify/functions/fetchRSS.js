import { XMLParser, XMLValidator } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
  parseTagValue: true,
});

const USER_AGENT =
  "RepostRocketRSSBot/1.0 (+https://repostrocket.ai/rpa) TrendSense";
const MAX_ITEMS_PER_FEED = 12;

const ensureArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const coerceText = (value) => {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return "";
  if (typeof value["#text"] === "string") return value["#text"];
  if (Array.isArray(value)) return coerceText(value[0]);
  if (typeof value.value === "string") return value.value;
  if (typeof value.href === "string") return value.href;
  return "";
};

const extractItems = (doc) => {
  if (!doc || typeof doc !== "object") return [];
  if (doc.rss?.channel?.item) {
    return ensureArray(doc.rss.channel.item);
  }
  if (doc.channel?.item) {
    return ensureArray(doc.channel.item);
  }
  if (doc.feed?.entry) {
    return ensureArray(doc.feed.entry);
  }
  return [];
};

const normalizeEntry = (entry = {}) => {
  const linkValue = entry.link;
  let link = coerceText(linkValue);
  if (!link && linkValue && typeof linkValue === "object" && Array.isArray(linkValue)) {
    const alt = linkValue.find((item) => typeof item?.href === "string");
    link = alt?.href || "";
  }

  return {
    title: coerceText(entry.title),
    description:
      coerceText(entry.description) ||
      coerceText(entry.summary) ||
      coerceText(entry["content:encoded"]),
    link,
    publishedAt:
      coerceText(entry.pubDate) ||
      coerceText(entry.published) ||
      coerceText(entry.updated) ||
      coerceText(entry["dc:date"]) ||
      null,
  };
};

async function fetchSingleFeed(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/rss+xml, application/xml;q=0.9, */*;q=0.8",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Upstream responded with status ${response.status}`);
  }

  const body = await response.text();
  const trimmed = (body || "").trim();

  if (!trimmed.startsWith("<")) {
    throw new Error("Upstream response was not valid XML");
  }

  const validation = XMLValidator.validate(trimmed);
  if (validation !== true) {
    throw new Error("RSS XML did not validate");
  }

  const parsed = parser.parse(trimmed);
  const entries = extractItems(parsed);
  const items = entries.slice(0, MAX_ITEMS_PER_FEED).map(normalizeEntry);

  return { url, items };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Method not allowed" }),
    };
  }

  let payload = {};
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Invalid JSON body" }),
    };
  }

  const urls = Array.isArray(payload.urls)
    ? payload.urls.filter((u) => typeof u === "string" && u.startsWith("http"))
    : payload.url && typeof payload.url === "string"
    ? [payload.url]
    : [];

  if (urls.length === 0) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ok: false, error: "Missing RSS URL(s)" }),
    };
  }

  const feeds = [];
  const errors = [];

  for (const url of urls) {
    try {
      const feed = await fetchSingleFeed(url);
      feeds.push(feed);
    } catch (err) {
      errors.push({ url, error: err?.message || "Failed to fetch feed" });
    }
  }

  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify({
      ok: errors.length === 0,
      data: feeds,
      errors,
    }),
  };
};
