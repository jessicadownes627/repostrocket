import { useNavigate } from "react-router-dom";
import { platformConfigs } from "../platforms/platformConfigs";
import "../styles/launchCenter.css";
import PremiumModal from "../components/PremiumModal";
import { incrementLaunch } from "../utils/usageTracker";
import usePaywallGate from "../hooks/usePaywallGate";
import UpgradeBanner from "../components/UpgradeBanner";
import { getUsage, getLimit } from "../utils/usageTracker";
import UsageMeter from "../components/UsageMeter";

export default function LaunchCenter() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();

  const launchUsage = getUsage("launches");
  const launchLimit = getLimit("launches");
  const showLaunchBanner =
    launchLimit > 0 &&
    launchUsage / launchLimit >= 0.8 &&
    launchUsage < launchLimit;

  return (
    <div className="launch-center-wrapper">

      <h1 className="launch-center-title">Launch Your Listing</h1>
      <p className="launch-center-subtitle">
        Choose a marketplace to launch your formatted listing.
      </p>

      {showLaunchBanner && <UpgradeBanner feature="Launches" />}
      <UsageMeter feature="launches" />

      {/* LUXURY CARD GRID */}
      <div className="platform-grid">
        {Object.values(platformConfigs).map((p) => (
          <div
            key={p.id}
            className="platform-card"
            onClick={() =>
              gate("launches", () => {
                incrementLaunch();
                navigate(`/launch/${p.id}`);
              })
            }
          >
            <h2 className="platform-name">{p.name}</h2>
          </div>
        ))}
      </div>

      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
        onUpgrade={() => {
          window.location.href = "/upgrade";
        }}
      />
    </div>
  );
}
