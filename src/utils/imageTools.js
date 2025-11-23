import { IMAGE_VARIANTS } from "../config/platformImageSettings";

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
