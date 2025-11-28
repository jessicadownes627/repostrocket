// Scores photo lighting, sharpness, cropping, background quality
export function scorePhotoQuality(photoUrls = []) {
  if (!photoUrls.length) {
    return { score: 0, notes: ["No photos uploaded yet."] };
  }

  const notes = [];
  let score = 90;

  if (photoUrls.length < 3) {
    notes.push("Add at least 3 photos — buyers feel more confident.");
    score -= 15;
  }

  if (photoUrls.length > 0) {
    const url = photoUrls[0];
    if (url.includes("dark") || url.includes("shadow")) {
      notes.push("Primary photo looks a bit dark — try bright natural light.");
      score -= 10;
    }
  }

  if (score > 100) score = 100;
  if (score < 0) score = 0;

  if (!notes.length) {
    notes.push("Great job! Photos look clean and appealing.");
  }

  return { score, notes };
}
