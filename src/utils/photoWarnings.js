export async function getPhotoWarnings(imageUrl) {
  const img = await loadImage(imageUrl);
  const { canvas, ctx } = drawImageToCanvas(img);

  const warnings = [];

  // ----- Brightness -----
  const brightness = getAverageBrightness(ctx, canvas);
  if (brightness < 90)
    warnings.push("This photo would look even clearer with a touch more light.");

  if (brightness > 200)
    warnings.push("A softer brightness could give this an even cleaner look.");

  // ----- Contrast -----
  const contrast = getContrastScore(ctx, canvas);
  if (contrast < 30)
    warnings.push("A bit more contrast could help the details stand out.");

  // ----- Sharpness -----
  const sharpness = getSharpnessScore(ctx, canvas);
  if (sharpness < 18)
    warnings.push("A slight boost in clarity could make this item shine.");

  // ----- Tilt / crooked -----
  const tilt = getTiltScore(ctx, canvas);
  if (tilt > 12)
    warnings.push("A more centered angle could create a polished presentation.");

  // ----- Busy background -----
  const bgNoise = getBackgroundNoise(ctx, canvas);
  if (bgNoise > 85)
    warnings.push(
      "A smoother background would give your item an ultra-polished look."
    );

  return warnings;
}

// -------------------------
// Internal helpers
// -------------------------

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawImageToCanvas(img) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);
  return { canvas, ctx };
}

function getAverageBrightness(ctx, canvas) {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let total = 0;
  for (let i = 0; i < img.length; i += 4) {
    total += img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114;
  }
  return total / (img.length / 4);
}

function getContrastScore(ctx, canvas) {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  let min = 255;
  let max = 0;

  for (let i = 0; i < img.length; i += 4) {
    const val = img[i];
    if (val < min) min = val;
    if (val > max) max = val;
  }
  return max - min; // rough contrast gap
}

function getSharpnessScore(ctx, canvas) {
  const { data, width } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let sharpness = 0;

  for (let i = 0; i < data.length - 4 * width; i += 4) {
    const diff =
      Math.abs(data[i] - data[i + 4]) + // horizontal
      Math.abs(data[i] - data[i + width * 4]); // vertical
    sharpness += diff;
  }

  return sharpness / 50000; // normalize
}

function getTiltScore(ctx, canvas) {
  const left = ctx.getImageData(0, 0, canvas.width / 4, canvas.height).data;
  const right = ctx.getImageData(
    canvas.width * 0.75,
    0,
    canvas.width / 4,
    canvas.height
  ).data;

  const avg = (arr) => {
    let sum = 0;
    for (let i = 0; i < arr.length; i += 4) sum += arr[i];
    return sum / (arr.length / 4);
  };

  const diff = Math.abs(avg(left) - avg(right));
  return diff / 3; // scaled tilt score
}

function getBackgroundNoise(ctx, canvas) {
  const border = ctx.getImageData(
    0,
    0,
    canvas.width,
    canvas.height * 0.15
  ).data;

  let variance = 0;
  for (let i = 0; i < border.length; i += 4) {
    const v = border[i] + border[i + 1] + border[i + 2];
    variance += v % 50;
  }
  return variance / 10000;
}
