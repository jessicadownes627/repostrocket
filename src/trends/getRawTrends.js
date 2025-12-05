// src/trends/getRawTrends.js

export async function getRawTrends() {
  try {
    const resp = await fetch("/.netlify/functions/trends");
    if (!resp.ok) {
      console.warn("getRawTrends: trends function returned non-OK", resp.status);
      return [];
    }
    const data = await resp.json();
    return Array.isArray(data.trends) ? data.trends : [];
  } catch (err) {
    console.warn("getRawTrends failed:", err);
    return [];
  }
}
