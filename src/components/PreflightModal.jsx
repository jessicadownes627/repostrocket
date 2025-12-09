import React, { useEffect } from "react";
import "../styles/preflightModal.css";

export default function PreflightModal({ open, results, onClose, onFix }) {
  if (!open) return null;

  const { errors = [], warnings = [] } = results || {};

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="preflight-backdrop" onClick={onClose}>
      <div className="preflight-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preflight-header">
          <h2>Preflight Check</h2>
          <p>Let’s make sure everything is perfect before you launch.</p>
        </div>

        {(errors.length > 0 || warnings.length > 0) && (
          <div className="preflight-issues">
            {errors.length > 0 && (
              <div>
                <h3 className="preflight-issues-title">Required Fixes</h3>
                <ul>
                  {errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.length > 0 && (
              <div>
                <h3 className="preflight-issues-title">Optional Improvements</h3>
                <ul>
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {errors.length === 0 && warnings.length === 0 && (
          <div className="preflight-clean">
            <div className="pf-clean-icon"></div>
            <p className="pf-clean-text">Everything looks perfect. Ready to launch!</p>
          </div>
        )}

        <div className="preflight-actions">
          {errors.length > 0 && (
            <button className="preflight-btn" onClick={onFix}>
              Fix Issues
            </button>
          )}

          <button className="preflight-btn" onClick={onClose}>
            Close
          </button>

          <button
            className="preflight-btn preflight-btn-primary"
            onClick={() => {
              onClose();
              onFix(true);
            }}
          >
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
}
