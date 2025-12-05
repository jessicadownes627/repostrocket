/* eslint-env node */
import OpenAI from "openai";
import fetch from "node-fetch";
import { DOMParser } from "@xmldom/xmldom";

const RSS_FEEDS = [
  "https://www.retaildive.com/feeds/news/",
  "https://www.voguebusiness.com/feed",
  "https://www.theverge.com/rss/index.xml",
  "https://kotaku.com/rss",
];

async function fetchRSS(url) {
  const encoded = encodeURIComponent(url);
  const resp = await fetch(`https://api.allorigins.win/raw?url=${encoded}`);
  const xml = await resp.text();

  const dom = new DOMParser().parseFromString(xml);

  const items = [...dom.getElementsByTagName("item")].slice(0, 5);

  return items.map((item) => ({
    title: item.getElementsByTagName("title")[0]?.textContent || "",
    description:
      item.getElementsByTagName("description")[0]?.textContent || "",
  }));
}

export async function handler() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OpenAI API key" }),
      };
    }

    const headlines = [];

    for (const feed of RSS_FEEDS) {
      try {
        const items = await fetchRSS(feed);
        headlines.push(...items);
      } catch (err) {
        console.warn("RSS error:", feed, err);
      }
    }

    const snippet = headlines
      .map((h) => `- ${h.title}: ${h.description}`)
      .join("\n");

    const client = new OpenAI({ apiKey });

    const result = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You summarize trending product categories for resellers. Return JSON with { trends: [ { trend, reason } ] }.",
        },
        {
          role: "user",
          content: `Summarize these headlines:\n${snippet}`,
        },
      ],
    });

    const parsed = JSON.parse(
      result.choices?.[0]?.message?.content || "{}"
    );

    return {
      statusCode: 200,
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Trend API failed" }),
    };
  }
}
