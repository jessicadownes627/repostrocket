import React from "react";
import { useNavigate } from "react-router-dom";
import { platformConfigs } from "../platforms/platformConfigs";
import "../styles/platformPrep.css";

const PlatformPrep = () => {
  const navigate = useNavigate();

  return (
    <div className="platformprep-page">
      <div className="platformprep-container">

        <h1 className="prep-title">Platform Tips</h1>
        <p className="prep-subtitle">
          Quick notes to help you launch smoothly.  
          Each marketplace works a little differently — here’s what to know.
        </p>

        <div className="prep-grid">
          {Object.values(platformConfigs).map((p) => (
            <div key={p.id} className="prep-card">
              <img src={p.icon} alt={p.name} className="prep-icon" />
              <h2 className="prep-name">{p.name}</h2>

              <ul className="prep-list">
                {p.tips?.map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </ul>

              <button
                className="prep-btn"
                onClick={() => navigate(`/launch/${p.id}`)}
              >
                Open {p.name}
              </button>
            </div>
          ))}
        </div>

        <div className="prep-actions">
          <button
            className="prep-secondary"
            onClick={() => navigate("/launch")}
          >
            Back to Launch Deck
          </button>

          <button
            className="prep-primary"
            onClick={() => navigate("/loading")}
          >
            Continue to Launch
          </button>
        </div>

      </div>
    </div>
  );
};

export default PlatformPrep;
