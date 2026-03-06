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

function isHeicLike({ type = "", name = "" } = {}) {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();
  return (
    t === "image/heic" ||
    t === "image/heif" ||
    t === "image/heic-sequence" ||
    t === "image/heif-sequence" ||
    t.includes("heic") ||
    t.includes("heif") ||
    n.endsWith(".heic") ||
    n.endsWith(".heif")
  );
}

async function convertHeicToRasterImageBlob(blobOrFile, nameHint = "") {
  const blob = blobOrFile instanceof Blob ? blobOrFile : null;
  if (!blob) return null;
  if (!isHeicLike({ type: blob.type, name: nameHint })) return null;

  const { default: heic2any } = await import("heic2any");
  try {
    const jpeg = await heic2any({
      blob,
      toType: "image/jpeg",
      quality: 0.9,
    });
    return Array.isArray(jpeg) ? jpeg[0] : jpeg;
  } catch (err) {
    try {
      const png = await heic2any({
        blob,
        toType: "image/png",
        quality: 1,
      });
      return Array.isArray(png) ? png[0] : png;
    } catch (err2) {
      console.warn("HEIC/HEIF conversion failed:", err2);
      return null;
    }
  }
}

function readBlobAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    if (!(blob instanceof Blob)) {
      reject(new Error("No blob provided"));
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
    reader.readAsDataURL(blob);
  });
}

async function rasterizeBlobToJpegDataUrl(blob) {
  if (!(blob instanceof Blob)) return "";
  try {
    const bitmap = await createImageBitmap(blob);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";
      ctx.drawImage(bitmap, 0, 0);
      return canvas.toDataURL("image/jpeg", 0.92);
    } finally {
      bitmap.close?.();
    }
  } catch {
    return "";
  }
}

export async function fileToDataUrl(fileOrBlob) {
  if (!fileOrBlob) {
    throw new Error("No file provided");
  }
  const nameHint = typeof fileOrBlob?.name === "string" ? fileOrBlob.name : "";
  const typeHint = typeof fileOrBlob?.type === "string" ? fileOrBlob.type : "";

  if (isHeicLike({ type: typeHint, name: nameHint })) {
    const converted = await convertHeicToRasterImageBlob(fileOrBlob, nameHint);
    if (converted) {
      return await readBlobAsDataUrl(converted);
    }
    const rasterized = await rasterizeBlobToJpegDataUrl(fileOrBlob);
    if (rasterized) return rasterized;
    throw new Error("HEIC/HEIF conversion failed");
  }

  return await readBlobAsDataUrl(fileOrBlob);
}

export async function photoEntryToDataUrl(entry) {
  if (!entry) return "";
  if (entry.file instanceof File || entry.file instanceof Blob) {
    try {
      return await fileToDataUrl(entry.file);
    } catch (err) {
      console.error("photoEntryToDataUrl: failed to read local file", err);
    }
  }
  const src = getPhotoUrl(entry);
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  try {
    const response = await fetch(src, { mode: "cors" });
    const blob = await response.blob();
    if (!blob) return "";
    return await fileToDataUrl(
      new File([blob], entry.altText || "card-photo", {
        type: blob.type || "image/jpeg",
      })
    );
  } catch (err) {
    console.error("photoEntryToDataUrl: unable to fetch remote image", err);
    return "";
  }
}
