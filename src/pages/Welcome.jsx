import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/overrides.css";
import "../styles/welcome.css";
import { useListingStore } from "../store/useListingStore";
import { setUserPhone } from "../store/premiumStore";

const platformOptions = [
  { id: "mercari", name: "Mercari", icon: "/icons/mercari.png" },
  { id: "poshmark", name: "Poshmark", icon: "/icons/poshmark.png" },
  { id: "depop", name: "Depop", icon: "/icons/depop.png" },
  { id: "ebay", name: "eBay", icon: "/icons/ebay.png" },
  { id: "etsy", name: "Etsy", icon: "/icons/etsy.png" },
  { id: "kidizen", name: "Kidizen", icon: "/icons/kidizen.png" },
  { id: "vinted", name: "Vinted", icon: "/icons/vinted.png" },
  { id: "grailed", name: "Grailed", icon: "/icons/grailed.png" },
  { id: "facebook marketplace", name: "Facebook Marketplace", icon: "/icons/facebook.png" },
  { id: "shopify", name: "Shopify", icon: "/icons/shopify.png" },
];

function Welcome() {
  const { selectedPlatforms, setSelectedPlatforms, resetListing } = useListingStore();
  const navigate = useNavigate();
  const normalizedSelected = selectedPlatforms.map((p) => p.toLowerCase());
  useEffect(() => {
    // Auto-enable premium for Jess & husband
    const devPhones = ["15164104363", "17189082021"];

    // Pick whichever is currently stored OR default to Jess
    const stored = localStorage.getItem("rr_userPhone") || localStorage.getItem("rr_user_phone");
    const activePhone = stored || devPhones[0];

    setUserPhone(activePhone);
  }, []);

  useEffect(() => {
    const current = localStorage.getItem("rr_user_phone");
    if (!current) {
      setUserPhone("15164104363");
    }
  }, []);

  const togglePlatform = (platform) => {
    const next = normalizedSelected.includes(platform)
      ? normalizedSelected.filter((p) => p !== platform)
      : [...normalizedSelected, platform];
    setSelectedPlatforms(next);
    localStorage.setItem("rr_selectedPlatforms", JSON.stringify(next));
  };

  const selectAllPlatforms = () => {
    const all = platformOptions.map((p) => p.id);
    setSelectedPlatforms(all);
    localStorage.setItem("rr_selectedPlatforms", JSON.stringify(all));
  };

  const clearPlatforms = () => {
    setSelectedPlatforms([]);
    localStorage.removeItem("rr_selectedPlatforms");
  };

  useEffect(() => {
    if (!selectedPlatforms.length) {
      const stored = localStorage.getItem("rr_selectedPlatforms");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setSelectedPlatforms(parsed);
          }
        } catch (e) {
          // ignore
        }
      }
    } else {
      localStorage.setItem("rr_selectedPlatforms", JSON.stringify(selectedPlatforms.map((p) => p.toLowerCase())));
    }
  }, [selectedPlatforms, setSelectedPlatforms]);

  const handleContinue = () => {
    navigate("/create");
  };

  const hasSelection = selectedPlatforms.length > 0;

  return (
    <div className="welcome-page">
      <div className="welcome-card welcome-wrapper">
        <div className="welcome-container">
          <p className="step-label">STEP 1:</p>
          <h2 className="section-title">Choose Your Selling Platforms</h2>

          <p className="section-subtitle">
            Pick every marketplace you plan to post this listing on. Repost Rocket handles formatting{" "}
            <span className="lux-animate">across every platform</span>.
          </p>

          <p className="note-text">
            (Note: You must have active accounts on these marketplaces to publish listings).
          </p>

          {/* Platform Grid */}
          <div className="platform-grid">
            {platformOptions.map((p) => {
              const isActive = normalizedSelected.includes(p.id);
              return (
                <div
                  key={p.id}
                  className={`platform-card ${isActive ? "selected" : ""}`}
                  onClick={() => togglePlatform(p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      togglePlatform(p.id);
                    }
                  }}
                >
                  <div className="platform-icon-ring">
                    {isActive && (
                      <svg viewBox="0 0 24 24" width="18" height="18">
                        <path
                          fill="currentColor"
                          d="M20.285 6.709a1 1 0 0 0-1.414-1.414l-9.192 9.193-4.242-4.243A1 1 0 0 0 4.023 11.66l4.95 4.95a1 1 0 0 0 1.414 0l9.898-9.9Z"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="platform-name">{p.name}</div>
                </div>
              );
            })}
          </div>

          <div className="platform-tools-row">
            <button
              type="button"
              className="small-action-btn"
              onClick={selectAllPlatforms}
            >
              Select All
            </button>

            <button
              type="button"
              className="small-action-btn"
              onClick={clearPlatforms}
            >
              Clear
            </button>
          </div>

          {/* Bottom Buttons */}
          <div className="actions">
            <button
              className="continue-btn"
              onClick={handleContinue}
              disabled={!hasSelection}
            >
              CONTINUE →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Welcome;
