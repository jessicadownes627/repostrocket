// src/utils/magicPhotoTools.js
import { getPhotoWarnings } from "./photoWarnings";

// Generic helper: load an image and run a canvas filter, return data URL
export async function applyCanvasFilter(imgUrl, filterFn) {
  const img = await loadImage(imgUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  // Run the effect
  filterFn(ctx, canvas);

  return canvas.toDataURL("image/jpeg", 0.9);
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.src = url;
  });
}

// 🔆 1. Brighten
export function brighten(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx) => {
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = Math.min(255, d[i] + 22); // red
      d[i + 1] = Math.min(255, d[i + 1] + 22); // green
      d[i + 2] = Math.min(255, d[i + 2] + 22); // blue
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

// 🔥 2. Warm tone
export function warm(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx) => {
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] + 10; // red
      d[i + 2] = d[i + 2] - 10; // blue
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

// 💙 3. Cool tone
export function cool(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx) => {
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      d[i] = d[i] - 10; // red
      d[i + 2] = d[i + 2] + 10; // blue
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

// 📐 4. Auto-square (center crop)
export function autoSquare(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx, canvas) => {
    const size = Math.min(canvas.width, canvas.height);
    const x = (canvas.width - size) / 2;
    const y = (canvas.height - size) / 2;

    const temp = document.createElement("canvas");
    const tctx = temp.getContext("2d");
    temp.width = size;
    temp.height = size;

    tctx.drawImage(canvas, x, y, size, size, 0, 0, size, size);

    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(temp, 0, 0);
  });
}

// 🌫️ 5. Remove shadows (raise dark areas)
export function removeShadows(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx) => {
    const imgData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const d = imgData.data;

    for (let i = 0; i < d.length; i += 4) {
      const brightness = (d[i] + d[i + 1] + d[i + 2]) / 3;
      if (brightness < 100) {
        d[i] = Math.min(255, d[i] + 18);
        d[i + 1] = Math.min(255, d[i + 1] + 18);
        d[i + 2] = Math.min(255, d[i + 2] + 18);
      }
    }
    ctx.putImageData(imgData, 0, 0);
  });
}

// 🎭 6. Blur background (fake depth)
export function blurBackground(imageUrl) {
  return applyCanvasFilter(imageUrl, (ctx, canvas) => {
    // Stronger visible blur for background depth
    ctx.filter = "blur(6px)";
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = "none";
  });
}

// 🧵 Studio Mode — full pipeline: brighten, de-shadow, square, warm, clarity, subtle sharpen
export async function studioMode(imageUrl) {
  // Step 1 — base brighten
  let out = await brighten(imageUrl);

  // Step 2 — shadow cleaner
  out = await removeShadows(out);

  // Step 3 — auto-square crop
  out = await autoSquare(out);

  // Step 4 — warmth tone
  out = await warm(out);

  // Step 5 — clarity/contrast pop
  out = await applyCanvasFilter(out, (ctx, canvas) => {
    ctx.filter = "contrast(1.12) saturate(1.05)";
  });

  // Step 6 — subtle sharpening (soft overlay)
  out = await applyCanvasFilter(out, (ctx, canvas) => {
    ctx.globalAlpha = 0.35;
    ctx.filter = "blur(0.8px)";
    ctx.drawImage(canvas, 0, 0);
  });

  return out;
}

// Download a data URL as a file (for camera roll / local save)
export function downloadImageFile(dataUrl, filename = "photo.jpg") {
  if (!dataUrl) return;
  fetch(dataUrl)
    .then((res) => res.blob())
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    })
    .catch((err) => {
      console.error("downloadImageFile failed:", err);
    });
}

// ✨ White Background Pro — subject on clean white with soft shadow
export async function whiteBackgroundPro(imageUrl) {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // 1. Standard auto-square crop first
  const size = Math.min(img.width, img.height);
  canvas.width = size;
  canvas.height = size;

  // Draw original in center
  ctx.drawImage(
    img,
    (img.width - size) / 2,
    (img.height - size) / 2,
    size,
    size,
    0,
    0,
    size,
    size
  );

  // 2. Edge detection mask (quick + light)
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;
  const mask = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    // very rough subject mask: anything not almost pure white
    mask[i + 3] = avg < 250 ? 255 : 0;
  }

  // 3. Put subject on new white canvas
  const outCanvas = document.createElement("canvas");
  outCanvas.width = size;
  outCanvas.height = size;

  const outCtx = outCanvas.getContext("2d");

  // Fill white background
  outCtx.fillStyle = "#ffffff";
  outCtx.fillRect(0, 0, size, size);

  // Draw soft drop shadow
  outCtx.filter = "blur(14px) opacity(0.2)";
  outCtx.fillStyle = "#000000";
  outCtx.beginPath();
  outCtx.ellipse(
    size / 2,
    size * 0.82,
    size * 0.3,
    size * 0.08,
    0,
    0,
    Math.PI * 2
  );
  outCtx.fill();
  outCtx.filter = "none";

  // 4. Draw original but only where mask says it's subject
  const subjectCanvas = document.createElement("canvas");
  subjectCanvas.width = size;
  subjectCanvas.height = size;
  subjectCanvas.getContext("2d").putImageData(imgData, 0, 0);

  const subjectCtx = subjectCanvas.getContext("2d");
  const masked = subjectCtx.getImageData(0, 0, size, size);

  for (let i = 0; i < masked.data.length; i += 4) {
    if (mask[i + 3] === 0) {
      masked.data[i + 3] = 0; // make bg transparent
    }
  }

  subjectCtx.putImageData(masked, 0, 0);
  // Apply a brighter, higher-contrast look to the subject on white
  outCtx.filter = "brightness(1.35) contrast(1.15) saturate(0.9)";
  outCtx.drawImage(subjectCanvas, 0, 0);
  outCtx.filter = "none";

  // Export result
  return outCanvas.toDataURL("image/jpeg", 0.94);
}

// AutoFix — choose filters based on detected warnings
export async function autoFix(imageUrl) {
  const warnings = await getPhotoWarnings(imageUrl);

  let output = imageUrl;

  const run = async (fn) => {
    output = await fn(output);
  };

  for (const w of warnings) {
    if (w.includes("too dark")) await run(brighten);
    if (w.includes("overexposed")) await run(cool);
    if (w.includes("Low contrast")) await run(warm);
    if (w.toLowerCase().includes("blurry")) {
      await run(brighten);
      await run(warm);
    }
    if (w.toLowerCase().includes("tilted")) await run(autoSquare);
    if (w.toLowerCase().includes("noisy")) await run(blurBackground);
  }

  // Always finish with shadow cleanup if shadows mentioned
  if (warnings.some((w) => w.toLowerCase().includes("shadows"))) {
    await run(removeShadows);
  }

  return output;
}
