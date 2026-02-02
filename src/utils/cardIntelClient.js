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
  grade: "",
  scoreRating: "",
  notes: "",
  confidence: {},
  sources: {},
  isTextVerified: {},
  sourceEvidence: [],
  needsUserConfirmation: true,
  isGradedCard: false,
};

const CONFIDENCE_DEFAULTS = [
  "player",
  "team",
  "year",
  "setName",
  "cardNumber",
  "brand",
  "grade",
  "scoreRating",
];
const CORNER_NAME_MAP = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};
const CORNER_SIZE_RATIO = 0.22;
const CORNER_PADDING_RATIO = 0.12;
export const MAX_CORNER_NUDGE_RATIO = 0.12;
const DEFAULT_ANALYSIS_ERROR_MESSAGE =
  "Card analysis is offline right now. Please retry in a moment.";
const textEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
const ENABLE_BACK_IMAGE =
  import.meta.env.VITE_ALLOW_CARD_INTEL_BACK_IMAGE === "true";
const ENABLE_CORNER_CROPS =
  import.meta.env.VITE_ALLOW_CARD_INTEL_CORNERS === "true";

async function computeImageHash(frontImage = "", backImage = "") {
  const combined = `${frontImage || ""}::${backImage || ""}`;
  if (typeof crypto !== "undefined" && crypto.subtle && textEncoder) {
    try {
      const data = textEncoder.encode(combined);
      const digest = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch (err) {
      console.error("Image hash (subtle) failed:", err);
    }
  }
  // fallback simple hash
  let hash = 0;
  for (let i = 0; i < combined.length; i += 1) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
}

async function ensureDataUrlFromSource(source) {
  if (!source) return "";
  try {
    const response = await fetch(source);
    const blob = await response.blob();
    if (!blob) return "";
    const file = new File([blob], "card-photo", { type: blob.type || "image/jpeg" });
    const raw = await fileToDataUrl(file);
    return await downscaleImageDataUrl(raw);
  } catch (err) {
    console.error("Card intel: failed to fetch image source", err);
    return "";
  }
}

async function dataUrlFromEntry(entry) {
  if (!entry) return "";
  if (entry.file instanceof File || entry.file instanceof Blob) {
    try {
      const raw = await fileToDataUrl(entry.file);
      return await downscaleImageDataUrl(raw);
    } catch (err) {
      console.error("Card intel: failed to convert file", err);
    }
  }

  const src = entry.url || getPhotoUrl(entry) || "";
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const remote = await ensureDataUrlFromSource(src);
  return await downscaleImageDataUrl(remote);
}

async function downscaleImageDataUrl(
  dataUrl,
  { maxDimension = 1200, quality = 0.78 } = {}
) {
  if (!dataUrl) return "";
  if (typeof document === "undefined" || typeof window === "undefined") {
    return dataUrl;
  }
  try {
    const image = await loadImageFromDataUrl(dataUrl);
    if (!image) return dataUrl;
    const maxSide = Math.max(image.width, image.height);
    if (maxSide <= maxDimension) {
      return dataUrl;
    }
    const ratio = maxDimension / maxSide;
    const targetWidth = Math.round(image.width * ratio);
    const targetHeight = Math.round(image.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth || 1;
    canvas.height = targetHeight || 1;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL("image/jpeg", quality);
  } catch (err) {
    console.error("Card intel: failed to downscale image", err);
    return dataUrl;
  }
}

function loadImageFromDataUrl(src) {
  return new Promise((resolve, reject) => {
    if (!src) {
      reject(new Error("No image source provided"));
      return;
    }
    const ImgConstructor = typeof Image !== "undefined" ? Image : null;
    if (!ImgConstructor) {
      reject(new Error("Image constructor not available"));
      return;
    }
    const img = new ImgConstructor();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.src = src;
  });
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

export async function prepareCardIntelPayload(item = {}, options = {}) {
  const entries = collectPhotos(item, options.photos || []);
  if (!entries.length) {
    return { error: "missing_photos" };
  }

  const frontEntry = entries[0];
  const backEntry = entries[1] || null;

  const overrideFront = options.frontDataUrl;
  const overrideBack = options.frontDataUrl ? null : options.backDataUrl;
  const includeBackImage =
    (ENABLE_BACK_IMAGE &&
      options.includeBackImage !== false &&
      Boolean(backEntry)) ||
    Boolean(overrideBack);

  const frontImage = overrideFront || (await dataUrlFromEntry(frontEntry));
  const backImage =
    includeBackImage && backEntry ? await dataUrlFromEntry(backEntry) : overrideBack || null;

  if (!frontImage && !backImage) {
    return { error: "no_images" };
  }

  const payload = {
    frontImage,
    backImage,
    altText: {
      front: sanitizeText(frontEntry?.altText || frontEntry?.label || "", 120),
      back: sanitizeText(backEntry?.altText || backEntry?.label || "", 120),
    },
    hints: buildHints(item),
  };

  if (options.includeNameZones !== false) {
    const nameZoneCrops = await buildNameZoneCrops(frontImage);
    if (nameZoneCrops && Object.keys(nameZoneCrops).length) {
      payload.nameZoneCrops = nameZoneCrops;
    }
    if (backImage) {
      const backNameZoneCrops = await buildNameZoneCrops(backImage);
      if (backNameZoneCrops && Object.keys(backNameZoneCrops).length) {
        payload.backNameZoneCrops = backNameZoneCrops;
      }
    }
  }
  const imageHash = await computeImageHash(frontImage, backImage);
  const requestId =
    options.requestId ||
    `cardIntel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  payload.imageHash = imageHash;
  payload.requestId = requestId;
  if (typeof options.onHash === "function") {
    const shouldContinue = await options.onHash(imageHash);
    if (shouldContinue === false) {
      return {
        payload,
        imageHash,
        requestId,
        cancelled: true,
      };
    }
  }

  let cornerFront = null;
  let cornerBack = null;
  const allowCornerCrops =
    ENABLE_CORNER_CROPS && options.enableCornerCrop !== false && !options.disableCrops;
  if (allowCornerCrops) {
    cornerFront =
      frontImage && options.enableCornerCrop !== false
        ? await maybeCropForCorners(frontImage)
        : { dataUrl: frontImage, confidence: 0 };
    cornerBack =
      backImage && options.enableCornerCrop !== false
        ? await maybeCropForCorners(backImage)
        : { dataUrl: backImage, confidence: 0 };
  }
  return {
    payload,
    imageHash,
    requestId,
    frontImage,
    backImage,
    cornerFront,
    cornerBack,
    skipCornerAnalysis: !allowCornerCrops,
  };
}

export async function finalizeCardIntelResponse(data, meta = {}) {
  const { cornerFront, cornerBack, imageHash, requestId, skipCornerAnalysis } = meta;
  let cornerInsights = null;
  if (!skipCornerAnalysis) {
    cornerInsights = await analyzeCornerPhotos({
      frontImage: cornerFront?.dataUrl,
      backImage: cornerBack?.dataUrl,
    });
  }
  const merged = {
    ...EMPTY_INTEL,
    ...data,
    confidence: ensureConfidence(data?.confidence),
    sources: data?.sources || data?.verification || {},
    imageHash,
    requestId,
  };

  if (cornerInsights) {
    merged.corners = cornerInsights.corners;
    merged.cornerCondition = cornerInsights.condition;
    if (!merged.notes && cornerInsights.condition?.summary) {
      merged.notes = cornerInsights.condition.summary;
    }
  }
  return merged;
}

export async function analyzeCardImages(item = {}, options = {}) {
  const prep = await prepareCardIntelPayload(item, options);
  if (!prep) {
    return { ...EMPTY_INTEL, error: DEFAULT_ANALYSIS_ERROR_MESSAGE };
  }
  if (prep.error) {
    return { ...EMPTY_INTEL, error: prep.error };
  }
  if (prep.cancelled) {
    return {
      ...EMPTY_INTEL,
      cancelled: true,
      imageHash: prep.imageHash,
      requestId: prep.requestId,
    };
  }
  if (options?.source === "batch") {
    const nameZoneCrops = prep.payload?.nameZoneCrops || {};
    const nameZoneCropCount = Object.keys(nameZoneCrops || {}).length;
    console.log("[BATCH DEBUG]", {
      frontDataUrlLength: prep.payload?.frontImage?.length,
      hasNameZoneCrops: Boolean(nameZoneCropCount),
      nameZoneCropCount,
    });
  }

  const { payload, imageHash, requestId } = prep;

  try {
    const response = await fetch("/.netlify/functions/cardIntel_v2", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      let text = "";
      try {
        text = await response.text();
      } catch {
        text = "";
      }
      console.error("Card intel function error:", text);
      return { ...EMPTY_INTEL, error: DEFAULT_ANALYSIS_ERROR_MESSAGE };
    }

    let data = null;
    try {
      data = await response.json();
    } catch (err) {
      console.error("Card intel JSON parse error:", err);
      return { ...EMPTY_INTEL, error: DEFAULT_ANALYSIS_ERROR_MESSAGE };
    }

    if (!data || data.error) {
      return {
        ...EMPTY_INTEL,
        error: data?.error || DEFAULT_ANALYSIS_ERROR_MESSAGE,
      };
    }

    return finalizeCardIntelResponse(data, prep);
  } catch (err) {
    console.error("Failed to analyze card images:", err);
    return { ...EMPTY_INTEL, error: DEFAULT_ANALYSIS_ERROR_MESSAGE };
  }
}

export async function generateCornerEntriesForSide(sourceImageUrl, side = "front") {
  if (!sourceImageUrl) return [];
  const corners = await extractCornersFromImage(sourceImageUrl);
  const sideKey = side === "back" ? "back" : "front";
  const entries = corners
    ? extractCornerPhotoEntries({ corners: { [sideKey]: corners } })
    : [];
  if (entries.length >= 4) return entries;
  return buildPlaceholderCornerEntries(sourceImageUrl, sideKey);
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
    setBrand: intel.setBrand || intel.setName || "",
    setName: intel.setName || intel.setBrand || "",
    cardNumber: intel.cardNumber || "",
    brand: intel.brand || "",
    grade: intel.grade || "",
    gradingAuthority: intel.gradingAuthority || "",
    gradeValue: intel.gradeValue || "",
    scoreRating: intel.scoreRating || "",
    parallel: intel.parallel || "",
    notes: intel.notes || "",
    confidence: ensureConfidence(intel.confidence || {}),
    sources: intel.sources || {},
    sourceEvidence: Array.isArray(intel.sourceEvidence) ? intel.sourceEvidence : [],
    isTextVerified: intel.isTextVerified || {},
    needsUserConfirmation: Boolean(
      typeof intel.needsUserConfirmation === "boolean" ? intel.needsUserConfirmation : true
    ),
    manualOverrides: intel.manualOverrides || {},
    corners: intel.corners || null,
    cornerCondition: intel.cornerCondition || null,
    grading: intel.grading || null,
    pricing: intel.pricing || null,
    isGradedCard: Boolean(intel.isGradedCard),
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
        manualOverride: Boolean(data.manualOverride),
        offsetRatioX: data.offsetRatioX || 0,
        offsetRatioY: data.offsetRatioY || 0,
        sourceX: data.sourceX ?? null,
        sourceY: data.sourceY ?? null,
        sourceSize: data.sourceSize ?? null,
        baseImageWidth: data.baseImageWidth ?? null,
        baseImageHeight: data.baseImageHeight ?? null,
        initialCropBounds: data.initialCropBounds
          ? {
              x: data.initialCropBounds.x ?? null,
              y: data.initialCropBounds.y ?? null,
              size: data.initialCropBounds.size ?? null,
            }
          : null,
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
    const buildCrops = () => {
      const size = Math.round(Math.min(img.width, img.height) * CORNER_SIZE_RATIO);
      if (!size || size < 8) {
        resolve(null);
        return;
      }
      const canvas = document.createElement("canvas");
      const padding = Math.round(size * CORNER_PADDING_RATIO);
      const paddedSize = size + padding * 2;
      canvas.width = paddedSize;
      canvas.height = paddedSize;
      const ctx = canvas.getContext("2d");
      const buildEntry = (cornerKey, sx, sy) => {
        const baseCrop = cropCorner(ctx, img, sx, sy, paddedSize);
        if (!baseCrop) return null;
        return {
          ...baseCrop,
          offsetRatioX: 0,
          offsetRatioY: 0,
          baseImageWidth: img.width,
          baseImageHeight: img.height,
          initialCropBounds: {
            x: baseCrop.sourceX,
            y: baseCrop.sourceY,
            size: paddedSize,
          },
        };
      };
      const crops = {
        topLeft: buildEntry("topLeft", -padding, -padding),
        topRight: buildEntry("topRight", img.width - size - padding, -padding),
        bottomLeft: buildEntry("bottomLeft", -padding, img.height - size - padding),
        bottomRight: buildEntry(
          "bottomRight",
          img.width - size - padding,
          img.height - size - padding
        ),
      };
      resolve(crops);
    };
    img.onload = () => {
      if (img.width && img.height) {
        buildCrops();
        return;
      }
      if (typeof img.decode === "function") {
        img
          .decode()
          .then(() => requestAnimationFrame(buildCrops))
          .catch(() => resolve(null));
        return;
      }
      requestAnimationFrame(buildCrops);
    };
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
}

async function buildPlaceholderCornerEntries(sourceImageUrl, sideKey) {
  const img = await loadImageElement(sourceImageUrl);
  if (!img?.width || !img?.height) return [];
  const size = Math.round(Math.min(img.width, img.height) * 0.2);
  if (!size || size < 8) return [];
  const insetX = Math.round(img.width * 0.1);
  const insetY = Math.round(img.height * 0.1);
  const sideLabel = sideKey === "back" ? "Back" : "Front";
  const builds = [
    { key: "topLeft", x: insetX, y: insetY },
    { key: "topRight", x: img.width - size - insetX, y: insetY },
    { key: "bottomLeft", x: insetX, y: img.height - size - insetY },
    { key: "bottomRight", x: img.width - size - insetX, y: img.height - size - insetY },
  ];
  return builds
    .map((item) => {
      const url = cropPlaceholder(img, item.x, item.y, size);
      if (!url) return null;
      const cornerLabel = CORNER_NAME_MAP[item.key] || item.key;
      return {
        url,
        altText: `${sideLabel} ${cornerLabel} corner detail`,
        label: `${sideLabel} ${cornerLabel}`,
        side: sideLabel,
        cornerKey: item.key,
        confidence: "low",
        manualOverride: false,
        offsetRatioX: 0,
        offsetRatioY: 0,
        sourceX: item.x,
        sourceY: item.y,
        sourceSize: size,
        baseImageWidth: img.width,
        baseImageHeight: img.height,
        initialCropBounds: {
          x: item.x,
          y: item.y,
          size,
        },
      };
    })
    .filter(Boolean);
}

function cropPlaceholder(img, sx, sy, size) {
  if (!img) return null;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const clampedX = Math.max(0, Math.min(img.width - size, sx));
  const clampedY = Math.max(0, Math.min(img.height - size, sy));
  ctx.drawImage(img, clampedX, clampedY, size, size, 0, 0, size, size);
  try {
    return canvas.toDataURL("image/jpeg", 0.9);
  } catch {
    return null;
  }
}

function cropCorner(ctx, img, sx, sy, size) {
  const clampedX = Math.max(0, Math.min(img.width - size, sx));
  const clampedY = Math.max(0, Math.min(img.height - size, sy));
  ctx.clearRect(0, 0, size, size);
  ctx.drawImage(img, clampedX, clampedY, size, size, 0, 0, size, size);
  const imageData = ctx.getImageData(0, 0, size, size);
  const score = computeCornerScore(imageData);
  return {
    image: canvasToDataUrl(ctx.canvas),
    score,
    confidence: mapScoreToConfidence(score),
    sourceX: clampedX,
    sourceY: clampedY,
    sourceSize: size,
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
  const { data, width, height } = imageData;
  if (!width || !height) return 0;
  const total = width * height;
  if (!total) return 0;

  const brightness = new Array(total);
  let sum = 0;
  let sumSq = 0;
  for (let idx = 0, pixel = 0; idx < data.length; idx += 4, pixel += 1) {
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const value = 0.299 * r + 0.587 * g + 0.114 * b;
    brightness[pixel] = value;
    sum += value;
    sumSq += value * value;
  }
  const mean = sum / total;
  const variance = sumSq / total - mean * mean;
  const textureScore = Math.sqrt(Math.max(variance, 0));

  let gradientSum = 0;
  let strongEdgePixels = 0;
  let centeredEdgePixels = 0;
  const edgeThreshold = 12;
  const marginX = Math.max(1, Math.round(width * 0.1));
  const marginY = Math.max(1, Math.round(height * 0.1));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const current = brightness[index];
      let gradX = 0;
      let gradY = 0;
      if (x < width - 1) {
        gradX = Math.abs(current - brightness[index + 1]);
      }
      if (y < height - 1) {
        gradY = Math.abs(current - brightness[index + width]);
      }
      const gradient = gradX + gradY;
      gradientSum += gradient;
      if (gradient > edgeThreshold) {
        strongEdgePixels += 1;
        if (
          x > marginX &&
          x < width - marginX &&
          y > marginY &&
          y < height - marginY
        ) {
          centeredEdgePixels += 1;
        }
      }
    }
  }

  const clarityScore = (gradientSum / total) * 1.2;
  const framingScore =
    strongEdgePixels > 0
      ? (centeredEdgePixels / strongEdgePixels) * 60
      : 0;

  const combined =
    textureScore * 0.35 + clarityScore * 0.45 + framingScore * 0.2;

  return Math.round(Math.min(combined, 60));
}

function mapScoreToConfidence(score) {
  if (score >= 38) return "high";
  if (score >= 24) return "medium";
  return "low";
}

function getCornerBasePosition(cornerKey, imgWidth, imgHeight, size, padding) {
  switch (cornerKey) {
    case "topRight":
      return { x: imgWidth - size - padding, y: -padding };
    case "bottomLeft":
      return { x: -padding, y: imgHeight - size - padding };
    case "bottomRight":
      return {
        x: imgWidth - size - padding,
        y: imgHeight - size - padding,
      };
    case "topLeft":
    default:
      return { x: -padding, y: -padding };
  }
}

async function buildNameZoneCrops(dataUrl) {
  if (!dataUrl) return null;
  try {
    const baseImage = await loadImageElement(dataUrl);
    if (!baseImage) return null;
    const boundsResult = await cropToCardBounds(dataUrl);
    const cardBounds = boundsResult?.bounds || {
      x: 0,
      y: 0,
      width: baseImage.width,
      height: baseImage.height,
    };
    const definitions = [
      {
        key: "bottomCenter",
        xRatio: 0.15,
        yRatio: 0.72,
        widthRatio: 0.7,
        heightRatio: 0.2,
      },
      {
        key: "bottomLeft",
        xRatio: 0.05,
        yRatio: 0.75,
        widthRatio: 0.38,
        heightRatio: 0.22,
      },
      {
        key: "topBanner",
        xRatio: 0.08,
        yRatio: 0.05,
        widthRatio: 0.84,
        heightRatio: 0.16,
      },
    ];
    const results = {};
    definitions.forEach((zone) => {
      const rect = clampZoneRect(cardBounds, baseImage.width, baseImage.height, zone);
      if (!rect || rect.width < 24 || rect.height < 24) return;
      const cropped = cropAndPreprocessZone(baseImage, rect);
      if (cropped) {
        results[zone.key] = {
          image: cropped,
          rect,
          meta: {
            imageWidth: baseImage.width,
            imageHeight: baseImage.height,
            cardBounds,
          },
        };
      }
    });
    const slabRect = buildSlabLabelRect(baseImage, cardBounds);
    if (slabRect) {
      const cropped = cropAndPreprocessZone(baseImage, slabRect);
      if (cropped) {
        results.slabLabel = {
          image: cropped,
          rect: slabRect,
          meta: {
            imageWidth: baseImage.width,
            imageHeight: baseImage.height,
            cardBounds,
          },
        };
      }
    }
    return results;
  } catch (err) {
    console.error("Card intel: failed to build name zone crops", err);
    return null;
  }
}

function clampZoneRect(bounds, imageWidth, imageHeight, zone) {
  if (!bounds || !zone) return null;
  const rect = {
    x: Math.round(bounds.x + bounds.width * zone.xRatio),
    y: Math.round(bounds.y + bounds.height * zone.yRatio),
    width: Math.round(bounds.width * zone.widthRatio),
    height: Math.round(bounds.height * zone.heightRatio),
  };
  rect.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width - rect.width, rect.x));
  rect.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height - rect.height, rect.y));
  rect.width = Math.min(rect.width, imageWidth - rect.x);
  rect.height = Math.min(rect.height, imageHeight - rect.y);
  return rect;
}

function cropAndPreprocessZone(image, rect) {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = rect.width;
    canvas.height = rect.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);
    preprocessForOcr(ctx, rect.width, rect.height);
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error("Card intel: failed to crop OCR zone", err);
    return null;
  }
}

function buildSlabLabelRect(image, cardBounds) {
  if (!image || !cardBounds) return null;
  const marginX = Math.round(cardBounds.width * 0.1);
  const slabWidth = Math.min(image.width, cardBounds.width + marginX * 2);
  const slabHeight = Math.round(cardBounds.height * 0.18);
  const x = Math.max(0, Math.round(cardBounds.x - marginX));
  const y = Math.max(0, Math.round(cardBounds.y - slabHeight - cardBounds.height * 0.02));
  return {
    x,
    y,
    width: slabWidth,
    height: Math.min(slabHeight, cardBounds.y + cardBounds.height),
  };
}

function preprocessForOcr(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const contrast = 1.25;
  const midpoint = 128;
  for (let i = 0; i < data.length; i += 4) {
    const avg = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    let value = avg;
    value = (value - midpoint) * contrast + midpoint;
    value = Math.max(0, Math.min(255, value));
    data[i] = data[i + 1] = data[i + 2] = value;
  }
  ctx.putImageData(imageData, 0, 0);
  applySharpen(ctx, width, height);
}

function applySharpen(ctx, width, height) {
  const weights = [0, -1, 0, -1, 5, -1, 0, -1, 0];
  const side = Math.round(Math.sqrt(weights.length));
  const halfSide = Math.floor(side / 2);
  const src = ctx.getImageData(0, 0, width, height);
  const dst = ctx.createImageData(width, height);
  const srcData = src.data;
  const dstData = dst.data;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let cy = 0; cy < side; cy += 1) {
        for (let cx = 0; cx < side; cx += 1) {
          const scy = Math.min(height - 1, Math.max(0, y + cy - halfSide));
          const scx = Math.min(width - 1, Math.max(0, x + cx - halfSide));
          const srcOffset = (scy * width + scx) * 4;
          const weight = weights[cy * side + cx];
          r += srcData[srcOffset] * weight;
          g += srcData[srcOffset + 1] * weight;
          b += srcData[srcOffset + 2] * weight;
        }
      }
      const dstOffset = (y * width + x) * 4;
      dstData[dstOffset] = Math.max(0, Math.min(255, r));
      dstData[dstOffset + 1] = Math.max(0, Math.min(255, g));
      dstData[dstOffset + 2] = Math.max(0, Math.min(255, b));
      dstData[dstOffset + 3] = srcData[dstOffset + 3];
    }
  }
  ctx.putImageData(dst, 0, 0);
}

function loadImageElement(dataUrl) {
  return new Promise((resolve, reject) => {
    if (!dataUrl) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
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

export async function regenerateCornerImage(
  sourceImageUrl,
  cornerKey,
  offsetRatioX = 0,
  offsetRatioY = 0,
  previousMeta = {}
) {
  if (!sourceImageUrl || !cornerKey) return null;
  const trimmed = await cropToCardBounds(sourceImageUrl);
  const usableSrc = trimmed?.dataUrl || sourceImageUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const baseCrop = Math.round(Math.min(img.width, img.height) * CORNER_SIZE_RATIO);
      const basePadding = Math.round(baseCrop * CORNER_PADDING_RATIO);
      const fallbackSize = baseCrop + basePadding * 2;
      const initialBounds = previousMeta?.initialCropBounds || {};
      const storedSize = typeof initialBounds?.size === "number" ? initialBounds.size : null;
      const paddedSize =
        storedSize ||
        (typeof previousMeta?.sourceSize === "number" ? previousMeta.sourceSize : fallbackSize);
      if (!paddedSize || paddedSize < 8) {
        resolve(null);
        return;
      }
      const defaultBase = getCornerBasePosition(
        cornerKey,
        img.width,
        img.height,
        baseCrop,
        basePadding
      );
      const baseImageWidth =
        typeof previousMeta?.baseImageWidth === "number" ? previousMeta.baseImageWidth : img.width;
      const baseImageHeight =
        typeof previousMeta?.baseImageHeight === "number"
          ? previousMeta.baseImageHeight
          : img.height;
      const maxX = Math.max(0, img.width - paddedSize);
      const maxY = Math.max(0, img.height - paddedSize);
      const inferredBaseX = typeof initialBounds?.x === "number"
        ? initialBounds.x
        : typeof previousMeta?.sourceX === "number"
        ? previousMeta.sourceX
        : defaultBase.x;
      const inferredBaseY = typeof initialBounds?.y === "number"
        ? initialBounds.y
        : typeof previousMeta?.sourceY === "number"
        ? previousMeta.sourceY
        : defaultBase.y;
      const baseX = Math.max(0, Math.min(maxX, inferredBaseX));
      const baseY = Math.max(0, Math.min(maxY, inferredBaseY));
      const rawDeltaX = offsetRatioX || 0;
      const rawDeltaY = offsetRatioY || 0;
      const clampedRatioX = Math.max(
        -MAX_CORNER_NUDGE_RATIO,
        Math.min(MAX_CORNER_NUDGE_RATIO, rawDeltaX)
      );
      const clampedRatioY = Math.max(
        -MAX_CORNER_NUDGE_RATIO,
        Math.min(MAX_CORNER_NUDGE_RATIO, rawDeltaY)
      );
      const candidateX = baseX + clampedRatioX * paddedSize;
      const candidateY = baseY + clampedRatioY * paddedSize;
      const nextX = Math.max(0, Math.min(maxX, candidateX));
      const nextY = Math.max(0, Math.min(maxY, candidateY));
      if (process.env.NODE_ENV === "development") {
        const shiftX = Math.round((nextX - baseX) * 100) / 100;
        const shiftY = Math.round((nextY - baseY) * 100) / 100;
        console.log("[Adjust] pixels", {
          cornerKey,
          shiftX,
          shiftY,
          paddedSize,
          clampedRatioX,
          clampedRatioY,
        });
      }
      const canvas = document.createElement("canvas");
      canvas.width = paddedSize;
      canvas.height = paddedSize;
      const result = cropCorner(
        canvas.getContext("2d"),
        img,
        nextX,
        nextY,
        paddedSize
      );
      resolve({
        dataUrl: result.image,
        confidence: result.confidence,
        offsetRatioX: clampedRatioX,
        offsetRatioY: clampedRatioY,
        sourceX: nextX,
        sourceY: nextY,
        sourceSize: paddedSize,
        baseImageWidth,
        baseImageHeight,
        initialCropBounds: {
          x: typeof initialBounds?.x === "number" ? initialBounds.x : baseX,
          y: typeof initialBounds?.y === "number" ? initialBounds.y : baseY,
          size:
            typeof initialBounds?.size === "number" ? initialBounds.size : paddedSize,
        },
      });
    };
    img.onerror = () => resolve(null);
    img.src = usableSrc;
  });
}
