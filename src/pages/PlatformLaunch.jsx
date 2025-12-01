import { useParams, useNavigate } from "react-router-dom";
import { platformConfigs } from "../platforms/platformConfigs";
import { platformTips } from "../platforms/platformTips";
import { formatListingByPlatform } from "../utils/formatListingByPlatform";
import copyToClipboard from "../utils/clipboard";
import PremiumModal from "../components/PremiumModal";
import Toast from "../components/Toast";
import "../styles/platformLaunch.css";
import usePaywallGate from "../hooks/usePaywallGate";
import UsageMeter from "../components/UsageMeter";
import UpgradeBanner from "../components/UpgradeBanner";
import { getUsageCount, getLimit } from "../utils/usageTracker";

export default function PlatformLaunch() {
  const { platform } = useParams();
  const navigate = useNavigate();
  const config = platformConfigs[platform];
  const tips = platformTips[platform] || [];
  const listingData = JSON.parse(localStorage.getItem("rr_listingDraft") || "{}");

  if (!config) {
    return (
      <div className="platform-launch-wrapper">
        <div className="platform-launch-header">
          <h1 className="platform-launch-title">Platform Not Found</h1>
        </div>
      </div>
    );
  }

  const formatted = formatListingByPlatform(listingData, config);
  const launchUsage = getUsageCount("launches");
  const launchLimit = getLimit("launches");
  const showLaunchBanner =
    launchLimit > 0 && launchUsage / launchLimit >= 0.8 && launchUsage < launchLimit;
  const { gate, paywallState, closePaywall } = usePaywallGate();

  const handleCopyAll = () => {
    const block = Object.entries(formatted)
      .map(([field, value]) => `${field.toUpperCase()}:\n${value}`)
      .join("\n\n");

    copyToClipboard(block);
    Toast.show("Copied all listing fields!");
  };

  const handleCopyField = (label, value) => {
    copyToClipboard(value || "");
    Toast.show(`${label} copied!`);
  };

  const handleOpenPlatform = () => {
    window.open(config.url, "_blank");
  };

  return (
    <div className="platform-launch-wrapper">
      <div className="platform-launch-header">
        <img src={config.icon} alt={config.name} className="platform-launch-icon" />
        <h1 className="platform-launch-title">{config.name}</h1>
      </div>
      {showLaunchBanner && <UpgradeBanner feature="Launches" />}
      <UsageMeter feature="launches" />

      <button className="copy-all-btn" onClick={() => gate("launches", handleCopyAll)}>
        Copy All Fields
      </button>

      <div className="field-blocks">
        {Object.entries(formatted).map(([field, value]) => (
          <div key={field} className="field-card">
            <div className="field-card-header">
              <span className="field-label">{field}</span>
                <button
                  className="copy-field-btn"
                  onClick={() => gate("launches", () => handleCopyField(field, value))}
                >
                Copy
              </button>
            </div>

            <textarea readOnly className="field-textarea" value={value} />
          </div>
        ))}
      </div>

      <div className="tips-card">
        <h2 className="tips-title">Pro Tips for {config.name}</h2>
        <ul className="tips-list">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="platform-launch-actions">
        <button onClick={() => navigate("/launch")} className="back-btn">
          Back to Platforms
        </button>

        <button className="open-platform-btn" onClick={() => gate("launches", handleOpenPlatform)}>
          Open {config.name}
        </button>
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
