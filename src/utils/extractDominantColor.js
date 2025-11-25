export async function extractDominantColor(imageUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = imageUrl;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 50;
      canvas.height = 50;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, 50, 50);

      const data = ctx.getImageData(0, 0, 50, 50).data;

      let r = 0, g = 0, b = 0;
      const total = data.length / 4;

      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
      }

      r = Math.round(r / total);
      g = Math.round(g / total);
      b = Math.round(b / total);

      resolve(`rgb(${r}, ${g}, ${b})`);
    };

    img.onerror = () => resolve(null);
  });
}
