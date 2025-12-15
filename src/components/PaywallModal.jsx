import React from "react";
import "../styles/paywall.css";
import { setPremiumStatus } from "../store/premiumStore";

export default function PaywallModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="paywall-backdrop">
      <div className="paywall-card">
        <h2 className="paywall-title">Unlock Repost Rocket Premium</h2>
        <p className="paywall-sub">
          Get unlimited Smart Fill, unlimited Launches, and advanced review access.
        </p>

        <ul className="paywall-features">
          <li>Unlimited Launch Deck access</li>
          <li>Unlimited Smart Fill</li>
          <li>Full listing review &amp; scoring</li>
          <li>Unlimited photo badges</li>
        </ul>

        <button
          className="paywall-upgrade-btn"
          onClick={() => {
            setPremiumStatus(true);
            onClose(true);
          }}
        >
          Upgrade Now – $9.99/mo
        </button>

        <button className="paywall-cancel-btn" onClick={() => onClose(false)}>
          Not now
        </button>
      </div>
    </div>
  );
}
