// src/trends/fetchRSS.js
export async function fetchRSSFeed(url) {
  try {
    const res = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`
    );
    const data = await res.json();
    const xml = new window.DOMParser().parseFromString(
      data.contents,
      "text/xml"
    );

    const items = Array.from(xml.querySelectorAll("item")).slice(0, 8);

    return items.map((item) => ({
      title: item.querySelector("title")?.textContent || "",
      description: item.querySelector("description")?.textContent || "",
      link: item.querySelector("link")?.textContent || "",
      publishedAt: item.querySelector("pubDate")?.textContent || "",
    }));
  } catch (err) {
    console.warn("RSS error:", url, err);
    return [];
  }
}
