import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/splash.css";

const Splash = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/welcome");
    }, 1800);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="splash-shell">
      <div className="splash-card">
        <div className="splash-icon" aria-hidden="true">
          <svg viewBox="0 0 32 32" className="splash-rocket">
            <path
              d="M12 20l-1.5 5L15 23l8-8c1.5-1.5 2-4.5 2-6.5V6h-2.5c-2 0-5 0.5-6.5 2l-8 8 4 4z"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <circle cx="18" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>
        <div className="splash-text">
          <p className="splash-title">Repost Rocket</p>
          <p className="splash-tagline">One Listing. Launch Everywhere.</p>
        </div>
      </div>
    </div>
  );
};

export default Splash;
