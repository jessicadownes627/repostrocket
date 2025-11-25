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
      <div className="welcome-card">
        <p className="welcome-eyebrow" style={{ textAlign: "center", width: "100%" }}>
          Welcome to RepostRocket 🚀
        </p>
        <h2 className="step-title glitter-text">Choose Your Selling Platforms</h2>
       <p className="welcome-subtitle">
  Choose all marketplaces you’d like to list on.<br />
  Repost Rocket handles formatting across every platform.
</p>
        <p className="welcome-disclaimer">
          You’ll need active accounts on any marketplaces you choose.
        </p>

        <div className="platform-grid">
          {platformOptions.map((p) => {
            const isActive = normalizedSelected.includes(p.id);
            return (
              <button
                key={p.id}
                className={`platform-card ${isActive ? "active" : ""}`}
                onClick={() => togglePlatform(p.id)}
                type="button"
              >
                <div className="platform-row-left">
                  <span className="platform-label">{p.name}</span>
                </div>
                <div className={`platform-checkbox ${isActive ? "on" : ""}`}>
                  {isActive ? "✓" : ""}
                </div>
              </button>
            );
          })}
        </div>

        <div className="cta-hero">
          <button
            className="btn-glass-gold"
            onClick={handleContinue}
            disabled={!hasSelection}
            style={{ opacity: hasSelection ? 1 : 0.5 }}
          >
            Continue → Create Your Listing
          </button>
        </div>
        <div className="platform-actions">
          <button
            type="button"
            className="select-all-platforms-btn"
            onClick={selectAllPlatforms}
            style={{ width: "100%" }}
          >
            Select All Platforms
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
