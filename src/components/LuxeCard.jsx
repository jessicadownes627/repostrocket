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
    "--card-border": premium
      ? "rgba(255, 235, 200, 0.6)"
      : "var(--lux-card-border)",
    "--card-shadow": premium
      ? "0 0 40px rgba(255, 255, 255, 0.32), inset 0 0 58px rgba(255, 255, 255, 0.16), 0 16px 38px rgba(0, 0, 0, 0.8)"
      : "0 0 28px rgba(255, 255, 255, 0.2), inset 0 0 48px rgba(255, 255, 255, 0.08), 0 10px 32px rgba(0, 0, 0, 0.7)",
  };

  return (
    <button
      onClick={onClick}
      className={`luxe-card ${
        premium ? "premium" : ""
      } w-full max-w-[720px] mx-auto my-6 text-left ${className}`}
      style={cardStyle}
      type="button"
    >
      <div className="luxe-card-category">{subtitle}</div>
      <div className="luxe-card-title">{title}</div>
      <div className="luxe-card-subtext">{description}</div>
    </button>
  );
}
