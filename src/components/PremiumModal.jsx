// =====================================
// PremiumModal.jsx (FULL FILE REPLACE)
// =====================================

import React from "react";
import "../styles/premiumModal.css";
import { setPremiumStatus } from "../store/premiumStore";

export default function PremiumModal({
  open,
  reason,
  usage,
  limit,
  tempMessage,
  onClose
}) {
  if (!open) return null;

  const handleUpgrade = (plan) => {
    // Immediately unlock premium
    setPremiumStatus(true);
    onClose();
  };

  return (
    <div className="premium-modal-backdrop">
      <div className="premium-modal">
        {/* Header Glow */}
        <div className="premium-header">
          <div className="rocket-ring">
            <div className="rocket-icon">🚀</div>
          </div>
          <h2 className="premium-title">Upgrade to Repost Rocket Premium</h2>
          {tempMessage && (
            <p className="rr-paywall-message">{tempMessage}</p>
          )}
          <p className="premium-reason">
            {reason ? `You’ve reached your free limit for ${String(reason)}.` : ""}
          </p>
          <p className="premium-usage">
            {usage != null && limit != null ? `${usage} / ${limit} free uses today` : ""}
          </p>
        </div>

        {/* Feature List */}
        <div className="premium-features">
          <h3>Premium Includes</h3>
          <ul>
            <li>✔ Unlimited Smart Fill</li>
            <li>✔ Unlimited Magic Fill</li>
            <li>✔ Unlimited AI Review</li>
            <li>✔ Unlimited Platform Launches</li>
            <li>✔ Unlimited Copy-All</li>
            <li>✔ Unlimited Photo Badges</li>
            <li>✔ Unlimited SEO Boosts</li>
            <li className="tease">🔒 Auto Multi-Platform Posting (Coming Soon)</li>
          </ul>
        </div>

        {/* Plan Options */}
        <div className="premium-plans">
          <button
            className="premium-plan"
            onClick={() => handleUpgrade("monthly")}
          >
            <div className="plan-price">$14.99/mo</div>
            <div className="plan-note">Best for trying it out</div>
          </button>

          <button
            className="premium-plan premium-plan-highlight"
            onClick={() => handleUpgrade("yearly")}
          >
            <div className="plan-price">$49.99/yr</div>
            <div className="plan-note saving">Save 66%</div>
          </button>
        </div>

        {/* Footer */}
        <div className="premium-footer">
          <button className="premium-close" onClick={onClose}>
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
