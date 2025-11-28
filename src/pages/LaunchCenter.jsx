import { useNavigate } from "react-router-dom";
import { platformConfigs } from "../platforms/platformConfigs";
import "../styles/launchCenter.css";

export default function LaunchCenter() {
  const navigate = useNavigate();

  return (
    <div className="launch-center-wrapper">
      <h1 className="launch-center-title">Launch Your Listing</h1>
      <p className="launch-center-subtitle">
        Choose a marketplace to copy your formatted listing.
      </p>

      <div className="platform-grid">
        {Object.values(platformConfigs).map((p) => (
          <div
            key={p.id}
            className="platform-card"
            onClick={() => navigate(`/launch/${p.id}`)}
          >
            <img src={p.icon} alt={p.name} className="platform-icon" />
            <h2 className="platform-name">{p.name}</h2>
          </div>
        ))}
      </div>
    </div>
  );
}
