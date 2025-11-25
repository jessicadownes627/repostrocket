export function mapColorToName(rgb) {
  if (!rgb) return null;

  const [r, g, b] = rgb
    .replace("rgb(", "")
    .replace(")", "")
    .split(",")
    .map(Number);

  if (r > 220 && g > 220 && b > 220) return "white";
  if (r > 200 && g < 80 && b < 80) return "red";
  if (r < 80 && g < 80 && b > 150) return "blue";
  if (r > 200 && g > 200 && b < 100) return "champagne";
  if (r > 240 && g > 200 && b > 200) return "blush";
  if (r > 150 && g > 150 && b > 150) return "cream";
  if (r < 80 && g < 80 && b < 80) return "black";
  return null;
}
