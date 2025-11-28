import JSZip from "jszip";
import { processPhotosForPlatform } from "./photoEngine";

export async function createPhotoBundle(platformKey, originalPhotos) {
  if (!originalPhotos || !originalPhotos.length) {
    throw new Error("No photos to bundle.");
  }

  const processed = await processPhotosForPlatform(platformKey, originalPhotos);

  const zip = new JSZip();
  processed.forEach((img, idx) => {
    const base64 = img.src.split(",")[1];
    zip.file(`${platformKey}-${idx + 1}.jpg`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${platformKey}-photos.zip`;
  a.click();

  URL.revokeObjectURL(url);

  return processed;
}
