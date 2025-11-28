// src/pages/PlatformLaunch.jsx
import { useParams, useNavigate } from "react-router-dom";
import { platformConfigs } from "../platforms/platformConfigs";
import { platformTips } from "../platforms/platformTips";
import { formatListingByPlatform } from "../utils/formatListingByPlatform";
import copyToClipboard from "../utils/clipboard";
import Toast from "../components/Toast";
import "../styles/platformLaunch.css";

export default function PlatformLaunch() {
  const { platform } = useParams();
  const navigate = useNavigate();

  const config = platformConfigs[platform];
  const tips = platformTips[platform] || [];

  const listingData = JSON.parse(localStorage.getItem("rr_listingDraft") || "{}");
  const formatted = formatListingByPlatform(listingData, config);

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

  return (
    <div className="platform-launch-wrapper">
      <div className="platform-launch-header">
        <img src={config.icon} alt={config.name} className="platform-launch-icon" />
        <h1 className="platform-launch-title">{config.name}</h1>
      </div>

      <button className="copy-all-btn" onClick={handleCopyAll}>
        Copy All Fields
      </button>

      <div className="field-blocks">
        {Object.entries(formatted).map(([field, value]) => (
          <div key={field} className="field-card">
            <div className="field-card-header">
              <span className="field-label">{field}</span>
              <button
                className="copy-field-btn"
                onClick={() => handleCopyField(field, value)}
              >
                Copy
              </button>
            </div>

            <textarea
              readOnly
              className="field-textarea"
              value={value}
            />
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="tips-card">
        <h2 className="tips-title">Pro Tips for {config.name}</h2>
        <ul className="tips-list">
          {tips.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="platform-launch-actions">
        <button onClick={() => navigate("/launch")} className="back-btn">
          Back to Platforms
        </button>

        <a href={config.url} target="_blank" rel="noreferrer" className="open-platform-btn">
          Open {config.name}
        </a>
      </div>
    </div>
  );
}
