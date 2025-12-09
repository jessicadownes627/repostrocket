import { AnimatePresence, motion } from "framer-motion";
import "../styles/aireviewpanel.css";

export default function AIReviewPanel({ open, onClose, results, onApply }) {
  if (!open) return null;

  const {
    confidence,
    highlights,
    titleAudit,
    descriptionAudit,
    platformWarnings,
    priceAudit,
  } = results || {};

  return (
    <AnimatePresence>
      <motion.div
        className="ai-review-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="ai-review-panel"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "tween", duration: 0.35 }}
        >
          <div className="ai-review-header">
            <h2>AI Listing Review</h2>
            <button className="close-btn" onClick={onClose}>
              ✕
            </button>
          </div>

          {/* CONFIDENCE SCORES */}
          <section className="ai-section">
            <h3>Confidence Scores</h3>
            <div className="ai-grid">
              {Object.entries(confidence || {}).map(([key, val]) => (
                <div key={key} className="ai-score-item">
                  <span className="ai-score-label">{key}</span>
                  <span className="ai-score-value">{Math.round((val || 0) * 100)}%</span>
                </div>
              ))}
            </div>
          </section>

          {/* TITLE AUDIT */}
          <section className="ai-section">
            <h3>Title Optimization</h3>
            <ul>
              {titleAudit?.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </section>

          {/* DESCRIPTION HIGHLIGHTS */}
          <section className="ai-section">
            <h3>Description Improvements</h3>
            <div className="ai-highlight-box">
              {(descriptionAudit || highlights || []).map((item, i) => (
                <span key={i} className={`hl-${item.type || "green"}`}>
                  {item.text || item}
                </span>
              ))}
            </div>
          </section>

          {/* PLATFORM WARNINGS */}
          <section className="ai-section">
            <h3>Marketplace Notes</h3>
            {Object.entries(platformWarnings || {}).map(([platform, warnings]) => (
              <div key={platform} className="ai-warning-block">
                <strong>{platform}</strong>
                <ul>
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {/* PRICE AUDIT */}
          <section className="ai-section">
            <h3>Pricing Suggestions</h3>
            <p>{priceAudit}</p>
          </section>

          <button className="ai-apply-btn" onClick={onApply}>
            Apply Suggested Enhancements
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
