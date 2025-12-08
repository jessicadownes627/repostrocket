export async function autoEnhanceCard(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Simple auto-brighten pass
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i] * 1.1; // red
        data[i + 1] = data[i + 1] * 1.1; // green
        data[i + 2] = data[i + 2] * 1.1; // blue
      }

      ctx.putImageData(imageData, 0, 0);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = base64;
  });
}

