import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";
import { useListingStore } from "../store/useListingStore";

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
          <h1 className="welcome-title">
            Choose Your Selling Platforms
          </h1>

          <p className="welcome-subtext">
            Pick every marketplace you plan to post this listing on.
            Repost Rocket handles formatting across every platform.
            <br /><br />
            <span style={{ opacity: 0.8, fontSize: "0.9rem" }}>
              (Note: You must have active accounts on these marketplaces to publish listings.)
            </span>
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
                  <div className="platform-title">{p.name}</div>
                  <div className="platform-check">
                    {isActive && (
                      <svg viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M20.285 6.709a1 1 0 0 0-1.414-1.414l-9.192 9.193-4.242-4.243A1 1 0 0 0 4.023 11.66l4.95 4.95a1 1 0 0 0 1.414 0l9.898-9.9Z"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Buttons */}
          <button
            className="select-all-platforms-btn"
            onClick={selectAllPlatforms}
          >
            Select All Platforms
          </button>

          <button
            className="luxury-button"
            onClick={handleContinue}
            disabled={!hasSelection}
            style={{ opacity: hasSelection ? 1 : 0.5 }}
          >
            Continue →
          </button>
        </div>
        <button
          type="button"
          className="discard-button"
          onClick={clearPlatforms}
          style={{ marginTop: "10px" }}
        >
          Clear Selections
        </button>
        <button
          type="button"
          className="discard-button"
          onClick={resetListing}
        >
          Discard Draft
        </button>
        <button
          type="button"
          className="ghost-link"
          style={{ marginTop: "6px" }}
          onClick={() => navigate("/drafts")}
        >
          View Saved Drafts
        </button>
      </div>
    </div>
  );
}

export default Welcome;
