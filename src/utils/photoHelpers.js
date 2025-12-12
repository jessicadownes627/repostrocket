export function deriveAltTextFromFilename(name) {
  return (
    name
      ?.replace(/\.[^/.]+$/, "")
      ?.replace(/[_-]/g, " ")
      ?.trim() || "item photo"
  );
}

export function ensurePhotoObject(photo, fallbackAlt = "item photo") {
  if (!photo) {
    return { url: "", altText: fallbackAlt };
  }

  if (typeof photo === "string") {
    return { url: photo, altText: fallbackAlt };
  }

  if (typeof photo === "object") {
    const url = photo.url || "";
    const altText = (photo.altText && photo.altText.trim()) || fallbackAlt;
    return { ...photo, url, altText };
  }

  return { url: "", altText: fallbackAlt };
}

export function normalizePhotosArray(photos, fallbackPrefix = "item photo") {
  if (!Array.isArray(photos)) return [];
  return photos.map((entry, idx) =>
    ensurePhotoObject(
      entry,
      fallbackPrefix ? `${fallbackPrefix} ${idx + 1}` : "item photo"
    )
  );
}

export function getPhotoUrl(photo) {
  return ensurePhotoObject(photo).url;
}

export function getPhotoAlt(photo) {
  return ensurePhotoObject(photo).altText;
}

export function mapPhotosToUrls(photos) {
  if (!Array.isArray(photos)) return [];
  return photos.map((p) => getPhotoUrl(p));
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string" && result.startsWith("data:image")) {
        resolve(result);
      } else {
        reject(new Error("File is not a valid image"));
      }
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
