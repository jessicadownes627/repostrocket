import { PHOTO_PRESETS } from "../config/photoPresets";

export async function processPhotosForPlatform(platformKey, images) {
  if (!images || !images.length) return [];

  const preset = PHOTO_PRESETS[platformKey] || PHOTO_PRESETS.mercari;

  const resizedImages = await Promise.all(images.map((src, idx) => resizeImage(src, preset, idx)));
  return resizedImages;
}

async function resizeImage(src, preset, index) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = preset.width;
      canvas.height = preset.height;

      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, preset.width, preset.height);

      const aspect = img.width / img.height;
      const targetAspect = preset.width / preset.height;

      let drawWidth;
      let drawHeight;

      if (preset.mode === "cover") {
        if (aspect > targetAspect) {
          drawHeight = preset.height;
          drawWidth = img.width * (preset.height / img.height);
        } else {
          drawWidth = preset.width;
          drawHeight = img.height * (preset.width / img.width);
        }
      } else {
        const ratio = Math.min(preset.width / img.width, preset.height / img.height);
        drawWidth = img.width * ratio;
        drawHeight = img.height * ratio;
      }

      const offsetX = (preset.width - drawWidth) / 2;
      const offsetY = (preset.height - drawHeight) / 2;

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      const output = canvas.toDataURL("image/jpeg", 0.88);
      resolve({
        name: `photo-${index + 1}.jpg`,
        src: output,
      });
    };

    img.src = src;
  });
}
