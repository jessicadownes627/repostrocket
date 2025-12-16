import { downloadImageFile } from "./magicPhotoTools";

const MOBILE_REGEX = /iphone|ipad|ipod|android|mobile|blackberry|iemobile|opera mini/i;

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || navigator.vendor || "";
  return MOBILE_REGEX.test(ua);
}

function normalizeSources(input, defaultName) {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input
      .map((entry, idx) => {
        if (!entry) return null;
        if (typeof entry === "string") {
          return { dataUrl: entry, filename: `${defaultName || "photo"}-${idx + 1}.jpg` };
        }
        if (entry.url) {
          return { dataUrl: entry.url, filename: entry.filename || `${defaultName || "photo"}-${idx + 1}.jpg` };
        }
        if (entry.dataUrl) {
          return { dataUrl: entry.dataUrl, filename: entry.filename || `${defaultName || "photo"}-${idx + 1}.jpg` };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof input === "string") {
    return [{ dataUrl: input, filename: defaultName || "photo.jpg" }];
  }
  if (input.url || input.dataUrl) {
    return [
      {
        dataUrl: input.url || input.dataUrl,
        filename: input.filename || defaultName || "photo.jpg",
      },
    ];
  }
  return [];
}

export function getImageSaveLabel() {
  return isMobileDevice() ? "Save to Photos" : "Download Image";
}

export async function shareImage(source, options = {}) {
  const { filename = "photo.jpg", title = "Listing Photo", text = "Saved from Repost Rocket" } = options;
  const targets = normalizeSources(source, filename);
  if (!targets.length) return { success: false };

  if (isMobileDevice() && typeof navigator !== "undefined" && navigator.share) {
    try {
      const files = [];
      for (const target of targets) {
        const response = await fetch(target.dataUrl);
        const blob = await response.blob();
        const mime = blob.type || "image/jpeg";
        const safeName = target.filename || filename;
        files.push(new File([blob], safeName, { type: mime }));
      }

      const shareData = { files, title, text };
      if (!navigator.canShare || navigator.canShare({ files })) {
        await navigator.share(shareData);
        return { success: true, method: "share" };
      }
    } catch (err) {
      console.warn("shareImage fallback to download", err);
    }
  }

  targets.forEach((target) => {
    downloadImageFile(target.dataUrl, target.filename || filename);
  });
  return { success: true, method: "download" };
}
