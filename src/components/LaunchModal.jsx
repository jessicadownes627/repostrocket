import React from "react";
import "./LaunchModal.css";

export default function LaunchModal({ platform, onClose, onLaunch }) {
  if (!platform) return null;

  return (
    <div className="launch-overlay">

      {/* 🌌 Ambient shimmering background */}
      <div className="ambient-layer">
        <div className="ambient-gradient"></div>
      </div>

      {/* Modal card with cinematic glow */}
      <div className="modal-card">

        {/* Premium Rocket Icon */}
        <div className="rocket-container">
          <svg
            className="rocket-icon"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Rocket body */}
            <path d="M12 2c3 2 5 6 5 10s-2 8-5 10c-3-2-5-6-5-10s2-8 5-10z" />

            {/* Window */}
            <circle cx="12" cy="10" r="2.2" />

            {/* Fins */}
            <path d="M7 14l-3 3 4-1 2-2" />
            <path d="M17 14l3 3-4-1-2-2" />
          </svg>

          {/* Green flame glow */}
          <div className="rocket-glow"></div>
        </div>

        {/* Text Content */}
        <h2 className="modal-title">Lift-Off Ready: {platform}</h2>

        <p className="modal-text">
          Your listing is prepped and ready for blast-off. RepostRocket will now open{" "}
          <strong>{platform}</strong> so you can finish the final steps.
        </p>

        {/* Buttons */}
        <div className="modal-buttons">
          <button className="btn-primary" onClick={onLaunch}>
            Open {platform}
          </button>

          <button className="btn-secondary" onClick={onClose}>
            cancel 
          </button>
        </div>
      </div>
    </div>
  );  
}
