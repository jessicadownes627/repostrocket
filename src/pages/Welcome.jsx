import { useNavigate } from "react-router-dom";
import "../styles/welcome.css";
import { useListingStore } from "../store/useListingStore";

const platforms = [
  "eBay",
  "Mercari",
  "Etsy",
  "Poshmark",
  "Depop",
  "Facebook Marketplace",
  "Kidizen",
  "Vinted",
  "Grailed",
  "Shopify",
];

function Welcome() {
  const { selectedPlatforms, setSelectedPlatforms, resetListing } = useListingStore();
  const navigate = useNavigate();

  const togglePlatform = (platform) => {
    setSelectedPlatforms(
      selectedPlatforms.includes(platform)
        ? selectedPlatforms.filter((p) => p !== platform)
        : [...selectedPlatforms, platform]
    );
  };

  const toggleSelectAll = () => {
    if (selectedPlatforms.length === platforms.length) {
      setSelectedPlatforms([]);
    } else {
      setSelectedPlatforms(platforms);
    }
  };

  const handleContinue = () => {
    navigate("/create");
  };

  const allSelected = selectedPlatforms.length === platforms.length;
  const hasSelection = selectedPlatforms.length > 0;

  return (
    <div className="welcome-page">
      <div className="welcome-card">
        <p className="welcome-eyebrow">Welcome to RepostRocket 🚀</p>
        <h1 className="welcome-headline">One Listing. Launch Everywhere.</h1>
        <p className="welcome-sub">
          Select where you want to sell, create your listing once, and
          RepostRocket will guide you through launching it across every
          marketplace you choose.
        </p>

        <div className="checklist-card">

          <div className="checklist-grid">
            {platforms.map((platform) => (
              <label key={platform} className="checklist-item">
                <input
                  type="checkbox"
                  checked={selectedPlatforms.includes(platform)}
                  onChange={() => togglePlatform(platform)}
                />
                <span>{platform}</span>
              </label>
            ))}
          </div>

          <div className="checklist-footer">
            <button type="button" className="ghost-link" onClick={toggleSelectAll}>
              {allSelected ? "Clear all" : "Select all"}
            </button>
          </div>
        </div>

        <button
          className="btn-primary welcome-cta"
          onClick={handleContinue}
          disabled={!hasSelection}
          style={{ opacity: hasSelection ? 1 : 0.5 }}
        >
          Continue →
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
