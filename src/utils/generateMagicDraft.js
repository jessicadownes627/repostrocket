import { runMagicFill } from "./runMagicFill";
import { parseMagicFillOutput } from "../engines/MagicFillEngine";
import { fileToDataUrl } from "./photoHelpers";
import { analyzeCardImages } from "./cardIntel";
import { analyzeApparelImages } from "./apparelIntel";

async function ensureDataUrlFromSource(source) {
  try {
    const res = await fetch(source);
    const blob = await res.blob();
    if (!blob) return "";
    const file = new File([blob], "batch-photo", {
      type: blob.type || "image/jpeg",
    });
    return await fileToDataUrl(file);
  } catch (err) {
    console.error("Failed to convert photo to data URL:", err);
    return "";
  }
}

function collectPhotoEntries(item = {}) {
  const list = [];
  if (Array.isArray(item.photos)) list.push(...item.photos);
  if (Array.isArray(item.secondaryPhotos)) list.push(...item.secondaryPhotos);
  if (Array.isArray(item.cardPhotos)) list.push(...item.cardPhotos);
  return list.filter(Boolean);
}

async function resolvePhotoDataUrl(entry, options, fallbackEdited) {
  const explicit = options?.photoDataUrl;
  if (explicit) return explicit;

  if (entry?.file) {
    try {
      return await fileToDataUrl(entry.file);
    } catch (err) {
      console.error("Failed to convert primary photo file:", err);
    }
  }

  const fallbackSrc = entry?.url || fallbackEdited || "";
  if (!fallbackSrc) return "";
  if (fallbackSrc.startsWith("data:")) return fallbackSrc;
  return await ensureDataUrlFromSource(fallbackSrc);
}

function hasCardCategory(item = {}) {
  const category = (item.category || "").toLowerCase();
  return category.includes("card");
}

function hasBabyApparelCategory(item = {}) {
  const category = (item.category || "").toLowerCase();
  if (category.includes("baby") || category.includes("kids") || category.includes("toddler")) {
    return true;
  }
  const text = `${item.title || ""} ${item.description || ""} ${
    Array.isArray(item.tags) ? item.tags.join(" ") : ""
  }`
    .toLowerCase()
    .trim();
  return /\b(onesie|romper|bodysuit|infant|newborn|3m|6m|12m|toddler|nb|baby)\b/.test(text);
}

/**
 * Generates a Magic Fill draft for a listing-like object.
 * @param {Object} item - Listing fields (title, description, photos, etc.)
 * @param {Object} options - Additional options (glowMode, photoDataUrl override)
 * @returns {Promise<{ parsed: object, ai: object, cardIntel?: object, apparelIntel?: object } | null>}
 */
export async function generateMagicDraft(item = {}, options = {}) {
  const combinedPhotos = collectPhotoEntries(item);
  const photos = combinedPhotos.length
    ? combinedPhotos
    : Array.isArray(item.photos)
    ? item.photos
    : [];
  const primaryEntry = photos[0] || null;

  const photoDataUrl = await resolvePhotoDataUrl(primaryEntry, options, item?.editedPhoto);
  const cardMode = options.cardMode ?? hasCardCategory(item);
  const apparelMode = options.apparelMode ?? hasBabyApparelCategory(item);

  let cardIntel = options.cardIntel || item.cardIntel || null;
  if (!cardIntel && cardMode && photos.length) {
    const intelResult = await analyzeCardImages(item, { photos });
    if (intelResult && !intelResult.error) {
      cardIntel = intelResult;
      if (options.onCardIntel) {
        options.onCardIntel(cardIntel);
      }
    }
  }

  let apparelIntel = options.apparelIntel || item.apparelIntel || null;
  if (!apparelIntel && apparelMode && photos.length) {
    apparelIntel = await analyzeApparelImages(item, { photos });
    if (apparelIntel && options.onApparelIntel) {
      options.onApparelIntel(apparelIntel);
    }
  }

  const listingPayload = {
    brand: item.brand || "",
    category: item.category || "",
    size: item.size || "",
    condition: item.condition || "",
    userTitle: item.title || "",
    userDescription: item.description || "",
    userTags: Array.isArray(item.tags) ? item.tags : [],
    previousAiChoices: item.previousAiChoices || {},
    price: item.price || "",
    photos,
    cardIntel,
    apparelIntel,
  };

  const requestPayload = {
    listing: listingPayload,
    userCategory: item.category || "",
    photoContext: primaryEntry?.altText || "",
    photoDataUrl,
    glowMode: options.glowMode ?? false,
  };

  const ai = await runMagicFill(requestPayload);
  if (!ai) return null;

  const parsed = parseMagicFillOutput(ai);
  return { parsed, ai, cardIntel, apparelIntel };
}
