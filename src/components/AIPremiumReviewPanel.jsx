import "./../styles/aipremiumreview.css";

export default function AIPremiumReviewPanel({ review, onClose }) {
  if (!review) return null;

  return (
    <div className="ai-review-overlay">
      <div className="ai-review-cardstack">
        {/* HEADER */}
        <div className="ai-review-header">
          <h2 className="ai-review-title">Repost Rocket Review</h2>
          <p className="ai-review-sub">Here’s how to optimize this listing</p>
          <button className="ai-close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* CARD 1: OVERALL */}
        <div className="ai-card ai-card--overall">
          <h3 className="ai-card-title">Overall Score</h3>
          <p className="ai-big-score">{review.overallScore}/100</p>
          <p className="ai-card-hint">{review.overallNote}</p>
        </div>

        {/* CARD 2: PHOTO QUALITY */}
        <div className="ai-card">
          <h3 className="ai-card-title">Photo Quality</h3>
          <p className="ai-subscore">Score: {review.photo.score}/100</p>
          <ul className="ai-list">
            {review.photo.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </div>

        {/* CARD 3: FIT PREDICTOR */}
        <div className="ai-card">
          <h3 className="ai-card-title">Fit Predictor</h3>
          <p className="ai-subscore">{review.fit.fitType}</p>
          <ul className="ai-list">
            {review.fit.buyerQuestions.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </div>

        {/* CARD 4: RISK CHECK */}
        <div className="ai-card">
          <h3 className="ai-card-title">Risk Check</h3>
          <ul className="ai-list">
            {review.risks.map((risk, i) => (
              <li key={i}>{risk}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
