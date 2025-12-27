const MAX_SAMPLE_DIMENSION = 400;
const EDGE_MARGIN_RATIO = 0.08;
const LOW_LIGHT_THRESHOLD = 65;
const SQUAREISH_RATIO = 1.2;
const EDGE_CONTRAST_THRESHOLD = 8;

export async function evaluatePhotoPreflight(source) {
  if (!source) {
    return null;
  }

  try {
    const image = await loadImageSource(source);
    const { warnings } = analyzeImage(image);
    return { warnings };
  } catch (err) {
    console.warn("[photoPreflight] evaluation failed", err);
    return null;
  }
}

function loadImageSource(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!source.startsWith("data:")) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = source;
  });
}

function analyzeImage(img) {
  const scale =
    Math.min(1, MAX_SAMPLE_DIMENSION / Math.max(img.width, img.height)) || 1;
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);
  const { data } = ctx.getImageData(0, 0, width, height);

  let totalLum = 0;
  let edgeLum = 0;
  let centerLum = 0;
  let totalCount = 0;
  let edgeCount = 0;
  let centerCount = 0;
  const marginX = Math.max(1, Math.round(width * EDGE_MARGIN_RATIO));
  const marginY = Math.max(1, Math.round(height * EDGE_MARGIN_RATIO));

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      totalLum += lum;
      totalCount += 1;
      const isEdge =
        x < marginX ||
        x >= width - marginX ||
        y < marginY ||
        y >= height - marginY;
      if (isEdge) {
        edgeLum += lum;
        edgeCount += 1;
      } else {
        centerLum += lum;
        centerCount += 1;
      }
    }
  }

  const avgLum = totalCount ? totalLum / totalCount : 0;
  const avgEdgeLum = edgeCount ? edgeLum / edgeCount : avgLum;
  const avgCenterLum = centerCount ? centerLum / centerCount : avgLum;
  const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));

  const warnings = [];
  if (avgLum < LOW_LIGHT_THRESHOLD) {
    warnings.push({
      type: "lowLight",
      message: "Lighting looks dim — retake on a brighter surface.",
    });
  }
  if (ratio < SQUAREISH_RATIO) {
    warnings.push({
      type: "tilt",
      message: "Card may be tilted or too close — align edges with the frame.",
    });
  }
  if (Math.abs(avgEdgeLum - avgCenterLum) < EDGE_CONTRAST_THRESHOLD) {
    warnings.push({
      type: "tightCrop",
      message: "Corners sit near the edge — leave a little space around the card.",
    });
  }

  return { warnings };
}
