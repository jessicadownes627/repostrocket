import { useEffect, useRef, useState } from "react";
import { openDeepLink } from "../utils/deepLinkMap";
import { useSmartPaste } from "../hooks/useSmartPaste";
import { getShippingSuggestions } from "../utils/shippingSuggestions";
import "../styles/floatingPanel.css";

export default function FloatingPanel({
  isOpen,
  onClose,
  listingData,
  onSmartPaste,
  onSmartFill,
  isExpanded,
  setIsExpanded,
  thumbUrl,
  lockPosition = false,
  smartFill,
  confidenceLabel,
  confidenceScore,
  features,
  colorName,
  platform,
  setPlatform,
  selectedPlatforms,
  autoTitle,
  titleVariants,
  onShuffle,
  autoCopyBundle,
}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState(() => {
    const saved = sessionStorage.getItem("rr_panel_pos");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return { x: 16, y: 16 };
      }
    }
    return { x: 16, y: 16 };
  });
  const [dragging, setDragging] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hidden, setHidden] = useState(false);

  const { smartPasteBlock, copyToClipboard } = useSmartPaste(listingData);
  const shippingSuggestions = getShippingSuggestions(listingData);

  useEffect(() => {
    const onScroll = () => {
      setHidden(window.scrollY > 500);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    sessionStorage.setItem("rr_panel_pos", JSON.stringify(position));
  }, [position]);

  const startDrag = (e) => {
    if (lockPosition) return;
    setDragging(true);
    const startX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const startY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    setOffset({ x: startX - position.x, y: startY - position.y });
    e.preventDefault();
  };

  const onMove = (e) => {
    if (!dragging) return;
    const moveX = e.clientX || (e.touches && e.touches[0]?.clientX) || 0;
    const moveY = e.clientY || (e.touches && e.touches[0]?.clientY) || 0;
    let newX = moveX - offset.x;
    let newY = moveY - offset.y;

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    newX = Math.max(8, Math.min(vw - 200, newX));
    newY = Math.max(8, Math.min(vh - 120, newY));
    setPosition({ x: newX, y: newY });
  };

  useEffect(() => {
    if (dragging) {
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", () => setDragging(false), { once: true });
      window.addEventListener("touchmove", onMove);
      window.addEventListener("touchend", () => setDragging(false), { once: true });
    }
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
    };
  }, [dragging, offset]);

  const handleSmartPaste = () => {
    copyToClipboard();
    if (onSmartPaste) onSmartPaste(smartPasteBlock);
  };

  const handleSmartFill = () => {
    if (autoCopyBundle) autoCopyBundle();
    if (onSmartFill && smartFill) onSmartFill(smartFill);
  };

  const expandToggle = () => setIsExpanded(!isExpanded);

  if (!isOpen || hidden) return null;

  const thumb = thumbUrl || "";

  return (
    <div
      className={`floating-panel ${isExpanded ? "expanded" : "compact"}`}
      ref={panelRef}
      style={{ left: position.x, top: position.y, position: "fixed", zIndex: 9999 }}
    >
      <div className="fp-header" onMouseDown={startDrag} onTouchStart={startDrag} onClick={expandToggle}>
        <div className="fp-drag-handle">≡</div>
        <div className="fp-title">Smart Tools</div>
        <button className="fp-close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
      </div>

      {isExpanded && (
        <div className="fp-body">
          <div className="platform-switcher">
            {(selectedPlatforms && selectedPlatforms.length ? selectedPlatforms : []).map((p) => {
              const key = p.toLowerCase();
              return (
                <button
                  key={key}
                  className={`ps-btn ${platform === key ? "active" : ""}`}
                  onClick={() => setPlatform && setPlatform(key)}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              );
            })}
          </div>
          <div className="fp-thumb">
            {thumb ? <img src={thumb} alt="thumb" /> : <div className="fp-fallback">RR</div>}
          </div>
          <div className="fp-actions">
            <button className="fp-btn" onClick={handleSmartPaste}>SmartPaste</button>
            <button className="fp-btn" onClick={handleSmartFill}>SmartFill</button>
          </div>
          {smartFill && (
            <div className="smartfill-block">
              <div className="smartfill-banner">
                <div className="sf-left">
                  <h2>SmartFill Pro</h2>
                  <p className="sf-subtext">
                    AI-powered listing fill. Titles, descriptions, tags, colors, and categories built for each platform.
                  </p>
                </div>

                {confidenceScore !== undefined && (
                  <div className="sf-right">
                    <div className={`sf-confidence-label ${confidenceLabel?.toLowerCase().replace(/\s/g, "")}`}>
                      {confidenceLabel}
                    </div>
                    <div className="sf-confidence-bar">
                      <div
                        className="sf-confidence-fill"
                        style={{ width: `${confidenceScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>

              <div className="sf-platform-note">
                Optimized for: <strong>{platform?.toUpperCase()}</strong>
              </div>

              {autoTitle && (
                <div className="sf-title-box">
                  <label>Generated Title</label>
                  <p>{autoTitle}</p>
                </div>
              )}

              {smartFill.description && (
                <div className="sf-description">{smartFill.description}</div>
              )}

              {Array.isArray(smartFill.tags) && smartFill.tags.length > 0 && (
                <div className="sf-tags">
                  <div className="sf-tags-label">Tags</div>
                  <div className="sf-tags-wrap">
                    {smartFill.tags.map((tag, idx) => (
                      <span key={`${tag}-${idx}`} className="sf-tag-pill">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {titleVariants && titleVariants.length > 0 && (
            <div className="fp-title-shuffle">
              <div className="fp-title-shuffle-head">
                <span>Title Shuffle</span>
                <button
                  className="fp-title-refresh"
                  onClick={onShuffle}
                >
                  🔄 Shuffle
                </button>
              </div>

              {titleVariants.map((t, i) => (
                <div key={i} className="fp-title-option">
                  <div className="fp-title-text">{t}</div>
                  <button
                    className="fp-title-copy"
                    onClick={() => copyToClipboard(t)}
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          )}

          {shippingSuggestions.length > 0 && (
            <div className="shipping-suggestions">
              <div className="ss-title">Shipping Suggestions</div>
              <ul className="ss-list">
                {shippingSuggestions.map((tip, idx) => (
                  <li key={idx} className="ss-item">{tip}</li>
                ))}
              </ul>
              <div className="ss-disclaimer">
                You choose the final method — these are just suggestions.
              </div>
            </div>
          )}
          <div className="fp-links">
            {(selectedPlatforms && selectedPlatforms.length ? selectedPlatforms : []).map((p) => {
              const key = p.toLowerCase();
              return (
                <button key={key} className="fp-link" onClick={() => openDeepLink(key, "create")}>
                  {`Open ${key.charAt(0).toUpperCase() + key.slice(1)}`}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
