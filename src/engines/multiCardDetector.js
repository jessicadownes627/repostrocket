let cvReady = false;

export async function loadOpenCv() {
  if (cvReady) return;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://docs.opencv.org/4.x/opencv.js"; // official browser build
    script.async = true;
    script.onload = () => {
      // eslint-disable-next-line no-undef
      cv["onRuntimeInitialized"] = () => {
        cvReady = true;
        resolve();
      };
    };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// Converts a base64 image to Mat for OpenCV
function loadMatFromBase64(base64) {
  const img = new Image();
  img.src = base64;

  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const mat = cv.imread(canvas);
      resolve({ mat, canvas });
    };
  });
}

// Detects rectangles = cards
export async function detectCardsFromImage(base64) {
  await loadOpenCv();

  // eslint-disable-next-line no-undef
  const { mat } = await loadMatFromBase64(base64);

  // Convert to grayscale
  // eslint-disable-next-line no-undef
  const gray = new cv.Mat();
  // eslint-disable-next-line no-undef
  cv.cvtColor(mat, gray, cv.COLOR_RGBA2GRAY);

  // Blur to reduce noise
  // eslint-disable-next-line no-undef
  const blurred = new cv.Mat();
  // eslint-disable-next-line no-undef
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);

  // Edge detection
  // eslint-disable-next-line no-undef
  const edges = new cv.Mat();
  // eslint-disable-next-line no-undef
  cv.Canny(blurred, edges, 75, 200);

  // Find contours
  // eslint-disable-next-line no-undef
  const contours = new cv.MatVector();
  // eslint-disable-next-line no-undef
  const hierarchy = new cv.Mat();
  // eslint-disable-next-line no-undef
  cv.findContours(
    edges,
    contours,
    hierarchy,
    cv.RETR_LIST,
    cv.CHAIN_APPROX_SIMPLE
  );

  const detected = [];

  // Loop through all contours
  for (let i = 0; i < contours.size(); i++) {
    const contour = contours.get(i);
    const peri = cv.arcLength(contour, true);
    const approx = new cv.Mat();
    cv.approxPolyDP(contour, approx, 0.02 * peri, true);

    // Card check: must be a rectangle (4-sided)
    if (approx.rows === 4) {
      const points = [];

      for (let j = 0; j < 4; j++) {
        points.push({
          x: approx.intPtr(j, 0)[0],
          y: approx.intPtr(j, 0)[1],
        });
      }

      detected.push(points);
    }

    approx.delete();
  }

  // Cleanup
  mat.delete();
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();

  return detected;
}

// Crops each detected card into its own image
export async function cropCards(base64, rectangles) {
  await loadOpenCv();

  const { mat, canvas } = await loadMatFromBase64(base64);
  const crops = [];

  for (const rect of rectangles) {
    const xs = rect.map((p) => p.x);
    const ys = rect.map((p) => p.y);

    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);

    const width = maxX - minX;
    const height = maxY - minY;

    const cropCanvas = document.createElement("canvas");
    cropCanvas.width = width;
    cropCanvas.height = height;

    const ctx = cropCanvas.getContext("2d");
    ctx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

    crops.push(cropCanvas.toDataURL("image/jpeg"));
  }

  mat.delete();

  return crops;
}
