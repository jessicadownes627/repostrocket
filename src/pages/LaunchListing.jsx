import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { buildCardTitle } from "../utils/buildCardTitle";
import { composeCardTitle } from "../utils/composeCardTitle";
import { shareImage, getImageSaveLabel } from "../utils/saveImage";

export default function LaunchListing() {
  const { listingData, reviewIdentity } = useListingStore();
  const saveImageLabel = getImageSaveLabel();
  const navigate = useNavigate();

  const {
    title: rawTitle = "",
    description = "",
    price: rawPrice = "",
    cardAttributes = null,
    cornerPhotos = [],
  } = listingData || {};

  const pricing = cardAttributes?.pricing || null;
  const suggestedPrice =
    (pricing && pricing.suggestedListPrice) || rawPrice || "";

  const baseTitle = useMemo(() => {
    if (reviewIdentity) {
      const identityTitle = composeCardTitle(reviewIdentity);
      if (identityTitle) return identityTitle;
    }
    if (cardAttributes) {
      const cardTitle = buildCardTitle(cardAttributes);
      if (cardTitle) return cardTitle;
    }
    return rawTitle;
  }, [rawTitle, cardAttributes, reviewIdentity]);

  const ebayTitle = useMemo(() => {
    if (!baseTitle) return "";
    return baseTitle.slice(0, 80);
  }, [baseTitle]);

  const mercariTitle = useMemo(() => {
    if (!baseTitle) return "";
    return baseTitle.slice(0, 60);
  }, [baseTitle]);

  const poshmarkTitle = useMemo(() => {
    if (!baseTitle) return "";
    return baseTitle.slice(0, 50);
  }, [baseTitle]);

  const fullPriceString = suggestedPrice
    ? `$${String(suggestedPrice)}`
    : "";

  const summaryDescription = useMemo(() => {
    if (description && description.length > 0) return description;
    if (reviewIdentity) {
      const identityLines = [
        reviewIdentity.player && `Player: ${reviewIdentity.player}`,
        reviewIdentity.setName && `Set: ${reviewIdentity.setName}`,
        reviewIdentity.year && `Year: ${reviewIdentity.year}`,
        reviewIdentity.team && `Team: ${reviewIdentity.team}`,
        reviewIdentity.sport && `Sport: ${reviewIdentity.sport}`,
      ].filter(Boolean);
      if (identityLines.length) {
        return identityLines.join("\n");
      }
    }
    if (cardAttributes?.grading) {
      const g = cardAttributes.grading;
      return [
        g.centering && `Centering: ${g.centering}`,
        g.corners && `Corners: ${g.corners}`,
        g.edges && `Edges: ${g.edges}`,
        g.surface && `Surface: ${g.surface}`,
      ]
        .filter(Boolean)
        .join("\n");
    }
    return "";
  }, [description, cardAttributes, reviewIdentity]);

  const copyText = (text) => {
    if (!text) return;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  const copyAll = () => {
    const lines = [];
    if (baseTitle) lines.push(baseTitle);
    if (fullPriceString) lines.push(`Price: ${fullPriceString}`);
    if (summaryDescription) {
      lines.push("");
      lines.push(summaryDescription);
    }
    copyText(lines.join("\n"));
  };

  const encodedTitle = encodeURIComponent(baseTitle || "");
  const handleDownloadCorners = async () => {
    if (!cornerPhotos.length) return;
    const payload = cornerPhotos
      .filter((entry) => entry?.url)
      .map((entry, idx) => ({
        dataUrl: entry.url,
        filename:
          entry.label?.toLowerCase().replace(/\s+/g, "-") ||
          `corner-${idx + 1}.jpg`,
      }));
    if (!payload.length) return;
    await shareImage(payload, {
      filename: "corner-photo.jpg",
      title: baseTitle || "Corner inspection photos",
      text: "Saved from Repost Rocket",
    });
  };

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] text-[var(--lux-text)] px-6 py-10">
        <div className="max-w-3xl mx-auto">
        <h1 className="sparkly-header text-[28px] mb-2 text-center">
          Magic Listing Launcher
        </h1>
        <div className="opacity-60 text-center text-sm mt-[-6px] mb-4">
          Your listing, perfectly formatted for every marketplace.
        </div>

        <div className="magic-cta-bar mb-8">
          Launch this listing across marketplaces in seconds.
        </div>

        <div className="text-center mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 px-5 py-2 border border-white/25 rounded-full text-xs tracking-[0.3em] text-white/80 hover:bg-white/10 transition"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
        </div>

        <div className="lux-card space-y-5">
          {/* Suggested price */}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
              Suggested Price
            </div>
            <div className="text-xl font-semibold">
              {fullPriceString || "—"}
            </div>
            {pricing?.confidence && (
              <div className="text-xs opacity-70 mt-1">
                Confidence: {pricing.confidence}
              </div>
            )}
            <div className="opacity-50 text-xs mt-1">
              Based on grading details and recent sales indicators.
            </div>
          </div>

          {/* eBay */}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
              eBay Title
            </div>
            <div className="opacity-50 text-xs mt-1 mb-1">
              Optimized for eBay’s 80-character search ranking.
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm opacity-90 break-words">
                {ebayTitle || "—"}
              </div>
              <button
                className="lux-small-btn"
                onClick={() => copyText(ebayTitle)}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Mercari */}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
              Mercari Title
            </div>
            <div className="opacity-50 text-xs mt-1 mb-1">
              Shorter titles convert better on Mercari.
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm opacity-90 break-words">
                {mercariTitle || "—"}
              </div>
              <button
                className="lux-small-btn"
                onClick={() => copyText(mercariTitle)}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Poshmark */}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
              Poshmark Title
            </div>
            <div className="opacity-50 text-xs mt-1 mb-1">
              Best results when kept clean + under 50 characters.
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 text-sm opacity-90 break-words">
                {poshmarkTitle || "—"}
              </div>
              <button
                className="lux-small-btn"
                onClick={() => copyText(poshmarkTitle)}
              >
                Copy
              </button>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
              Description
            </div>
            <div className="opacity-50 text-xs mt-1 mb-1">
              A clean summary to paste directly into your draft.
            </div>
            <div className="flex items-start gap-2">
              <pre className="flex-1 text-sm opacity-90 whitespace-pre-wrap break-words bg-black/40 border border-[rgba(255,255,255,0.12)] rounded-xl p-3">
                {summaryDescription || "—"}
              </pre>
              <button
                className="lux-small-btn mt-1"
                onClick={() => copyText(summaryDescription)}
              >
                Copy
              </button>
            </div>
          </div>

          {cornerPhotos.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-[0.18em] opacity-70 mb-1">
                Corner Detail Photos
              </div>
              <div className="opacity-50 text-xs mt-1 mb-2">
                Optional detail shots you can upload to any marketplace.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cornerPhotos.map((entry, idx) => (
                  <div
                    key={`${entry.label}-${idx}`}
                    className="rounded-xl border border-[rgba(255,255,255,0.12)] overflow-hidden bg-black/30"
                  >
                    <img
                      src={entry.url}
                      alt={entry.altText || entry.label}
                      className="w-full h-24 object-cover"
                    />
                    <div className="text-[10px] uppercase tracking-[0.25em] text-center py-1 opacity-70">
                      {entry.label || `Corner ${idx + 1}`}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="lux-small-btn mt-3"
                onClick={handleDownloadCorners}
              >
                {saveImageLabel}
              </button>
            </div>
          )}

          {/* Copy All */}
          <div className="pt-2 border-t border-[rgba(255,255,255,0.12)] mt-2 flex justify-between items-center">
            <div className="text-xs opacity-70">
              Copy everything into your draft in one tap.
              <div className="opacity-50 text-xs mt-1">
                Perfect for eBay, Mercari, Poshmark, or Facebook listings.
              </div>
            </div>
            <button className="lux-small-btn" onClick={copyAll}>
              Copy All
            </button>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              className="lux-small-btn"
              onClick={() => {
                if (!encodedTitle) return;
                window.open(
                  `https://www.ebay.com/sch/i.html?_nkw=${encodedTitle}`,
                  "_blank"
                );
              }}
            >
              Open eBay Search
            </button>
            <button
              className="lux-small-btn"
              onClick={() => {
                if (!encodedTitle) return;
                window.open(
                  `https://www.mercari.com/search/?keyword=${encodedTitle}`,
                  "_blank"
                );
              }}
            >
              Open Mercari Search
            </button>
            <button
              className="lux-small-btn"
              onClick={() => {
                if (!encodedTitle) return;
                window.open(
                  `https://poshmark.com/search?query=${encodedTitle}`,
                  "_blank"
                );
              }}
            >
              Open Poshmark Search
            </button>
          </div>

          <div className="mt-8 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="lux-quiet-btn uppercase tracking-[0.35em] text-[11px] px-6 py-3 hover:opacity-100 opacity-80"
            >
              ← Back to Home
            </button>
          </div>
        </div>
        </div>
      </div>
    </>
  );
}
