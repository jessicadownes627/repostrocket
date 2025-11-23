import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { getPlatformDescriptions } from "../utils/descriptions";
import { generatePlatformTitles } from "../utils/titles";
import { getVariantForPlatform } from "../config/platformImageSettings";
import { generatePlatformTags } from "../utils/tagGenerator";
import CopyButton from "../components/CopyButton";
import { TAG_CONFIG } from "../config/platformTagSettings";
import { platformLinks, formatTagPreview } from "../utils/platformFormatting";
import JSZip from "jszip";
import "../styles/launchpad.css";
import "../styles/launchloading.css";

function LoadingView() {
  return (
    <div className="launchloading-shell inline-loading">
      <div className="launchloading-grid">
        <div className="launch-glow launch-glow--one" />
        <div className="launch-glow launch-glow--two" />
        <div className="rocket-stack">
          <div className="rocket-icon">
            <svg viewBox="0 0 64 64" aria-hidden="true" className="rocket-svg">
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
          <p className="launch-hero">Preparing your launch</p>
          <p className="launch-sub">Optimizing descriptions for each marketplace…</p>
          <div className="launch-progress">
            <div className="launch-progress-bar" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Launchpad() {
  const navigate = useNavigate();
  const { selectedPlatforms, listingData, resetListing, setListingField } = useListingStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!selectedPlatforms.length) {
      navigate("/welcome");
    }
  }, [selectedPlatforms, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  const platformDescriptions = useMemo(
    () => getPlatformDescriptions(listingData, selectedPlatforms),
    [listingData, selectedPlatforms]
  );

  const platformTitles = useMemo(
    () => generatePlatformTitles(listingData),
    [listingData]
  );

  const platformTags = useMemo(() => generatePlatformTags(listingData), [listingData]);

  useEffect(() => {
    // persist tags in store for draft restore
    if (listingData) {
      setListingField("tags", platformTags);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(platformTags)]);

  const handleOpenMarketplace = (platform) => {
    const url = platformLinks[platform.toLowerCase()];
    if (url) {
      window.open(url, "_blank");
    }
  };

  const downloadZip = async (platform) => {
    const variantKey = getVariantForPlatform(platform);
    const images = listingData.resizedPhotos?.[variantKey] || [];
    if (!images.length) {
      alert("No optimized photos available for this platform yet.");
      return;
    }
    try {
      const zip = new JSZip();
      images.forEach((src, idx) => {
        const base64 = src.split(",")[1];
        zip.file(`${platform}-${idx + 1}.jpg`, base64, { base64: true });
      });
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${platform}-photos.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Zip download failed", err);
      alert("Could not create zip. Please try again or download images manually.");
    }
  };

  const startOver = () => {
    resetListing();
    navigate("/welcome");
  };

  if (isLoading) {
    return <LoadingView />;
  }

  return (
    <div className="launch-page">
      <div className="launch-shell">
        <div className="launch-header">
          <div>
            <p className="launch-eyebrow">Step 3</p>
            <h1>Your Listing Is Ready</h1>
            <p className="launch-subtitle">Copy your details and launch to each platform.</p>
          </div>
        </div>

        <div className="platform-grid">
          {selectedPlatforms.map((platform) => {
            const key = platform.toLowerCase();
            const entry = platformDescriptions[key] || { title: listingData.title, description: listingData.description };
            const titleText = listingData.title || platformTitles[key] || listingData.title;
            const variant = getVariantForPlatform(platform);
            const previews = listingData.resizedPhotos?.[variant] || [];
            const tags = platformTags[key];
            const tagConfig = TAG_CONFIG[key] || { type: "none" };
            const tagPreview = formatTagPreview(tags, tagConfig.type);
            return (
              <div key={platform} className="platform-card">
                <div className="platform-top">
                  <h3>{platform}</h3>
                </div>
                <div className="platform-body">
                  {previews.length > 0 && (
                    <div className="preview-block">
                      <div className="field-label">Preview</div>
                      <img className="main-preview" src={previews[0]} alt={`${platform} preview`} />
                      {previews.length > 1 && (
                        <div className="thumb-grid">
                          {previews.slice(1).map((src, idx) => (
                            <img key={`${platform}-thumb-${idx}`} src={src} alt={`${platform} ${idx + 2}`} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="field-block">
                    <div className="field-label">Title</div>
                    <div className="field-text">{titleText}</div>
                    <CopyButton text={titleText} label="Copy Title" />
                  </div>

                  <div className="field-block">
                    <div className="field-label">Description</div>
                    <div className="field-text">{entry.description}</div>
                    <CopyButton text={entry.description} label="Copy Description" />
                  </div>

                  {tagConfig.type !== "none" && tags && (
                    <div className="field-block">
                      <div className="field-label">Tags</div>
                      <div className="tag-preview">{tagPreview}</div>
                      <CopyButton
                        text={tagConfig.type === "hashtags" ? (tags || []).join(" ") : tagPreview}
                        label="Copy Tags"
                      />
                    </div>
                  )}

                  <div className="field-block">
                    <div className="field-label">Optimized Photos</div>
                    <button type="button" className="open-btn" onClick={() => downloadZip(platform)}>
                      Download Optimized Photos
                    </button>
                  </div>

                  <div className="field-block">
                    <button
                      type="button"
                      className="open-btn primary-open"
                      onClick={() => handleOpenMarketplace(platform)}
                    >
                      {`Open ${platform}`}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="launch-footer">
          <button type="button" className="btn-primary reset-btn" onClick={startOver}>
            Start New Listing
          </button>
        </div>
      </div>
    </div>
  );
}

export default Launchpad;
