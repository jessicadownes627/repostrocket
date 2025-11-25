import { useMemo } from "react";

const emojiRegex = /[\u{1F300}-\u{1FAFF}]/gu;

function stripEmojis(str = "") {
  return str.replace(emojiRegex, "");
}

function formatBlock(listingData = {}, platform = "") {
  const { title = "", description = "", category = "", condition = "", price = "" } = listingData;
  const base = `${title}\n${description}`.trim();
  const extras = [category && `Category: ${category}`, condition && `Condition: ${condition}`, price && `Price: $${price}`]
    .filter(Boolean)
    .join("\n");

  const block = [base, extras].filter(Boolean).join("\n\n");

  if (platform === "poshmark" || platform === "mercari") {
    return stripEmojis(block);
  }
  return block;
}

function detectPlatformFromUrl() {
  const url = typeof window !== "undefined" ? window.location.href.toLowerCase() : "";
  if (url.includes("poshmark")) return "poshmark";
  if (url.includes("mercari")) return "mercari";
  if (url.includes("ebay")) return "ebay";
  if (url.includes("depop")) return "depop";
  return "";
}

export function useSmartPaste(listingData, tagBundle = "") {
  const platform = useMemo(() => detectPlatformFromUrl(), []);

  const smartPasteBlock = useMemo(() => {
    const base = formatBlock(listingData, platform);
    if (tagBundle) {
      return `${base}\n\n${tagBundle}`.trim();
    }
    return base;
  }, [listingData, platform, tagBundle]);

  const copyToClipboard = async (overrideText) => {
    try {
      const text = typeof overrideText === "string" ? overrideText : smartPasteBlock || "";
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const platformWarnings = useMemo(() => {
    const warnings = [];
    if (platform === "ebay") warnings.push("Remove emojis for eBay.");
    if (platform === "mercari") warnings.push("Keep copy short for Mercari.");
    return warnings;
  }, [platform]);

  const autoDetectPlatform = (url) => {
    if (!url) return platform;
    const lower = url.toLowerCase();
    if (lower.includes("poshmark")) return "poshmark";
    if (lower.includes("mercari")) return "mercari";
    if (lower.includes("ebay")) return "ebay";
    if (lower.includes("depop")) return "depop";
    return "";
  };

  return { smartPasteBlock, copyToClipboard, platformWarnings, autoDetectPlatform };
}
