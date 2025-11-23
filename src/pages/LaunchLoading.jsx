import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/launchloading.css";

const launchMessages = [
  "Preparing launch sequence…",
  "Igniting engines…",
  "Connecting to marketplaces…",
];

export default function LaunchLoading() {
  const navigate = useNavigate();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % launchMessages.length);
    }, 1000);

    const redirectTimer = setTimeout(() => {
      navigate("/launch");
    }, 2500);

    return () => {
      clearInterval(messageTimer);
      clearTimeout(redirectTimer);
    };
  }, [navigate]);

  return (
    <div className="launchloading-shell">
      <div className="launchloading-grid">
        <div className="launch-glow launch-glow--one" />
        <div className="launch-glow launch-glow--two" />

        <div className="rocket-stack">
          <div className="rocket-icon">
            <svg
              viewBox="0 0 64 64"
              aria-hidden="true"
              className="rocket-svg"
            >
              <path
                d="M16 48l-2 10 10-2 24-24c4-4 6-12 6-18v-6h-6c-6 0-14 2-18 6L6 40l10 8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <path
                d="M30 26c0-3 3-6 6-6s6 3 6 6-3 6-6 6-6-3-6-6z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="M14 36c-4 0-8 4-8 8 4 0 8-4 8-8zm6 6c-4 0-8 4-8 8 4 0 8-4 8-8z"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="rocket-fire" />
          </div>

          <div className="pulse-dots">
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="launch-text">
          <p className="launch-hero">Preparing liftoff</p>
          <p className="launch-sub">{launchMessages[messageIndex]}</p>
          <div className="launch-progress">
            <div className="launch-progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}
