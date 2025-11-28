import "../styles/aidiffpanel.css";

export default function AIDiffPanel({ diff, onClose }) {
  if (!diff || !diff.length) return null;

  return (
    <div className="diff-overlay">
      <div className="diff-card">
        <button className="diff-close" onClick={onClose}>
          ✕
        </button>
        <h2 className="diff-title">AI Improvements</h2>
        <p className="diff-sub">Here’s what Repost Rocket adjusted and why.</p>

        <div className="diff-list">
          {diff.map((item, i) => (
            <div key={i} className="diff-item">
              <h3 className="diff-field">{item.label}</h3>
              <div className="diff-block">
                <div>
                  <p className="diff-label">Before</p>
                  <p className="diff-text">{item.before}</p>
                </div>

                <div>
                  <p className="diff-label after">After</p>
                  <p className="diff-text after-text">{item.after}</p>
                </div>
              </div>

              <p className="diff-reason">{item.reason}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
