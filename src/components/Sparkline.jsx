export default function Sparkline({ points = [], color = "#E8D5A8" }) {
  if (!points.length) {
    return (
      <div className="text-xs opacity-40 italic">
        No data
      </div>
    );
  }

  // Normalize points for 100x30 viewport
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;

  const normalized = points.map((p, i) => {
    const x = (i / (points.length - 1 || 1)) * 100;
    const y = 30 - ((p - min) / range) * 30;
    return `${x},${y}`;
  });

  const path = normalized.join(" ");

  return (
    <svg
      width="100%"
      height="30"
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        points={path}
      />
    </svg>
  );
}

