export default function LuxeCard({
  title,
  subtitle,
  description,
  onClick,
  premium = false,
  className = "",
}) {
  const cardStyle = {
    "--card-bg": "var(--lux-card-bg)",
    "--card-border": "var(--lux-card-border)",
    "--card-shadow": "var(--lux-card-glow)",
  };

  return (
    <button
      onClick={onClick}
      className={`luxe-card w-full max-w-[720px] mx-auto my-6 text-left ${className}`}
      style={cardStyle}
      type="button"
    >
      {premium && <span className="premium-pill">Premium</span>}
      <div className="luxe-card-category">{subtitle}</div>
      <div className="luxe-card-title">{title}</div>
      <div className="luxe-card-subtext">{description}</div>
    </button>
  );
}
