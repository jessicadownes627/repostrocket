import React from "react";
import "./launchloading.css";

export default function LaunchLoading() {
  return (
    <div className="loading-container">
      <div className="scan-overlay"></div>

      <div className="rocket-wrapper">
        <div className="rocket-body">
          <div className="rocket-fin left"></div>
          <div className="rocket-fin right"></div>
          <div className="rocket-window"></div>
        </div>
        <div className="rocket-fire"></div>
      </div>

      <h1 className="loading-title">Initiating Launch Sequence…</h1>
      <p className="loading-sub">Systems online • Engines primed • Countdown engaged</p>

      <div className="progress-bar">
        <div className="progress"></div>
      </div>
    </div>
  );
}
