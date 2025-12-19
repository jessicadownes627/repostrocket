import { useEffect, useRef, useState } from "react";

const VIEWPORT_SIZE = 220;
const MIN_SCALE = 0.85;
const MAX_SCALE = 1.15;

export default function CornerAdjustModal({ target, onClose, onSave }) {
  if (!target) return null;

  const { url, label } = target;
  const imgRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [imageReady, setImageReady] = useState(false);

  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
    setImageReady(false);
  }, [url]);

  const clampOffset = (nextOffset) => {
    const limit = 35;
    return {
      x: Math.max(-limit, Math.min(limit, nextOffset.x)),
      y: Math.max(-limit, Math.min(limit, nextOffset.y)),
    };
  };

  const handlePointerDown = (event) => {
    event.preventDefault();
    const startX = event.clientX;
    const startY = event.clientY;
    dragRef.current = { startX, startY, offset };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current) return;
    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;
    const base = dragRef.current.offset;
    setOffset(clampOffset({ x: base.x + deltaX, y: base.y + deltaY }));
  };

  const handlePointerUp = () => {
    dragRef.current = null;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  const handleSave = () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement("canvas");
    canvas.width = VIEWPORT_SIZE;
    canvas.height = VIEWPORT_SIZE;
    const ctx = canvas.getContext("2d");
    const renderWidth = img.naturalWidth * scale;
    const renderHeight = img.naturalHeight * scale;
    const drawX = (VIEWPORT_SIZE - renderWidth) / 2 + offset.x;
    const drawY = (VIEWPORT_SIZE - renderHeight) / 2 + offset.y;
    ctx.drawImage(img, drawX, drawY, renderWidth, renderHeight);
    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onSave(dataUrl);
    } catch (err) {
      console.error("Corner adjust save failed:", err);
    }
  };

  return (
    <div className="corner-adjust-overlay">
      <div className="corner-adjust-card">
        <div className="corner-adjust-header">
          <div>
            <div className="corner-adjust-label">Adjust Corner</div>
            <div className="corner-adjust-title">{label}</div>
          </div>
          <button type="button" className="corner-adjust-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div
          className="corner-adjust-viewport"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
          onPointerDown={handlePointerDown}
        >
          <img
            ref={imgRef}
            src={url}
            alt={label}
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            }}
            onLoad={() => setImageReady(true)}
            draggable={false}
          />
          {!imageReady && <div className="corner-adjust-loading">Loading…</div>}
          <div className="corner-adjust-frame" />
        </div>

        <div className="corner-adjust-controls">
          <label htmlFor="corner-zoom" className="corner-adjust-zoom-label">
            Zoom
          </label>
          <input
            id="corner-zoom"
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={0.01}
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
          />
          <div className="corner-adjust-zoom-values">
            <span>-15%</span>
            <span>+15%</span>
          </div>
        </div>

        <div className="corner-adjust-actions">
          <button type="button" className="corner-adjust-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="corner-adjust-primary" onClick={handleSave}>
            Save Adjustment
          </button>
        </div>
      </div>
    </div>
  );
}
