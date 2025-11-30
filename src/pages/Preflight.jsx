import React, { useEffect, useState } from "react";
import { useListingStore } from "../store/useListingStore";
import { runPreflightChecks } from "../utils/preflightChecks";
import { useNavigate } from "react-router-dom";
import PremiumModal from "../components/PremiumModal";
import usePaywallGate from "../hooks/usePaywallGate";
import UsageMeter from "../components/UsageMeter";
import UpgradeBanner from "../components/UpgradeBanner";
import { getUsage, getLimit } from "../utils/usageTracker";
import "../styles/preflight.css";

export default function Preflight() {
  const navigate = useNavigate();
  const { gate, paywallState, closePaywall } = usePaywallGate();
  const listingData = useListingStore((state) => state.listingData);
  const launchUsage = getUsage("launches");
  const launchLimit = getLimit("launches");
  const showLaunchBanner =
    launchLimit > 0 && launchUsage / launchLimit >= 0.8 && launchUsage < launchLimit;
  const [results, setResults] = useState(null);
  const [isClean, setIsClean] = useState(false);

  useEffect(() => {
    const check = runPreflightChecks(listingData);
    setResults(check);

    if (check.errors.length === 0 && check.warnings.length === 0) {
      setIsClean(true);
      const t = setTimeout(() => navigate("/loading"), 1100);
      return () => clearTimeout(t);
    }
  }, [listingData, navigate]);

  if (!results) return null;

  return (
    <div className="preflight-page">
      <div className="preflight-container">
        {isClean && (
          <div className="preflight-clean-card">
            <h2>✨ Ready to Launch</h2>
            <p>Everything looks perfect. Preparing your launch deck…</p>
          </div>
        )}

        {!isClean && (
          <>
            <h1 className="preflight-title">Launch Checklist</h1>
            <p className="preflight-subtitle">
              Fix what matters. Continue when you're confident.
            </p>
            {showLaunchBanner && <UpgradeBanner feature="Launches" />}

            {results.errors.length > 0 && (
              <div className="preflight-card error-card">
                <h3 className="card-title">🚫 Required Fixes</h3>
                <ul>
                  {results.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {results.warnings.length > 0 && (
              <div className="preflight-card warning-card">
                <h3 className="card-title">⚠️ Strong Recommendations</h3>
                <ul>
                  {results.warnings.map((warn, idx) => (
                    <li key={idx}>{warn}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="preflight-actions">
              <button className="preflight-btn" onClick={() => navigate("/create")}>
                Fix Items
              </button>

              <button className="preflight-btn-primary" onClick={() => gate("launches", () => navigate("/launch-deck"))}>
                Continue Anyway
              </button>
            </div>

            <UsageMeter />
          </>
        )}
      </div>
      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
        onUpgrade={() => window.location.href = "/upgrade"}
      />
    </div>
  );
}
