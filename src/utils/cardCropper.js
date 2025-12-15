const CORNER_SCAN_STEP = 4;
const MIN_CONFIDENCE = 0.5;

function sampleBackgroundBrightness(data, width, height) {
  let sum = 0;
  let count = 0;
  const rowSpan = Math.max(5, Math.round(height * 0.05));
  const colSpan = Math.max(5, Math.round(width * 0.05));

  for (let y = 0; y < rowSpan; y++) {
    for (let x = 0; x < width; x += CORNER_SCAN_STEP) {
      const idx = (y * width + x) * 4;
      sum += getBrightness(data, idx);
      count++;
    }
  }

  for (let y = height - rowSpan; y < height; y++) {
    if (y < 0) continue;
    for (let x = 0; x < width; x += CORNER_SCAN_STEP) {
      const idx = (y * width + x) * 4;
      sum += getBrightness(data, idx);
      count++;
    }
  }

  for (let x = 0; x < colSpan; x++) {
    for (let y = 0; y < height; y += CORNER_SCAN_STEP) {
      const idx = (y * width + x) * 4;
      sum += getBrightness(data, idx);
      count++;
    }
  }

  for (let x = width - colSpan; x < width; x++) {
    if (x < 0) continue;
    for (let y = 0; y < height; y += CORNER_SCAN_STEP) {
      const idx = (y * width + x) * 4;
      sum += getBrightness(data, idx);
      count++;
    }
  }

  return count ? sum / count : 0;
}

function getBrightness(data, idx) {
  const r = data[idx];
  const g = data[idx + 1];
  const b = data[idx + 2];
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function computeRowDiff(data, width, y, bgBrightness) {
  let total = 0;
  let count = 0;
  for (let x = 0; x < width; x += CORNER_SCAN_STEP) {
    const idx = (y * width + x) * 4;
    total += Math.abs(getBrightness(data, idx) - bgBrightness);
    count++;
  }
  return count ? total / count : 0;
}

function computeColDiff(data, width, height, x, bgBrightness) {
  let total = 0;
  let count = 0;
  for (let y = 0; y < height; y += CORNER_SCAN_STEP) {
    const idx = (y * width + x) * 4;
    total += Math.abs(getBrightness(data, idx) - bgBrightness);
    count++;
  }
  return count ? total / count : 0;
}

function detectBounds(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const bgBrightness = sampleBackgroundBrightness(data, width, height);
  const threshold = 14;

  let top = 0;
  for (let y = 0; y < height; y++) {
    if (computeRowDiff(data, width, y, bgBrightness) > threshold) {
      top = y;
      break;
    }
  }

  let bottom = height - 1;
  for (let y = height - 1; y >= 0; y--) {
    if (computeRowDiff(data, width, y, bgBrightness) > threshold) {
      bottom = y;
      break;
    }
  }

  let left = 0;
  for (let x = 0; x < width; x++) {
    if (computeColDiff(data, width, height, x, bgBrightness) > threshold) {
      left = x;
      break;
    }
  }

  let right = width - 1;
  for (let x = width - 1; x >= 0; x--) {
    if (computeColDiff(data, width, height, x, bgBrightness) > threshold) {
      right = x;
      break;
    }
  }

  if (right - left < width * 0.3 || bottom - top < height * 0.3) {
    return null;
  }

  const avgDiff =
    (computeRowDiff(data, width, top, bgBrightness) +
      computeRowDiff(data, width, bottom, bgBrightness) +
      computeColDiff(data, width, height, left, bgBrightness) +
      computeColDiff(data, width, height, right, bgBrightness)) /
    4;
  const normalizedDiff = Math.min(1, avgDiff / 40);
  const areaRatio = ((right - left) * (bottom - top)) / (width * height);
  const confidence = Math.min(
    1,
    normalizedDiff * 0.7 + Math.min(1, areaRatio + 0.1) * 0.3
  );

  if (confidence < MIN_CONFIDENCE) {
    return null;
  }

  return {
    x: Math.max(0, left - 2),
    y: Math.max(0, top - 2),
    width: Math.min(width - left + 2, right - left + 4),
    height: Math.min(height - top + 2, bottom - top + 4),
    confidence,
  };
}

export async function cropToCardBounds(dataUrl) {
  return new Promise((resolve) => {
    if (!dataUrl) {
      resolve({ dataUrl, confidence: 0, bounds: null });
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const baseCanvas = document.createElement("canvas");
      baseCanvas.width = img.width;
      baseCanvas.height = img.height;
      const baseCtx = baseCanvas.getContext("2d");
      baseCtx.drawImage(img, 0, 0);

      const bounds = detectBounds(baseCtx, img.width, img.height);
      if (!bounds) {
        resolve({ dataUrl, confidence: 0, bounds: null });
        return;
      }

      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = bounds.width;
      cropCanvas.height = bounds.height;
      cropCanvas
        .getContext("2d")
        .drawImage(
          baseCanvas,
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height,
          0,
          0,
          bounds.width,
          bounds.height
        );
      resolve({
        dataUrl: cropCanvas.toDataURL("image/jpeg", 0.95),
        confidence: bounds.confidence,
        bounds,
      });
    };
    img.onerror = () => resolve({ dataUrl, confidence: 0, bounds: null });
    img.src = dataUrl;
  });
}
