import "../styles/upgradeBanner.css";

export default function UpgradeBanner({ feature }) {
  return (
    <div className="upgrade-banner">
      <div className="ub-glow"></div>
      <p className="ub-text">
        You’re close to your free limit for <strong>{feature}</strong> — 
        upgrade to keep going without interruptions.
      </p>
    </div>
  );
}
