import { useState, useRef, useEffect } from "react";
import "../styles/launchdeck.css";
import CopyButton from "./CopyButton";

export default function LaunchPreviewDeck({
  platformKey,
  previews = [],
  title = "",
  description = "",
  tags = "",
  platformTheme,
  size,
  bagType,
  onConfirmLaunch,
}) {
  const [index, setIndex] = useState(0);
  const trackRef = useRef(null);

  const cards = [
    { type: "photos" },
    { type: "title" },
    { type: "description" },
    { type: "tags" },
    { type: "confirm" },
  ];

  const next = () => setIndex((i) => Math.min(i + 1, cards.length - 1));
  const back = () => setIndex((i) => Math.max(i - 1, 0));

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${index * 100}%)`;
    }
  }, [index]);

  const tagText = tags || "";
  const hasBadges = size || bagType;

  return (
    <div className="deck-shell">
      <div className="deck-track" ref={trackRef}>
        <div className="deck-card">
          <h3 className="deck-header">Preview your photos</h3>
          {hasBadges && (
            <div className="badge-row">
              {size && <span className="launch-badge">Size: {size}</span>}
              {bagType && <span className="launch-badge">{bagType}</span>}
            </div>
          )}
          {previews.length > 0 && (
            <div className="photo-section">
              <img className="main-photo" src={previews[0]} alt="main" />
              <div className="thumbs">
                {previews.slice(1).map((src, i) => (
                  <img key={i} src={src} alt={`thumb-${i}`} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="deck-card">
          <h3 className="deck-header">Optimized title</h3>
          <p className="deck-text">{title}</p>
          <CopyButton text={title} label="Copy Title" />
        </div>

        <div className="deck-card">
          <h3 className="deck-header">Optimized description</h3>
          <p className="deck-text description-block">{description}</p>
          <CopyButton text={description} label="Copy Description" />
        </div>

        <div className="deck-card">
          <h3 className="deck-header">Tags</h3>
          <div className="tags-block">
            {tagText.split(/\s+/).map((t, i) => (
              <span key={i} className="tag-pill">
                {t}
              </span>
            ))}
          </div>
          <CopyButton text={tagText} label="Copy Tags" />
        </div>

        <div className="deck-card">
          <h3 className="deck-header">Ready to launch</h3>
          <p className="deck-sub">Everything looks good.</p>

          <button className="confirm-launch-btn" onClick={onConfirmLaunch}>
            <span className="micro-rocket">🚀</span> Launch with Rocket
          </button>
        </div>
      </div>

      <div className="deck-dots">
        {cards.map((_, i) => (
          <span
            key={i}
            className={`dot ${i === index ? "active" : ""}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>

      <div className="deck-nav">
        <button disabled={index === 0} onClick={back}>
          Back
        </button>
        <button disabled={index === cards.length - 1} onClick={next}>
          Next
        </button>
      </div>
    </div>
  );
}
