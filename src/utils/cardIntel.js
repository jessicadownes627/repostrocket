import { fileToDataUrl, getPhotoUrl, normalizePhotosArray } from "./photoHelpers";
import { cropToCardBounds } from "./cardCropper";

const EMPTY_INTEL = {
  player: "",
  team: "",
  sport: "",
  year: "",
  setName: "",
  cardNumber: "",
  brand: "",
  notes: "",
  confidence: {},
  sources: {},
};

const CONFIDENCE_DEFAULTS = ["player", "year", "setName", "cardNumber", "brand"];
const CORNER_NAME_MAP = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};
const CORNER_SIZE_RATIO = 0.22;

async function ensureDataUrlFromSource(source) {
  if (!source) return "";
  try {
    const response = await fetch(source);
    const blob = await response.blob();
    if (!blob) return "";
    const file = new File([blob], "card-photo", { type: blob.type || "image/jpeg" });
    return await fileToDataUrl(file);
  } catch (err) {
    console.error("Card intel: failed to fetch image source", err);
    return "";
  }
}

async function dataUrlFromEntry(entry) {
  if (!entry) return "";
  if (entry.file instanceof File || entry.file instanceof Blob) {
    try {
      return await fileToDataUrl(entry.file);
    } catch (err) {
      console.error("Card intel: failed to convert file", err);
    }
  }

  const src = entry.url || getPhotoUrl(entry) || "";
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  return await ensureDataUrlFromSource(src);
}

function sanitizeText(value, limit = 160) {
  if (value === null || value === undefined) return "";
  const str = String(value).trim();
  if (!str) return "";
  return str.length > limit ? `${str.slice(0, limit)}…` : str;
}

function buildHints(item = {}) {
  const cleanTags = Array.isArray(item.tags) ? item.tags.filter(Boolean) : [];
  return {
    brand: sanitizeText(item.brand, 80),
    title: sanitizeText(item.title, 160),
    description: sanitizeText(item.description, 360),
    tags: cleanTags.slice(0, 6).map((tag) => sanitizeText(tag, 32)),
  };
}

function collectPhotos(item = {}, explicit = []) {
  if (explicit && explicit.length) return explicit.filter(Boolean);
  const list = [];
  if (Array.isArray(item.photos)) {
    list.push(...normalizePhotosArray(item.photos, "card photo"));
  }
  if (Array.isArray(item.secondaryPhotos)) {
    list.push(...normalizePhotosArray(item.secondaryPhotos, "secondary card photo"));
  }
  if (Array.isArray(item.cardPhotos)) {
    list.push(...normalizePhotosArray(item.cardPhotos, "card photo"));
  }
  return list.filter(Boolean);
}

export async function analyzeCardImages(item = {}, options = {}) {
  const entries = collectPhotos(item, options.photos || []);
  if (!entries.length) return null;

  const frontEntry = entries[0];
  const backEntry = entries[1] || null;

  const overrideFront = options.frontDataUrl;
  const overrideBack = options.backDataUrl;

  const frontImage = overrideFront || (await dataUrlFromEntry(frontEntry));
  const backImage = overrideBack || (backEntry ? await dataUrlFromEntry(backEntry) : null);

  if (!frontImage && !backImage) return null;

  const payload = {
    frontImage,
    backImage,
    altText: {
      front: sanitizeText(frontEntry?.altText || frontEntry?.label || "", 120),
      back: sanitizeText(backEntry?.altText || backEntry?.label || "", 120),
    },
    hints: buildHints(item),
  };

  const cornerFront =
    frontImage && options.enableCornerCrop !== false
      ? await maybeCropForCorners(frontImage)
      : { dataUrl: frontImage, confidence: 0 };
  const cornerBack =
    backImage && options.enableCornerCrop !== false
      ? await maybeCropForCorners(backImage)
      : { dataUrl: backImage, confidence: 0 };

  try {
    const response = await fetch("/.netlify/functions/cardIntel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("Card intel function error:", await response.text());
      return null;
    }

    const data = await response.json();
    const cornerInsights = await analyzeCornerPhotos({
      frontImage: cornerFront.dataUrl,
      backImage: cornerBack.dataUrl,
    });

    const merged = {
      ...EMPTY_INTEL,
      ...data,
      confidence: ensureConfidence(data?.confidence),
      sources: data?.sources || data?.verification || {},
    };

    if (cornerInsights) {
      merged.corners = cornerInsights.corners;
      merged.cornerCondition = cornerInsights.condition;
      if (!merged.notes && cornerInsights.condition?.summary) {
        merged.notes = cornerInsights.condition.summary;
      }
    }
    return merged;
  } catch (err) {
    console.error("Failed to analyze card images:", err);
    return null;
  }
}

function ensureConfidence(confidence = {}) {
  const next = { ...confidence };
  CONFIDENCE_DEFAULTS.forEach((key) => {
    if (!next[key]) next[key] = "low";
  });
  return next;
}

export function buildCardAttributesFromIntel(intel) {
  if (!intel) return null;
  return {
    player: intel.player || "",
    team: intel.team || "",
    sport: intel.sport || "",
    year: intel.year || "",
    set: intel.setName || intel.set || "",
    setName: intel.setName || intel.set || "",
    cardNumber: intel.cardNumber || "",
    brand: intel.brand || "",
    parallel: intel.parallel || "",
    notes: intel.notes || "",
    confidence: ensureConfidence(intel.confidence || {}),
    sources: intel.sources || {},
    corners: intel.corners || null,
    cornerCondition: intel.cornerCondition || null,
    grading: intel.grading || null,
    pricing: intel.pricing || null,
  };
}

export function extractCornerPhotoEntries(intel) {
  if (!intel?.corners) return [];
  const entries = [];
  ["front", "back"].forEach((side) => {
    const set = intel.corners?.[side];
    if (!set) return;
    const sideLabel = side === "front" ? "Front" : "Back";
    Object.entries(set).forEach(([key, data]) => {
      if (!data?.image) return;
      const cornerLabel = CORNER_NAME_MAP[key] || key;
      entries.push({
        url: data.image,
        altText: `${sideLabel} ${cornerLabel} corner detail`,
        label: `${sideLabel} ${cornerLabel}`,
        side: sideLabel,
        cornerKey: key,
        confidence: data.confidence || "low",
      });
    });
  });
  return entries;
}

export async function buildCornerPreviewFromEntries(frontEntry, backEntry) {
  const frontImage = await dataUrlFromEntry(frontEntry);
  const backImage = await dataUrlFromEntry(backEntry);
  if (!frontImage && !backImage) return null;

  const cornerFront = frontImage ? await maybeCropForCorners(frontImage) : { dataUrl: null };
  const cornerBack = backImage ? await maybeCropForCorners(backImage) : { dataUrl: null };

  const insights = await analyzeCornerPhotos({
    frontImage: cornerFront.dataUrl,
    backImage: cornerBack.dataUrl,
  });
  if (!insights?.corners) return null;

  return {
    corners: insights.corners,
    condition: insights.condition,
    entries: extractCornerPhotoEntries({ corners: insights.corners }),
  };
}

async function maybeCropForCorners(dataUrl) {
  if (!dataUrl) {
    return { dataUrl, confidence: 0 };
  }
  const crop = await cropToCardBounds(dataUrl);
  if (crop?.confidence >= 0.55) {
    return crop;
  }
  return { dataUrl, confidence: 0 };
}

async function analyzeCornerPhotos({ frontImage, backImage }) {
  const corners = {};
  if (frontImage) {
    corners.front = await extractCornersFromImage(frontImage);
  }
  if (backImage) {
    corners.back = await extractCornersFromImage(backImage);
  }
  const hasCorners =
    (corners.front && Object.values(corners.front).some(Boolean)) ||
    (corners.back && Object.values(corners.back).some(Boolean));
  if (!hasCorners) return null;
  return {
    corners,
    condition: buildCornerConditionSummary(corners),
  };
}

async function extractCornersFromImage(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = Math.round(Math.min(img.width, img.height) * CORNER_SIZE_RATIO);
      if (!size || size < 8) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      const crops = {
        topLeft: cropCorner(ctx, img, 0, 0, size),
        topRight: cropCorner(ctx, img, img.width - size, 0, size),
        bottomLeft: cropCorner(ctx, img, 0, img.height - size, size),
        bottomRight: cropCorner(ctx, img, img.width - size, img.height - size, size),
      };
      resolve(crops);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

function cropCorner(ctx, img, sx, sy, size) {
  if (sx < 0 || sy < 0) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const score = computeCornerScore(imageData);
  return {
    image: canvasToDataUrl(ctx.canvas),
    score,
    confidence: mapScoreToConfidence(score),
  };
}

function canvasToDataUrl(canvas) {
  try {
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return "";
  }
}

function computeCornerScore(imageData) {
  if (!imageData) return 0;
  const { data } = imageData;
  let sum = 0;
  let sumSq = 0;
  const total = data.length / 4;
  if (!total) return 0;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
    sum += brightness;
    sumSq += brightness * brightness;
  }
  const mean = sum / total;
  const variance = sumSq / total - mean * mean;
  const stdDev = Math.sqrt(Math.max(variance, 0));
  return Math.round(stdDev);
}

function mapScoreToConfidence(score) {
  if (score >= 40) return "high";
  if (score >= 22) return "medium";
  return "low";
}

function buildCornerConditionSummary(corners = {}) {
  const front = summarizeSide(corners.front);
  const back = summarizeSide(corners.back);
  const parts = [];
  if (front?.description) parts.push(`Front corners appear ${front.description}.`);
  if (back?.description) parts.push(`Back corners appear ${back.description}.`);
  return {
    summary: parts.join(" ") || "",
    front,
    back,
  };
}

function summarizeSide(sideCorners) {
  if (!sideCorners) return null;
  const entries = Object.values(sideCorners).filter(Boolean);
  if (!entries.length) return null;
  const avgScore =
    entries.reduce((acc, entry) => acc + (entry.score || 0), 0) / entries.length;
  const confidence = mapScoreToConfidence(avgScore);
  const description =
    confidence === "high"
      ? "sharp"
      : confidence === "medium"
      ? "clean with minor wear"
      : "soft or worn";
  return {
    averageScore: Math.round(avgScore),
    confidence,
    description,
  };
}
