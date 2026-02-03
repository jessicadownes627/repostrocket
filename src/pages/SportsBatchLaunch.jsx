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
  const [includeCorners, setIncludeCorners] = useState(true);
  const [saveCorners, setSaveCorners] = useState(false);
  const [analysisCount, setAnalysisCount] = useState(0);
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [finalizeInFlight, setFinalizeInFlight] = useState(false);
  const [completedActions, setCompletedActions] = useState({});

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
    () => (preparedPlatforms?.length ? preparedPlatforms : []),
    [preparedPlatforms]
  );
  const totalCards = cards.length;
  const progressFraction =
    totalCards > 0 ? Math.min(analysisCount / totalCards, 1) : 0;

  const togglePlatform = (id) => {
    setPreparedPlatforms((prev) => {
      const existing = prev || [];
      if (existing.includes(id)) {
        return existing.filter((entry) => entry !== id);
      }
      return [...existing, id];
    });
  };

  const hasSelectedPlatforms = activePlatforms.length > 0;
  const platformStatus = hasSelectedPlatforms
    ? `${activePlatforms.length} selected`
    : "none selected";

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

  const markMarketplaceDone = (cardId, platformId) => {
    if (!cardId || !platformId) return;
    setCompletedActions((prev) => ({
      ...(prev || {}),
      [cardId]: {
        ...(prev?.[cardId] || {}),
        [platformId]: true,
      },
    }));
  };

  const buildMarketplaceContent = (platformId, identity) => {
    const baseTitle = composeCardTitle(identity);
    const baseDescription = composeSportsDescription(identity);
    if (platformId === "whatnot") {
      const shortTitle = baseTitle ? baseTitle.split(" ").slice(0, 6).join(" ") : "";
      return {
        title: shortTitle || baseTitle,
        note: "Live-sale ready details",
        description: "",
      };
    }
    if (platformId === "mercari") {
      const title = baseTitle ? baseTitle.slice(0, 60) : "";
      return {
        title,
        description: baseDescription ? baseDescription.slice(0, 180) : "",
      };
    }
    if (platformId === "poshmark") {
      const title = baseTitle ? baseTitle.slice(0, 50) : "";
      return {
        title,
        description: baseDescription ? baseDescription.slice(0, 160) : "",
      };
    }
    const ebayTitle = baseTitle ? baseTitle.slice(0, 80) : "";
    return {
      title: ebayTitle,
      description: baseDescription ? baseDescription.slice(0, 220) : "",
    };
  };

  const handleGenerateListings = async () => {
    if (analysisInFlight || !cards.length) return;
    setAnalysisInFlight(true);
    setAnalysisCount(cards.length);
    setAnalysisInFlight(false);
    const anchor = document.getElementById("sports-batch-listings");
    if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const ebayLabel =
    PLATFORM_OPTIONS.find((option) => option.id === "ebay")?.label || "eBay";

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
          {cards.length} card{cards.length === 1 ? "" : "s"} ready • Platforms:{" "}
          {platformStatus} •{" "}
          {includeCorners ? "Corners available" : "Corners off"}
        </div>

        {cards.length === 0 ? (
          <div className="min-h-[50vh] flex items-center justify-center text-white/70 text-center">
            No sports batch items found. Start from Sports Card Suite → Batch.
          </div>
        ) : (
          <>
            <div className="lux-card border border-white/10 p-5 mb-6">
              <div className="text-xs uppercase tracking-[0.3em] text-white/50 mb-3">
                Where do you want to list?
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
                Listing image options
              </div>
              <div className="flex flex-col gap-4 text-sm text-white/70">
                <label className="flex items-center justify-between gap-4">
                  <span>Use cropped corners in listings</span>
                  <input
                    type="checkbox"
                    checked={includeCorners}
                    onChange={() => setIncludeCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <label className="flex items-center justify-between gap-4">
                  <span>Save corner images to camera roll</span>
                  <input
                    type="checkbox"
                    checked={saveCorners}
                    onChange={() => setSaveCorners((prev) => !prev)}
                    className="h-5 w-5 accent-[#E8DCC0]"
                  />
                </label>
                <div className="text-xs text-white/50">
                  Useful for records or manual uploads.
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center gap-4 mb-8">
              <button
                type="button"
                onClick={handleGenerateListings}
                disabled={!hasSelectedPlatforms}
                className={`px-6 py-3 rounded-full text-xs uppercase tracking-[0.25em] ${
                  hasSelectedPlatforms
                    ? "border border-[#E8DCC0] text-[#E8DCC0]"
                    : "border border-white/10 text-white/40 cursor-not-allowed"
                }`}
              >
                Create Listings
              </button>
              <button
                type="button"
                onClick={handleFinalizeBatch}
                className="px-6 py-3 rounded-full border border-white/20 text-white/70 text-xs uppercase tracking-[0.25em]"
              >
                Finalize Batch
              </button>
            </div>

            <div id="sports-batch-listings" className="grid gap-3">
              {cards.map((card) => {
                const cardState = cardStates[card.id] || {};
                const identity = cardState.identity || {};
                const title = composeCardTitle(identity);
                const frontSrc = card.frontImage?.url || "";
                const backSrc = card.backImage?.url || "";
                const isSlabbed = identity.isSlabbed === true;
                const frontCorners = !isSlabbed ? cardState.frontCorners || [] : [];
                const backCorners = !isSlabbed ? cardState.backCorners || [] : [];
                const setLabel = identity.setName || "Unknown set";
                const yearLabel = identity.year || "Unknown year";
                const teamSport =
                  identity.team || identity.sport
                    ? [identity.team, identity.sport].filter(Boolean).join(" · ")
                    : "Unknown team · sport";

                return (
                  <div
                    key={card.id}
                    className="lux-card border border-white/10 p-3 flex flex-wrap items-start gap-3"
                  >
                    <div className="relative shrink-0">
                      {frontSrc ? (
                        <img
                          src={frontSrc}
                          alt="Front"
                          className="h-24 w-16 rounded-md border border-white/10 object-cover"
                        />
                      ) : (
                        <div className="h-24 w-16 rounded-md border border-dashed border-white/15" />
                      )}
                      {backSrc && (
                        <img
                          src={backSrc}
                          alt="Back"
                          className="absolute -bottom-1 -right-1 h-10 w-10 rounded border border-white/20 object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs text-white/70 truncate">
                        {title || "Untitled card"}
                      </div>
                      <div className="text-sm text-white truncate">
                        {identity.player || "Unknown player"}
                      </div>
                      <div className="text-xs text-white/60 truncate">
                        {teamSport}
                      </div>
                      <div className="text-xs text-white/50 truncate">
                        {setLabel} · {yearLabel}
                      </div>
                      {(frontCorners.length || backCorners.length) ? (
                        <div className="mt-1 flex gap-1">
                          {frontCorners.slice(0, 4).map((corner, idx) => (
                            <img
                              key={`front-${card.id}-${idx}`}
                              src={corner.url || corner}
                              alt={`Front corner ${idx + 1}`}
                              className="h-5 w-5 rounded border border-white/10 object-cover"
                            />
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 grid gap-2">
                        {activePlatforms.map((platformId) => {
                          const label =
                            PLATFORM_OPTIONS.find(
                              (option) => option.id === platformId
                            )?.label || platformId;
                          const content = buildMarketplaceContent(
                            platformId,
                            identity
                          );
                          const exportLinks = buildListingExportLinks({
                            title: content.title,
                            description: content.description,
                            price: cardState.price
                              ? Number(cardState.price)
                              : undefined,
                          });
                          const openUrl =
                            platformId === "whatnot"
                              ? "https://www.whatnot.com/"
                              : exportLinks?.[platformId] || "";
                          const isDone =
                            completedActions?.[card.id]?.[platformId] === true;
                          return (
                            <div
                              key={`${card.id}-${platformId}`}
                              className="border border-white/10 rounded-md p-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-[10px] uppercase tracking-[0.25em] text-white/60">
                                  {label}
                                </div>
                                {isDone && (
                                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                                    Copied ✓
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-white/80 truncate">
                                {content.title || "—"}
                              </div>
                              {platformId === "whatnot" && content.note ? (
                                <div className="text-[10px] text-white/50 mt-1 truncate">
                                  {content.note}
                                </div>
                              ) : null}
                              {content.description ? (
                                <div
                                  className="text-[10px] text-white/50 mt-1 truncate"
                                >
                                  {content.description}
                                </div>
                              ) : null}
                              <div className="flex flex-wrap gap-2 mt-2">
                                <button
                                  type="button"
                                  className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                  onClick={() => {
                                    handleCopy(content.title);
                                    markMarketplaceDone(card.id, platformId);
                                  }}
                                >
                                  Copy {label} Title
                                </button>
                                {content.description ? (
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] border border-white/20 text-white/70 hover:text-white"
                                    onClick={() => {
                                      handleCopy(content.description);
                                      markMarketplaceDone(card.id, platformId);
                                    }}
                                  >
                                    Copy {label} Description
                                  </button>
                                ) : null}
                                {openUrl ? (
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.2em] border border-[#E8DCC0] text-[#E8DCC0]"
                                    onClick={() => {
                                      window.open(openUrl, "_blank", "noopener");
                                      markMarketplaceDone(card.id, platformId);
                                    }}
                                  >
                                    Open {label}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
