// photoBadgeEngine.js
// Apple-quality badge renderer for platform photos

export async function applyPlatformBadge(base64Image, initial, glowColor) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = base64Image;

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      canvas.width = img.width;
      canvas.height = img.height;

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Badge size scales based on image width
      const size = Math.max(72, Math.floor(img.width * 0.12));
      const padding = Math.floor(size * 0.25);

      const x = img.width - size - padding;
      const y = img.height - size - padding;

      // Translucent black circle
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();

      // Glow ring
      ctx.shadowBlur = size * 0.35;
      ctx.shadowColor = glowColor;
      ctx.beginPath();
      ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = glowColor;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Initial (white, centered)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `${Math.floor(size * 0.55)}px -apple-system, BlinkMacSystemFont, 'SF Pro Rounded', 'SF Pro Display', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(initial.toUpperCase(), x + size / 2, y + size / 2 + 2);

      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
  });
}
