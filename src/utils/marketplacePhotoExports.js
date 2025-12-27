import JSZip from "jszip";
import { photoEntryToDataUrl } from "./photoHelpers";

const VARIANTS = [
  {
    key: "square",
    label: "Square 1:1",
    ratio: 1,
  },
  {
    key: "portrait",
    label: "Vertical 4:5",
    ratio: 4 / 5,
  },
];

export async function buildMarketplaceExportSet(frontEntry, backEntry) {
  const [front, back] = await Promise.all([
    generateVariantsForEntry(frontEntry, "front"),
    generateVariantsForEntry(backEntry, "back"),
  ]);
  return { front, back };
}

export async function downloadMarketplaceZip(exportSet, filename = "marketplace-photos") {
  if (!exportSet) return;
  const files = collectExportFiles(exportSet);
  if (!files.length) return;
  await saveFilesToZip(files, filename);
}

export async function downloadBatchMarketplaceZip(entries, filename = "batch-marketplace-photos") {
  if (!Array.isArray(entries) || !entries.length) return;
  const files = [];
  entries.forEach(({ label, exportSet }) => {
    if (!exportSet) return;
    const prefix = label ? `${sanitizeFilename(label)}/` : "";
    files.push(...collectExportFiles(exportSet, prefix));
  });
  if (!files.length) return;
  await saveFilesToZip(files, filename);
}

async function generateVariantsForEntry(entry, side) {
  if (!entry) return null;
  const base = await photoEntryToDataUrl(entry);
  if (!base) return null;
  const image = await loadImage(base);
  const variants = await Promise.all(
    VARIANTS.map((variant) => createVariant(image, variant))
  );
  return {
    side,
    original: base,
    variants,
    altText: entry.altText || `${side} photo`,
  };
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

function createVariant(image, variant) {
  const { ratio } = variant;
  const canvas = document.createElement("canvas");
  const paddedSize = getPaddedDimensions(image.width, image.height, ratio);
  canvas.width = paddedSize.width;
  canvas.height = paddedSize.height;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#040404";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const offsetX = (canvas.width - image.width) / 2;
  const offsetY = (canvas.height - image.height) / 2;
  ctx.drawImage(image, offsetX, offsetY, image.width, image.height);
  return {
    key: variant.key,
    label: variant.label,
    width: canvas.width,
    height: canvas.height,
    dataUrl: canvas.toDataURL("image/jpeg", 0.95),
  };
}

function getPaddedDimensions(width, height, ratio) {
  const imageRatio = width / height;
  let targetWidth = width;
  let targetHeight = height;
  if (imageRatio > ratio) {
    targetWidth = width;
    targetHeight = Math.max(height, Math.round(targetWidth / ratio));
  } else {
    targetHeight = height;
    targetWidth = Math.max(width, Math.round(targetHeight * ratio));
  }
  return { width: targetWidth, height: targetHeight };
}

function sanitizeFilename(name) {
  return (name || "marketplace-photos").replace(/[^a-z0-9-_]+/gi, "-");
}

export function getPhotoSignature(entry) {
  if (!entry) return "";
  const src = entry?.url || entry?.src || "";
  if (entry?.file instanceof File) {
    const file = entry.file;
    return `${src}-${file.size || 0}-${file.lastModified || 0}`;
  }
  return src;
}

function collectExportFiles(exportSet, prefix = "") {
  const files = [];
  ["front", "back"].forEach((side) => {
    const entry = exportSet[side];
    if (!entry || !Array.isArray(entry.variants)) return;
    entry.variants.forEach((variant) => {
      if (!variant?.dataUrl) return;
      files.push({
        name: `${prefix}${side}-${variant.key}.jpg`,
        dataUrl: variant.dataUrl,
      });
    });
  });
  return files;
}

async function saveFilesToZip(files, filename) {
  const zip = new JSZip();
  files.forEach(({ name, dataUrl }) => {
    const base64 = dataUrl.split(",")[1];
    if (base64) {
      zip.file(name, base64, { base64: true });
    }
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${sanitizeFilename(filename)}.zip`;
  link.click();
  URL.revokeObjectURL(url);
}
