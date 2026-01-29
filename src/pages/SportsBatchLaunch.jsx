import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { buildListingExportLinks } from "../utils/exportListing";
import { db } from "../db/firebase";
import { doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";

const PLATFORM_OPTIONS = [
  { id: "ebay", label: "eBay" },
  { id: "mercari", label: "Mercari" },
  { id: "poshmark", label: "Poshmark" },
  { id: "whatnot", label: "Whatnot" },
];

const composeSportsDescription = (identity = {}) => {
  const parts = [];
  const year = identity.year ? String(identity.year).trim() : "";
  const brand = identity.brand ? String(identity.brand).trim() : "";
  const setName = identity.setName ? String(identity.setName).trim() : "";
  const player = identity.player ? String(identity.player).trim() : "";
  const sport = identity.sport ? String(identity.sport).trim() : "";
  const team = identity.team ? String(identity.team).trim() : "";

  const leadParts = [year, brand, setName, player].filter(Boolean);
  if (leadParts.length) {
    parts.push(`${leadParts.join(" ")} card.`);
  }
  const teamLine = [sport, team].filter(Boolean).join(" - ");
  if (teamLine) {
    parts.push(teamLine + ".");
  }
  parts.push("Condition as shown.");
  parts.push("Ships securely.");
  return parts.join(" ");
};

export default function SportsBatchLaunch() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    batchMeta,
    preparedPlatforms,
    setPreparedPlatforms,
    cardStates,
  } = useSportsBatchStore();
  const [activeFilter, setActiveFilter] = useState("all");
  const [includeCorners, setIncludeCorners] = useState(true);
  const [saveCorners, setSaveCorners] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [finalizeInFlight, setFinalizeInFlight] = useState(false);

  const cards = useMemo(() => {
    const allCards = Object.entries(cardStates || {}).map(([cardId, state]) => ({
      id: cardId,
      ...(state || {}),
    }));
    const includeIds = location?.state?.includeCardIds;
    if (Array.isArray(includeIds) && includeIds.length > 0) {
      return allCards.filter((card) => includeIds.includes(card.id));
    }
    return allCards;
  }, [cardStates, location?.state]);

  const activePlatforms = useMemo(
    () => (preparedPlatforms?.length ? preparedPlatforms : ["ebay"]),
    [preparedPlatforms]
  );
  const totalCards = cards.length;
  const progressFraction =
    totalCards > 0 ? Math.min(analysisCount / totalCards, 1) : 0;

  useEffect(() => {
    if (!preparedPlatforms?.length) {
      setPreparedPlatforms(["ebay"]);
    }
  }, [preparedPlatforms?.length, setPreparedPlatforms]);

  const togglePlatform = (id) => {
    setPreparedPlatforms((prev) => {
      const existing = prev || [];
      if (existing.includes(id)) {
        return existing.filter((entry) => entry !== id);
      }
      return [...existing, id];
    });
  };

  const visiblePlatforms =
    activeFilter === "all"
      ? activePlatforms
      : activePlatforms.filter((id) => id === activeFilter);

  const renderThumbnail = (src, alt) => {
    if (!src) {
      return (
        <div className="h-14 w-14 rounded-lg border border-dashed border-white/15" />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className="h-14 w-14 rounded-lg border border-white/10 object-cover"
      />
    );
  };

  const handleCopy = async (value) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const handleGenerateListings = async () => {
    if (analysisInFlight || !cards.length) return;
    setAnalysisInFlight(true);
    setAnalysisCount(cards.length);
    setAnalysisInFlight(false);
    const anchor = document.getElementById("sports-batch-listings");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleFinalizeBatch = async () => {
    if (finalizeInFlight || !cards.length) return;
    const batchId = batchMeta?.id;
    if (!batchId) return;
    setFinalizeInFlight(true);
    try {
      await Promise.all(
        cards.map(async (card) => {
          const cardId = card.id;
          const cardState = cardStates[card.id] || {};
          const frontUploadId = card.frontImage?.id || null;
          const backUploadId = card.backImage?.id || null;
          await setDoc(
            doc(db, "batches", batchId, "cards", cardId),
            {
              batchId,
              frontUploadId,
              backUploadId,
              reviewIdentity: cardState.identity || {},
              title: cardState.title || "",
              description: cardState.description || "",
              status: "ready",
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
          const uploadUpdates = {
            paired: true,
            cardId,
            locked: true,
          };
          if (frontUploadId) {
            await updateDoc(
              doc(db, "batches", batchId, "uploads", frontUploadId),
              uploadUpdates
            );
          }
          if (backUploadId) {
            await updateDoc(
              doc(db, "batches", batchId, "uploads", backUploadId),
              uploadUpdates
            );
          }
        })
      );
      await updateDoc(doc(db, "batches", batchId), {
        status: "launched",
        pairedCards: cards.length,
        launchedAt: serverTimestamp(),
      });
      navigate("/sports-cards");
    } catch (err) {
      console.error("Failed to finalize batch", err);
    } finally {
      setFinalizeInFlight(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-6xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-batch-review")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Your listings are ready
        </h1>
        <p className="text-center text-white/70 text-sm">
          Copy details or open them directly on each platform.
        </p>
        <div className="max-w-md mx-auto mt-4 mb-6">
          <div className="h-1 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-[#E8DCC0]/70 transition-all duration-500"
              style={{ width: `${Math.max(progressFraction * 100, 6)}%` }}
            />
          </div>
        </div>
        <div className="text-center text-white/60 text-sm mb-8">
          {cards.length} cards · Platforms: {activePlatforms.join(", ") || "eBay"}
          {includeCorners ? " · Corners included" : " · Corners off"}
        </div>

        <div className="flex justify-center mb-4">
          <button
            type="button"
            onClick={handleGenerateListings}
            className="px-6 py-3 rounded-full border border-[#E8DCC0] text-[#E8DCC0] text-xs uppercase tracking-[0.25em]"
          >
            Create listings
          </button>
        </div>
        <div className="flex justify-center mb-8">
          <button
            type="button"
            onClick={handleFinalizeBatch}
            className="px-6 py-3 rounded-full border border-white/20 text-white/70 text-xs uppercase tracking-[0.25em]"
          >
            Finalize batch
          </button>
        </div>

        {cards.length === 0 ? (
          <div className="min-h-[50vh] flex items-center justify-center text-white/70 text-center">
            No sports batch items found. Start from Sports Card Suite → Batch.
          </div>
        ) : (
          <>
            <div className="lux-card border border-white/10 p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Prepare platforms
              </div>
              <div className="flex flex-wrap gap-3">
                {PLATFORM_OPTIONS.map((platform) => {
                  const active = activePlatforms.includes(platform.id);
                  return (
                    <button
                      key={platform.id}
                      type="button"
                      className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                        active
                          ? "border-[#E8DCC0] text-[#E8DCC0]"
                          : "border-white/20 text-white/60"
                      }`}
                      onClick={() => togglePlatform(platform.id)}
                    >
                      {platform.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lux-card border border-white/10 p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Listing images
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/70">
                <label className="flex items-center justify-between gap-4">
                  <span>Use cropped corners in listings?</span>
                  <input
                    type="checkbox"
                    checked={includeCorners}
                    onChange={() => setIncludeCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>Save corner images?</span>
                  <input
                    type="checkbox"
                    checked={saveCorners}
                    onChange={() => setSaveCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <div className="text-xs text-white/50">
                  You can download them later if needed.
                </div>
              </div>
            </div>

            <div className="lux-card border border-white/10 p-5 mb-8">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Show
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                    activeFilter === "all"
                      ? "border-[#E8DCC0] text-[#E8DCC0]"
                      : "border-white/20 text-white/60"
                  }`}
                  onClick={() => setActiveFilter("all")}
                >
                  All
                </button>
                {activePlatforms.map((platformId) => {
                  const label =
                    PLATFORM_OPTIONS.find((option) => option.id === platformId)
                      ?.label || platformId;
                  return (
                    <button
                      key={platformId}
                      type="button"
                      className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border ${
                        activeFilter === platformId
                          ? "border-[#E8DCC0] text-[#E8DCC0]"
                          : "border-white/20 text-white/60"
                      }`}
                      onClick={() => setActiveFilter(platformId)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div id="sports-batch-listings" className="grid gap-6">
              {cards.map((card) => {
                const cardState = cardStates[card.id] || {};
                const identity = cardState.identity || {};
                const title = composeCardTitle(identity);
                const description = composeSportsDescription(identity);
                const frontSrc = card.frontImage?.url || "";
                const backSrc = card.backImage?.url || "";
                const isSlabbed = identity.isSlabbed === true;
                const frontCorners = !isSlabbed ? cardState.frontCorners || [] : [];
                const backCorners = !isSlabbed ? cardState.backCorners || [] : [];
                const showCorners = includeCorners && !isSlabbed;

                const exportLinks = buildListingExportLinks({
                  title,
                  description,
                  price: cardState.price ? Number(cardState.price) : undefined,
                });

                return (
                  <div key={card.id} className="lux-card border border-white/10 p-5">
                    <div className="flex flex-col gap-2 mb-4">
                      <div className="text-sm uppercase tracking-[0.25em] text-white/50">
                        Card
                      </div>
                      <div className="text-lg text-white">
                        {title || "Untitled card"}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3 mb-5">
                      {renderThumbnail(frontSrc, "Front")}
                      {renderThumbnail(backSrc, "Back")}
                    </div>
                    {showCorners && (frontCorners.length || backCorners.length) ? (
                      <div className="grid gap-3 mb-5">
                        <div className="grid grid-cols-4 gap-3">
                          {frontCorners.slice(0, 4).map((corner, idx) => (
                            <img
                              key={`front-${item.id}-${idx}`}
                              src={corner.url || corner}
                              alt={`Front corner ${idx + 1}`}
                              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                            />
                          ))}
                          {backCorners.slice(0, 4).map((corner, idx) => (
                            <img
                              key={`back-${item.id}-${idx}`}
                              src={corner.url || corner}
                              alt={`Back corner ${idx + 1}`}
                              className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4">
                      {visiblePlatforms.map((platformId) => {
                        const label =
                          PLATFORM_OPTIONS.find((option) => option.id === platformId)
                            ?.label || platformId;
                        const launchUrl = exportLinks?.[platformId] || "";
                        return (
                          <div
                            key={platformId}
                            className="border border-white/10 rounded-xl p-4"
                          >
                            <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                              {label}
                            </div>
                            <div className="flex flex-wrap gap-3">
                              <button
                                type="button"
                                className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                onClick={() => handleCopy(title)}
                              >
                                Copy title
                              </button>
                              <button
                                type="button"
                                className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                onClick={() => handleCopy(description)}
                              >
                                Copy description
                              </button>
                              {launchUrl && (
                                <button
                                  type="button"
                                  className="px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border border-[#E8DCC0] text-[#E8DCC0]"
                                  onClick={() => window.open(launchUrl, "_blank", "noopener")}
                                >
                                  Open {label}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
