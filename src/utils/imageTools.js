import heic2any from "heic2any";
import { IMAGE_VARIANTS } from "../config/platformImageSettings";

export async function convertHeicIfNeeded(file) {
  if (!file) return file;

  const name = file.name?.toLowerCase() || "";
  const type = file.type?.toLowerCase() || "";

  // Detect HEIC in ALL common cases
  const probablyHeic =
    type.includes("heic") ||
    type.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif");

  if (!probablyHeic) {
    // Not HEIC — just pass it through
    return file;
  }

  try {
    const jpegBlob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.9,
    });

    return new File(
      [jpegBlob],
      (file.name || "converted").replace(/\.heic|\.heif/gi, ".jpg"),
      { type: "image/jpeg" }
    );
  } catch (err) {
    console.warn(
      "⚠️ HEIC conversion failed — using original file instead:",
      err
    );
    // Always return the original file even if it's weird
    return file;
  }
}

const QUALITY = 0.9;

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function drawCover(ctx, img, targetW, targetH) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = Math.max(targetW / srcW, targetH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const offsetX = (targetW - drawW) / 2;
  const offsetY = (targetH - drawH) / 2;
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

function drawLongest(ctx, img, longest) {
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;
  const scale = longest / Math.max(srcW, srcH);
  const targetW = Math.round(srcW * scale);
  const targetH = Math.round(srcH * scale);
  ctx.canvas.width = targetW;
  ctx.canvas.height = targetH;
  ctx.drawImage(img, 0, 0, targetW, targetH);
}

export async function resizeImage(dataUrl, setting) {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (setting.mode === "cover") {
    canvas.width = setting.width;
    canvas.height = setting.height;
    drawCover(ctx, img, setting.width, setting.height);
  } else if (setting.mode === "longest") {
    drawLongest(ctx, img, setting.longest);
  } else {
    return dataUrl;
  }

  return canvas.toDataURL("image/jpeg", QUALITY);
}

export async function generateResizedVariants(dataUrl) {
  const entries = await Promise.all(
    Object.entries(IMAGE_VARIANTS).map(async ([key, setting]) => {
      const resized = await resizeImage(dataUrl, setting);
      return [key, resized];
    })
  );
  return Object.fromEntries(entries);
}

// NEW — auto-group photos into item bundles
export function groupPhotosIntoItems(photos) {
  const list = Array.isArray(photos) ? [...photos] : [];
  if (!list.length) return [];

  const groups = [];

  // Simple initial grouping by timestamp proximity
  list.sort(
    (a, b) => (a.lastModified || 0) - (b.lastModified || 0)
  );

  let currentGroup = [list[0]];

  for (let i = 1; i < list.length; i++) {
    const timeDiff = Math.abs(
      (list[i].lastModified || 0) -
      (list[i - 1].lastModified || 0)
    );

    if (timeDiff < 5000) {
      currentGroup.push(list[i]);
    } else {
      groups.push(currentGroup);
      currentGroup = [list[i]];
    }
  }

  groups.push(currentGroup);

  return groups;
}
