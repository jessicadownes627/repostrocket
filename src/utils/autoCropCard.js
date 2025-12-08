export async function autoCropCard(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const size = Math.min(img.width, img.height);
      canvas.width = size;
      canvas.height = size;

      ctx.drawImage(
        img,
        (img.width - size) / 2,
        (img.height - size) / 2,
        size,
        size,
        0,
        0,
        size,
        size
      );

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = base64;
  });
}

