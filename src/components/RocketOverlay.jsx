import { useEffect } from "react";
import "../styles/rocketoverlay.css";

export default function RocketOverlay({ message = "Preparing your launch…", onComplete }) {
  useEffect(() => {
    try {
      navigator.vibrate?.(40);
    } catch {}

    const timer = setTimeout(() => {
      onComplete?.();
    }, 2400);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="rocketoverlay-backdrop">
      <div className="rocketoverlay-card">
        <div className="rocketoverlay-ring"></div>

        <svg className="rocketoverlay-icon" viewBox="0 0 64 64">
          <path
            d="M16 48l-2 10 10-2 24-24c4-4 6-12 6-18v-6h-6c-6 0-14 2-18 6L6 40l10 8z"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <circle cx="36" cy="26" r="6" stroke="currentColor" strokeWidth="3" fill="none" />
          <path
            d="M14 36c-4 0-8 4-8 8 4 0 8-4 8-8zm6 6c-4 0-8 4-8 8 4 0 8-4 8-8z"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
          />
        </svg>

        <p className="rocketoverlay-text">{message}</p>

        <div className="rocketoverlay-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}
