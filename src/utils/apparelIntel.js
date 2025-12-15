import { fileToDataUrl, getPhotoUrl, normalizePhotosArray } from "./photoHelpers";

const EMPTY_INTEL = {
  itemType: "",
  brand: "",
  size: "",
  condition: "",
  notes: "",
  confidence: {},
  sources: {},
};

const CONFIDENCE_FIELDS = ["itemType", "brand", "size", "condition"];

async function ensureDataUrlFromSource(source) {
  if (!source) return "";
  try {
    const response = await fetch(source);
    const blob = await response.blob();
    if (!blob) return "";
    const file = new File([blob], "apparel-photo", { type: blob.type || "image/jpeg" });
    return await fileToDataUrl(file);
  } catch (err) {
    console.error("Apparel intel: failed to fetch image:", err);
    return "";
  }
}

async function dataUrlFromEntry(entry) {
  if (!entry) return "";
  if (entry.file instanceof File || entry.file instanceof Blob) {
    try {
      return await fileToDataUrl(entry.file);
    } catch (err) {
      console.error("Apparel intel: failed to convert file:", err);
    }
  }

  const src = entry.url || getPhotoUrl(entry) || "";
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  return await ensureDataUrlFromSource(src);
}

function collectPhotoEntries(item = {}, explicit = []) {
  if (explicit && explicit.length) return explicit.filter(Boolean);
  const entries = [];
  if (Array.isArray(item.photos)) entries.push(...normalizePhotosArray(item.photos, "item photo"));
  if (Array.isArray(item.secondaryPhotos)) {
    entries.push(...normalizePhotosArray(item.secondaryPhotos, "secondary photo"));
  }
  if (Array.isArray(item.apparelPhotos)) {
    entries.push(...normalizePhotosArray(item.apparelPhotos, "apparel photo"));
  }
  return entries.filter(Boolean);
}

function sanitize(value, limit = 160) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  return str.length > limit ? `${str.slice(0, limit)}…` : str;
}

function buildHints(item = {}) {
  const tags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
  return {
    brand: sanitize(item.brand, 80),
    title: sanitize(item.title, 160),
    description: sanitize(item.description, 320),
    size: sanitize(item.size, 40),
    tags: tags.slice(0, 6).map((tag) => sanitize(tag, 32)),
  };
}

export async function analyzeApparelImages(item = {}, options = {}) {
  const entries = collectPhotoEntries(item, options.photos || []);
  if (!entries.length) return null;

  const primaryEntry = entries[0];
  const secondaryEntry = entries[1] || null;

  const explicitPrimary = options.frontDataUrl;
  const explicitSecondary = options.backDataUrl;

  const frontImage = explicitPrimary || (await dataUrlFromEntry(primaryEntry));
  const backImage = explicitSecondary || (secondaryEntry ? await dataUrlFromEntry(secondaryEntry) : null);

  if (!frontImage) return null;

  const payload = {
    frontImage,
    backImage,
    altText: {
      front: sanitize(primaryEntry?.altText || primaryEntry?.label || "", 120),
      back: sanitize(secondaryEntry?.altText || secondaryEntry?.label || "", 120),
    },
    hints: buildHints(item),
  };

  try {
    const response = await fetch("/.netlify/functions/apparelIntel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Apparel intel function error:", await response.text());
      return null;
    }

    const result = await response.json();
    return {
      ...EMPTY_INTEL,
      ...result,
      confidence: normalizeConfidence(result?.confidence),
      sources: result?.sources || {},
    };
  } catch (err) {
    console.error("Failed to analyze apparel images:", err);
    return null;
  }
}

function normalizeConfidence(confidence = {}) {
  const next = { ...confidence };
  CONFIDENCE_FIELDS.forEach((field) => {
    if (!next[field]) next[field] = "low";
  });
  return next;
}

export function buildApparelAttributesFromIntel(intel) {
  if (!intel) return null;
  return {
    itemType: intel.itemType || "",
    brand: intel.brand || "",
    size: intel.size || "",
    condition: intel.condition || "",
    notes: intel.notes || "",
    confidence: normalizeConfidence(intel.confidence || {}),
    sources: intel.sources || {},
  };
}

