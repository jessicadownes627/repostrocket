import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { analyzeCardImages, buildCornerPreviewFromEntries } from "../utils/cardIntelClient";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename, photoEntryToDataUrl } from "../utils/photoHelpers";

const identityRows = [
  { key: "player", label: "Player" },
  { key: "year", label: "Year" },
  { key: "brand", label: "Brand" },
  { key: "setName", label: "Set" },
  { key: "team", label: "Team" },
  { key: "sport", label: "Sport" },
];

const resolveGradeLabel = (identity = {}) => {
  const gradeValue =
    identity?.grade && typeof identity.grade === "object"
      ? identity.grade.value
      : identity?.grade || "";
  const gradeScale =
    identity?.isSlabbed && identity?.grader
      ? identity.grader
      : identity?.grade && typeof identity.grade === "object"
      ? identity.grade.scale
      : identity?.grader || "";
  if (identity?.isSlabbed) {
    return gradeValue ? [gradeScale, gradeValue].filter(Boolean).join(" ") : "Graded";
  }
  return gradeValue
    ? [identity?.condition, gradeValue].filter(Boolean).join(" ")
    : "";
};

const composeIdentityDescription = (identity = {}) => {
  const gradeLabel = resolveGradeLabel(identity);
  const lines = [
    identity.player && `Player: ${identity.player}`,
    identity.brand && `Brand: ${identity.brand}`,
    identity.setName && `Set: ${identity.setName}`,
    identity.year && `Year: ${identity.year}`,
    identity.team && `Team: ${identity.team}`,
    identity.sport && `Sport: ${identity.sport}`,
    gradeLabel && `Condition: ${gradeLabel}`,
  ].filter(Boolean);
  return lines.join("\n");
};

const isQualityPlayerName = (value) => {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim();
  if (trimmed.length < 5) return false;
  if (/\d/.test(trimmed)) return false;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return false;
  if (tokens.some((token) => token.length < 2)) return false;
  if (/(^|\s)[A-Za-z]{1}($|\s)/.test(trimmed)) return false;
  return true;
};

export default function SportsBatchReview() {
  const navigate = useNavigate();
  const { batchItems, updateBatchItem, setBatch } = useSportsBatchStore();
  const [openCornerId, setOpenCornerId] = useState(null);
  const [openDescriptionId, setOpenDescriptionId] = useState(null);
  const [editCardId, setEditCardId] = useState(null);
  const [undoToast, setUndoToast] = useState(null);
  const undoTimerRef = useRef(null);
  const [editDraft, setEditDraft] = useState({
    player: "",
    year: "",
    brand: "",
    setName: "",
    team: "",
    sport: "",
  });
  const inFlightRef = useRef(new Set());

  const items = useMemo(() => batchItems || [], [batchItems]);

  const handleToggleCorners = (id) => {
    setOpenCornerId((prev) => (prev === id ? null : id));
  };

  const handleToggleDescription = (id) => {
    setOpenDescriptionId((prev) => (prev === id ? null : id));
  };

  const openEditModal = (item) => {
    const identity = item.reviewIdentity || {};
    setEditDraft({
      player: identity.player || "",
      year: identity.year || "",
      brand: identity.brand || "",
      setName: identity.setName || "",
      team: identity.team || "",
      sport: identity.sport || "",
    });
    setEditCardId(item.id);
  };

  const closeEditModal = () => {
    setEditCardId(null);
  };

  const handleEditSave = () => {
    if (!editCardId) return;
    updateBatchItem(editCardId, (prev) => {
      const identity = prev?.reviewIdentity || {};
      const nextIdentity = { ...identity };
      const nextSources = { ...(identity._sources || {}) };
      Object.entries(editDraft).forEach(([key, value]) => {
        const trimmed = String(value || "").trim();
        if (!trimmed) return;
        nextIdentity[key] = trimmed;
        nextSources[key] = "manual";
      });
      nextIdentity._sources = nextSources;
      return { ...prev, reviewIdentity: nextIdentity };
    });
    setEditCardId(null);
  };

  const prepareEntry = async (file) => {
    const processed = await convertHeicIfNeeded(file);
    const usable = processed instanceof File ? processed : file;
    const url = URL.createObjectURL(usable);
    const altText = deriveAltTextFromFilename(usable?.name) || "card back photo";
    return { url, altText, file: usable };
  };

  const handleBackUpload = async (item, fileList) => {
    if (!item?.id || !fileList?.length) return;
    const file = Array.from(fileList)[0];
    try {
      const backPhoto = await prepareEntry(file);
      const analysisFront = item.analysisImages?.front?.url
        ? item.analysisImages.front.url
        : item.frontImage
        ? await photoEntryToDataUrl(item.frontImage)
        : "";
      const analysisBack = await photoEntryToDataUrl(backPhoto);
      const analysisImages = {
        front: analysisFront
          ? { url: analysisFront, altText: item.frontImage?.altText || "card front" }
          : null,
        back: analysisBack
          ? { url: analysisBack, altText: backPhoto.altText || "card back" }
          : null,
      };
      const identity = item.reviewIdentity || {};
      const isSlabbed = identity.isSlabbed === true || item.cardType === "slabbed";
      let frontCorners = Array.isArray(item.frontCorners) ? item.frontCorners : [];
      let backCorners = Array.isArray(item.backCorners) ? item.backCorners : [];
      let cornerPhotos = Array.isArray(item.cornerPhotos) ? item.cornerPhotos : [];
      let status = "needs_attention";

      if (!isSlabbed && item.frontImage) {
        const preview = await buildCornerPreviewFromEntries(item.frontImage, backPhoto);
        if (preview?.entries?.length) {
          const split = splitCornerEntries(preview.entries);
          frontCorners = split.front;
          backCorners = split.back;
          cornerPhotos = preview.entries;
          if (frontCorners.length >= 4) {
            status = "ready";
          }
        }
      } else if (isSlabbed) {
        status = "ready";
      }

      updateBatchItem(item.id, {
        backImage: backPhoto,
        secondaryPhotos: [backPhoto],
        frontCorners,
        backCorners,
        cornerPhotos,
        analysisImages,
        status,
      });
    } catch (err) {
      console.error("Failed to attach back photo", err);
    }
  };

  const clearUndoToast = () => {
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setUndoToast(null);
  };

  const handleRemoveCard = (item) => {
    if (!item?.id) return;
    const index = batchItems.findIndex((entry) => entry.id === item.id);
    if (index < 0) return;
    const snapshot = { item, index };
    setBatch(batchItems.filter((entry) => entry.id !== item.id));
    setUndoToast(snapshot);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      clearUndoToast();
    }, 4000);
  };

  const handleUndoRemove = () => {
    if (!undoToast?.item) return;
    const next = [...batchItems];
    next.splice(undoToast.index, 0, undoToast.item);
    setBatch(next);
    clearUndoToast();
  };

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  const splitCornerEntries = (entries) => {
    const front = [];
    const back = [];
    entries.forEach((entry) => {
      if (entry.side === "Front") front.push(entry);
      if (entry.side === "Back") back.push(entry);
    });
    return { front, back };
  };

  const handleRecrop = async (item) => {
    if (!item?.frontImage || !item?.backImage) return;
    try {
      const preview = await buildCornerPreviewFromEntries(
        item.frontImage,
        item.backImage
      );
      if (!preview?.entries?.length) return;
      const split = splitCornerEntries(preview.entries);
      updateBatchItem(item.id, {
        frontCorners: split.front,
        backCorners: split.back,
        cornerPhotos: preview.entries,
        status:
          split.front.length >= 4 ? "ready" : "needs_attention",
      });
    } catch (err) {
      console.error("Failed to recrop corners", err);
    }
  };

  const renderThumbnail = (src, alt) => {
    if (!src) {
      return (
        <div className="h-16 w-16 rounded-lg border border-dashed border-white/20" />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className="h-16 w-16 rounded-lg border border-white/10 object-cover"
      />
    );
  };

  useEffect(() => {
    const runAnalysisForCard = async (item) => {
      if (!item?.id) return;
      if (item.analysisStatus === "complete" || item.cardIntelResolved) return;
      if (item.reviewIdentity?.player) return;
      if (inFlightRef.current.has(item.id)) return;
      inFlightRef.current.add(item.id);
      updateBatchItem(item.id, { analysisStatus: "analyzing" });

      try {
        const front = item.analysisImages?.front || item.frontImage || item.photos?.[0] || null;
        if (!front) return;
        let analysisImages = item.analysisImages || null;
        if (!analysisImages) {
          const frontDataUrl = await photoEntryToDataUrl(front);
          if (!frontDataUrl) {
            updateBatchItem(item.id, { analysisStatus: "error", cardIntelResolved: true });
            return;
          }
          analysisImages = {
            front: { url: frontDataUrl, altText: front.altText || "card front" },
            back: null,
          };
          updateBatchItem(item.id, { analysisImages });
        }
        const stableFront = analysisImages?.front || front;
        const stableBack = analysisImages?.back || null;
        const intel = await analyzeCardImages(
          {
            photos: [stableFront],
            secondaryPhotos: stableBack ? [stableBack] : [],
          },
          {
            requestId: `analysis-${Date.now()}-${item.id}`,
            includeBackImage: Boolean(stableBack),
            disableCrops: true,
            includeNameZones: true,
            frontDataUrl: analysisImages?.front?.url || null,
            backDataUrl: analysisImages?.back?.url || null,
          }
        );
        if (!intel || intel.error) {
          updateBatchItem(item.id, { analysisStatus: "error", cardIntelResolved: true });
          return;
        }
        const mergeIdentity = (base, incoming) => {
          const next = { ...(base || {}) };
          Object.entries(incoming || {}).forEach(([key, value]) => {
            if (key === "_sources") return;
            if (value === "" || value === null || value === undefined) return;
            if (next[key] !== undefined && next[key] !== null && next[key] !== "") return;
            next[key] = value;
          });
          next._sources = { ...(next._sources || {}), ...(incoming?._sources || {}) };
          return next;
        };
        const initialIdentity = mergeIdentity(item.reviewIdentity, intel);
        const gradeValue =
          initialIdentity?.grade && typeof initialIdentity.grade === "object"
            ? initialIdentity.grade.value
            : initialIdentity?.grade;
        initialIdentity.isSlabbed = Boolean(initialIdentity?.grader && gradeValue);
        const composedTitle = composeCardTitle(initialIdentity);
        const composedDescription = composeIdentityDescription(initialIdentity);
        updateBatchItem(item.id, {
          reviewIdentity: initialIdentity,
          analysisStatus: "complete",
          cardIntelResolved: true,
          title: composedTitle || item.title || "",
          description: composedDescription || item.description || "",
        });
      } catch (err) {
        console.error("Sports batch analysis failed:", err);
        updateBatchItem(item.id, { analysisStatus: "error" });
      } finally {
        inFlightRef.current.delete(item.id);
      }
    };

    const hasActive = items.some((item) => item.analysisStatus === "analyzing");
    if (hasActive) return;
    const nextItem = items.find(
      (item) =>
        item &&
        item.id &&
        item.analysisStatus !== "complete" &&
        !item.cardIntelResolved &&
        !item.reviewIdentity?.player
    );
    if (nextItem) {
      runAnalysisForCard(nextItem);
    }
  }, [items, updateBatchItem]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <div className="w-full mb-6">
          <div className="h-[1px] w-full bg-[#E8DCC0]/60" />
        </div>
        <button
          type="button"
          onClick={() => navigate("/sports-batch")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Review Batch Cards
        </h1>
        <div className="w-full mb-6">
          <div className="text-center text-white/65 text-sm py-2">
            Confirm details before launch.
          </div>
          <div className="h-[1px] w-full bg-[#E8DCC0]/60" />
        </div>

        {items.length === 0 ? (
          <div className="min-h-[50vh] flex items-center justify-center text-white/70 text-center">
            No sports batch items found. Start from Sports Card Suite → Batch.
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item, index) => {
              const identity = item.reviewIdentity || {};
              const title = composeCardTitle(identity);
              const frontSrc =
                item.frontImage?.url || item.photos?.[0]?.url || "";
              const backEntry = item.backImage || item.secondaryPhotos?.[0] || null;
              const backSrc =
                backEntry?.url ||
                backEntry?.dataUrl ||
                backEntry?.preview ||
                "";
              const backImageExists = Boolean(backEntry);
              const backConfidence =
                backEntry?.confidence ??
                backEntry?.confidenceScore ??
                backEntry?.score ??
                null;
              const showBackConfirmNote =
                backImageExists &&
                typeof backConfidence === "number" &&
                backConfidence < 0.6;
              const backInputId = `back-upload-${item.id}`;
              const isSlabbed =
                identity.isSlabbed === true || item.cardType === "slabbed";
              const frontCorners = isSlabbed ? [] : item.frontCorners || [];
              const backCorners = isSlabbed ? [] : item.backCorners || [];
              const showCorners = openCornerId === item.id;
              const showDescription = openDescriptionId === item.id;
              const analysisStatus = item.analysisStatus || "";
              const isAnalyzing = analysisStatus === "analyzing" || analysisStatus === "running";
              const analysisComplete =
                analysisStatus === "complete" || analysisStatus === "error";
              const manualPlayerConfirmed = identity?._sources?.player === "manual";
              const playerConfirmed =
                Boolean(identity.player) && validPlayerName && !lowConfidencePlayer;
              const readyStatus =
                analysisComplete &&
                (playerConfirmed || manualPlayerConfirmed) &&
                Boolean(frontSrc) &&
                Boolean(backSrc) &&
                frontCorners.length >= 4;
              const description = item.description || composeIdentityDescription(identity);
              const playerConfidence = identity?.confidence?.player || "";
              const lowConfidencePlayer = playerConfidence === "low";
              const headerTitle = isAnalyzing
                ? "Review card details"
                : title || identity.player || "Review card details";
              const identityValues = {
                ...identity,
                player: identity.player || "",
              };
              const missingFields = identityRows.filter(
                (row) => !identityValues[row.key]
              );
              const showHelperLine = missingFields.length >= 2;
              const identityIncomplete = missingFields.length > 0;
              console.log({
                analysisStatus,
                isReady: readyStatus,
                identityKeys: Object.keys(identity || {}),
              });

              return (
                <div key={item.id}>
                  <div className="relative lux-card border border-white/10 p-5 flex flex-col gap-4">
                    <button
                      type="button"
                      className="absolute right-4 top-4 text-white/40 hover:text-white/80 z-10"
                      aria-label="Remove card"
                      onClick={() => {
                        handleRemoveCard(item);
                      }}
                    >
                      ✕
                    </button>
                    <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm uppercase tracking-[0.25em] text-white/50">
                        Card
                      </div>
                      <div className="text-lg text-white">
                        {headerTitle}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                      {isAnalyzing
                        ? "Analyzing card details…"
                        : readyStatus
                        ? "✅ Ready"
                        : "⚠ Needs attention"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-2">
                      {renderThumbnail(frontSrc, "Front")}
                    </div>
                    <div className="flex flex-col gap-2">
                      {backImageExists ? (
                        backSrc ? (
                          renderThumbnail(backSrc, "Back")
                        ) : (
                          <div className="h-16 w-16 rounded-lg border border-white/10" />
                        )
                      ) : (
                        <>
                          <label
                            htmlFor={backInputId}
                            className="h-16 w-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-[10px] uppercase tracking-[0.25em] text-white/50 cursor-pointer hover:border-white/40"
                          >
                            Back missing
                          </label>
                          <input
                            id={backInputId}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => handleBackUpload(item, event.target.files)}
                          />
                        </>
                      )}
                      {showBackConfirmNote && (
                        <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                          Back detected — please confirm
                        </div>
                      )}
                    </div>
                  </div>

                  {analysisComplete ? (
                    <>
                      <div className="grid gap-3 text-sm text-white/80">
                        {identityRows.map((row) => {
                          const value = identityValues[row.key];
                          return (
                            <div key={row.key} className="flex justify-between">
                              <span className="text-white/50">{row.label}</span>
                              <span>{value || "Not confirmed"}</span>
                            </div>
                          );
                        })}
                      </div>
                      {showHelperLine && (
                        <div className="text-xs text-white/45">
                          Some details couldn’t be confirmed automatically.
                        </div>
                      )}
                      {lowConfidencePlayer && identity.player && (
                        <div className="text-xs text-white/45">
                          Player needs confirmation.
                        </div>
                      )}
                      {analysisStatus === "error" && (
                        <div className="text-xs text-white/45">
                          We couldn’t auto-detect details — edit manually
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="grid gap-3 text-sm text-white/70">
                      {identityRows.map((row) => (
                        <div key={row.key} className="flex justify-between">
                          <span className="text-white/50">{row.label}</span>
                          <span className="inline-block h-3 w-16 rounded-full bg-white/10" />
                        </div>
                      ))}
                    </div>
                  )}
                  {isAnalyzing && identityIncomplete && (
                    <div className="text-xs text-white/45">
                      Some details may take up to 10 seconds to appear.
                    </div>
                  )}

                  {analysisComplete && description && (
                    <button
                      type="button"
                      className="text-xs uppercase tracking-[0.25em] text-[#E8DCC0] text-left"
                      onClick={() => handleToggleDescription(item.id)}
                    >
                      {showDescription ? "Hide description" : "Description preview"}
                    </button>
                  )}

                  {analysisComplete && showDescription && description && (
                    <div className="text-xs text-white/70 whitespace-pre-line">
                      {description}
                    </div>
                  )}

                  <button
                    type="button"
                    className={`text-xs uppercase tracking-[0.25em] text-left ${
                      identityIncomplete || isAnalyzing
                        ? "text-[#E8DCC0] font-semibold"
                        : "text-[#E8DCC0]"
                    }`}
                    onClick={() => openEditModal(item)}
                  >
                    Edit details
                  </button>

                  {editCardId === item.id && (
                    <div className="mt-3 grid gap-3">
                      {[
                        { key: "player", label: "Player" },
                        { key: "year", label: "Year" },
                        { key: "brand", label: "Brand" },
                        { key: "setName", label: "Set" },
                        { key: "team", label: "Team" },
                        { key: "sport", label: "Sport" },
                      ].map((field) => (
                        <label key={field.key} className="text-xs text-white/60">
                          <span className="block uppercase tracking-[0.25em] mb-1">
                            {field.label}
                          </span>
                          <input
                            type="text"
                            value={editDraft[field.key]}
                            onChange={(event) =>
                              setEditDraft((prev) => ({
                                ...prev,
                                [field.key]: event.target.value,
                              }))
                            }
                            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-white/30"
                          />
                        </label>
                      ))}
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className="flex-1 rounded-xl border border-white/20 py-2 text-[11px] uppercase tracking-[0.25em] text-white/70 hover:bg-white/10 transition"
                          onClick={handleEditSave}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="flex-1 rounded-xl border border-white/10 py-2 text-[11px] uppercase tracking-[0.25em] text-white/40 hover:text-white/70 transition"
                          onClick={closeEditModal}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}


                  {!isSlabbed && !isAnalyzing && (
                    <div className="border-t border-white/10 pt-4">
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.25em] text-[#E8DCC0] text-left"
                        onClick={() => handleToggleCorners(item.id)}
                      >
                        {showCorners ? "Hide corners" : "Corners (4) ▸"}
                      </button>
                      {showCorners && (
                        <div className="mt-4 grid gap-3">
                          <div className="grid grid-cols-4 gap-3">
                            {frontCorners.slice(0, 4).map((corner, idx) => (
                              <img
                                key={`front-${item.id}-${idx}`}
                                src={corner.url || corner}
                                alt={`Front corner ${idx + 1}`}
                                className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.25em] text-white/60 text-left"
                            onClick={() => handleRecrop(item)}
                          >
                            Re-crop corners
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  </div>
                  {index < items.length - 1 && (
                    <div className="h-[1px] w-full bg-[#E8DCC0]/35 mt-6" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              className="lux-continue-btn w-full"
              onClick={() => navigate("/sports-batch-launch")}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
      {undoToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-3 rounded-full border border-white/15 bg-black/90 px-4 py-2 text-xs uppercase tracking-[0.2em] text-white/80 shadow-[0_12px_30px_rgba(0,0,0,0.55)]">
            <span>Card removed</span>
            <button
              type="button"
              className="text-[#E8DCC0] hover:text-white"
              onClick={handleUndoRemove}
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
