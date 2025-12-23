import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import {
  buildCornerPreviewFromEntries,
  regenerateCornerImage,
  MAX_CORNER_NUDGE_RATIO,
} from "../utils/cardIntel";
import "../styles/createListing.css";

const CORNER_POSITIONS = [
  { key: "topLeft", label: "Top Left" },
  { key: "topRight", label: "Top Right" },
  { key: "bottomLeft", label: "Bottom Left" },
  { key: "bottomRight", label: "Bottom Right" },
];

const STAGES = {
  CAPTURE: "capture",
  CONFIRM: "confirm",
};

const ADJUST_BASE_STEP_RATIO = 0.018;
const ADJUST_ACCEL_WINDOW_MS = 420;
const ADJUST_ACCEL_MULTIPLIER = 0.55;
const ADJUST_HOLD_INTERVAL_MS = 140;

const normalizeCornerEntry = (entry) => {
  if (!entry) return entry;
  const bounds = entry.initialCropBounds || {};
  return {
    ...entry,
    offsetRatioX: entry.offsetRatioX || 0,
    offsetRatioY: entry.offsetRatioY || 0,
    sourceX: typeof entry.sourceX === "number" ? entry.sourceX : null,
    sourceY: typeof entry.sourceY === "number" ? entry.sourceY : null,
    sourceSize: typeof entry.sourceSize === "number" ? entry.sourceSize : null,
    baseImageWidth:
      typeof entry.baseImageWidth === "number" ? entry.baseImageWidth : null,
    baseImageHeight:
      typeof entry.baseImageHeight === "number" ? entry.baseImageHeight : null,
    initialCropBounds: {
      x: typeof bounds.x === "number" ? bounds.x : null,
      y: typeof bounds.y === "number" ? bounds.y : null,
      size: typeof bounds.size === "number" ? bounds.size : null,
    },
  };
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export default function MagicCardPrep({ analysisActive = false }) {
  const navigate = useNavigate();
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const {
    listingData,
    setListingField,
    resetListing,
    requestSportsAnalysis,
    batchMode,
    setBatchMode,
  } = useListingStore();

  const [frontPhoto, setFrontPhoto] = useState(listingData?.photos?.[0] || null);
  const [backPhoto, setBackPhoto] = useState(
    listingData?.secondaryPhotos?.[0] || null
  );
  const [prepError, setPrepError] = useState("");
  const [dragging, setDragging] = useState({ front: false, back: false });
  const [cornerEntries, setCornerEntries] = useState(
    Array.isArray(listingData?.cornerPhotos)
      ? listingData.cornerPhotos.map(normalizeCornerEntry)
      : []
  );
  const [cornerLoading, setCornerLoading] = useState(false);
  const [cornerError, setCornerError] = useState("");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustBusyKey, setAdjustBusyKey] = useState("");
  const adjustMomentumRef = useRef({});
  const adjustHoldTimerRef = useRef(null);
  const adjustPointerActiveRef = useRef(false);
  const cornerSyncSignatureRef = useRef("");
  const isRegeneratingRef = useRef(false);
  const adjustBusyKeyRef = useRef("");
  const logAdjustEvent = useCallback((type, payload = {}) => {
    try {
      console.log(`[Adjust] ${type}`, payload);
    } catch (err) {
      // logging failure should never break UI
    }
  }, []);

  const isAxisClamped = useCallback(
    (entry, axis, direction) => {
      if (!entry) return true;
      const value = axis === "x" ? entry.offsetRatioX || 0 : entry.offsetRatioY || 0;
      const limit = direction > 0 ? MAX_CORNER_NUDGE_RATIO : -MAX_CORNER_NUDGE_RATIO;
      if (direction > 0) {
        return value >= limit - 0.0005;
      }
      return value <= limit + 0.0005;
    },
    []
  );
  const hasExistingCardDraft = useMemo(
    () =>
      Boolean(
        (frontPhoto && frontPhoto.url) ||
          (backPhoto && backPhoto.url) ||
          (Array.isArray(listingData?.cornerPhotos) &&
            listingData.cornerPhotos.length > 0)
      ),
    [frontPhoto, backPhoto, listingData?.cornerPhotos]
  );
  const [showResumeBanner, setShowResumeBanner] = useState(
    () => hasExistingCardDraft
  );
  useEffect(() => {
    if (!hasExistingCardDraft) {
      setShowResumeBanner(false);
    }
  }, [hasExistingCardDraft]);

  const cornerMap = useMemo(() => {
    const map = {
      front: {},
      back: {},
    };
    cornerEntries.forEach((entry) => {
      if (!entry?.cornerKey) return;
      const sideKey =
        entry.side && entry.side.toLowerCase() === "back" ? "back" : "front";
      map[sideKey][entry.cornerKey] = entry;
    });
    return map;
  }, [cornerEntries]);

  const lowConfidenceCount = useMemo(() => {
    return cornerEntries.filter(
      (entry) =>
        String(entry?.confidence || "").toLowerCase() === "low"
    ).length;
  }, [cornerEntries]);

  const hasFrontPhoto = Boolean(frontPhoto);
  const hasBackPhoto = Boolean(backPhoto);
  const readyForConfirm = hasFrontPhoto && hasBackPhoto;
  const [stage, setStage] = useState(
    readyForConfirm ? STAGES.CONFIRM : STAGES.CAPTURE
  );

  useEffect(() => {
    setStage(readyForConfirm ? STAGES.CONFIRM : STAGES.CAPTURE);
  }, [readyForConfirm]);

  const prepareEntry = useCallback(async (file, label) => {
    const converted = await convertHeicIfNeeded(file);
    const usableFile = converted instanceof File ? converted : file;
    const url =
      converted && typeof converted === "object" && converted.url
        ? converted.url
        : URL.createObjectURL(usableFile);
    const alt =
      label ||
      deriveAltTextFromFilename(usableFile?.name) ||
      "card photo";
    return { url, altText: alt, file: usableFile };
  }, []);

  const syncListingPhotos = useCallback(
    (nextFront, nextBack) => {
      setListingField("photos", nextFront ? [nextFront] : []);
      setListingField(
        "secondaryPhotos",
        nextBack ? [nextBack] : []
      );
      setListingField("category", "Sports Cards");
    },
    [setListingField]
  );

  const syncCornerEntries = useCallback((nextEntries) => {
    setCornerEntries((prev) => {
      const resolved = typeof nextEntries === "function" ? nextEntries(prev) : nextEntries;
      return Array.isArray(resolved) ? resolved.map(normalizeCornerEntry) : [];
    });
  }, []);

  const clearCorners = useCallback(() => {
    syncCornerEntries([]);
    setCornerError("");
    setAdjustTarget(null);
    setAdjustBusyKey("");
  }, [syncCornerEntries]);

  const resetCardIntel = useCallback(() => {
    setListingField("cardIntel", null);
    setListingField("cardAttributes", null);
  }, [setListingField]);

  const handleSelect = useCallback(
    async (position, files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;
      setPrepError("");

      try {
        const entry = await prepareEntry(incoming[0], `${position} card photo`);
        const isFreshCapture = !frontPhoto && !backPhoto;
        if (position === "front" && isFreshCapture) {
          resetListing("sports_cards");
        }

        if (position === "front") {
          setFrontPhoto(entry);
          syncListingPhotos(entry, backPhoto);
        } else {
          setBackPhoto(entry);
          syncListingPhotos(frontPhoto, entry);
        }

        resetCardIntel();
        clearCorners();
      } catch (err) {
        console.error("Failed to prepare card photo:", err);
        setPrepError("Unable to load that image. Please try another file.");
      }
    },
    [
      prepareEntry,
      resetListing,
      syncListingPhotos,
      frontPhoto,
      backPhoto,
      resetCardIntel,
      clearCorners,
    ]
  );

  const handleDrop = (position, event) => {
    event.preventDefault();
    setDragging((prev) => ({ ...prev, [position]: false }));
    if (event.dataTransfer.files.length) {
      handleSelect(position, event.dataTransfer.files);
    }
  };

  const handleDragOver = (position, event) => {
    event.preventDefault();
    setDragging((prev) => ({ ...prev, [position]: true }));
  };

  const handleDragLeave = (position) => {
    setDragging((prev) => ({ ...prev, [position]: false }));
  };

  const handleBrowse = (position) => {
    if (position === "front") {
      frontInputRef.current?.click();
    } else {
      backInputRef.current?.click();
    }
  };

  const handleRetakeAll = () => {
    try {
      console.log("[QA] handleRetakeAll triggered", { timestamp: Date.now() });
    } catch (err) {
      // ignore logging failures
    }
    resetListing("sports_cards");
    resetCardIntel();
    setFrontPhoto(null);
    setBackPhoto(null);
    clearCorners();
    setPrepError("");
    setShowResumeBanner(false);
    frontInputRef.current?.click();
  };

  const handleRemovePhoto = useCallback(
    (position) => {
      if (position === "front") {
        setFrontPhoto(null);
        syncListingPhotos(null, backPhoto);
      } else {
        setBackPhoto(null);
        syncListingPhotos(frontPhoto, null);
      }
      resetCardIntel();
      clearCorners();
    },
    [frontPhoto, backPhoto, syncListingPhotos, resetCardIntel, clearCorners]
  );

  useEffect(() => {
    let cancelled = false;
    if (!frontPhoto || !backPhoto) {
      return () => {
        cancelled = true;
      };
    }

    if (cornerEntries.length > 0) {
      return () => {
        cancelled = true;
      };
    }

    setCornerLoading(true);
    setCornerError("");

    (async () => {
      try {
        const preview = await buildCornerPreviewFromEntries(frontPhoto, backPhoto);
        if (cancelled) return;
        const entries = preview?.entries || [];
        syncCornerEntries(entries);
      } catch (err) {
        if (!cancelled) {
          console.error("Corner preview failed:", err);
          syncCornerEntries([]);
          setCornerError("Unable to capture all corners. Retake the photos for better coverage.");
        }
      } finally {
        if (!cancelled) {
          setCornerLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [frontPhoto, backPhoto, cornerEntries.length, syncCornerEntries]);

  const renderUploadSlot = (position, label, photo) => (
    <div>
      <div className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">
        {label}
      </div>
      <div
        className={`lux-upload-zone relative flex items-center justify-center min-h-[180px] cursor-pointer ${
          dragging[position] ? "lux-upload-hover" : ""
        } analysis-scan-wrapper ${analysisActive && photo ? "analysis-scan-active" : ""}`}
        onDragOver={(e) => handleDragOver(position, e)}
        onDragLeave={() => handleDragLeave(position)}
        onDrop={(e) => handleDrop(position, e)}
        onClick={() => handleBrowse(position)}
      >
        {photo ? (
          <img
            src={photo.url}
            alt={photo.altText}
            className="w-full h-full object-cover rounded-[20px]"
          />
        ) : (
          <div className="text-center relative z-10">
            <p className="text-lg opacity-80">Upload {label.toLowerCase()}</p>
            <p className="text-sm opacity-60">JPEG / PNG supported</p>
          </div>
        )}
      </div>
      {photo && (
        <button
          className="mt-2 text-xs uppercase tracking-[0.3em] text-white/50 hover:text-white transition"
          onClick={(e) => {
            e.stopPropagation();
            handleRemovePhoto(position);
          }}
        >
          Remove {label}
        </button>
      )}
    </div>
  );

  const renderConfirmedPhoto = (position, label, photo) => (
    <div>
      <div className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">
        {label}
      </div>
      <div
        className={`relative rounded-[20px] overflow-hidden border border-white/15 analysis-scan-wrapper ${
          analysisActive && photo ? "analysis-scan-active" : ""
        }`}
      >
        {photo ? (
          <img
            src={photo.url}
            alt={photo.altText}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="min-h-[220px] flex items-center justify-center text-sm opacity-70">
            Missing photo
          </div>
        )}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          type="button"
          className="flex-1 py-2 rounded-xl border border-white/20 text-[11px] uppercase tracking-[0.32em] text-white/70 hover:border-white/40 transition"
          onClick={() => handleBrowse(position)}
        >
          Replace
        </button>
        <button
          type="button"
          className="px-4 rounded-xl border border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/55 hover:border-white/40 transition"
          onClick={() => handleRemovePhoto(position)}
        >
          Clear
        </button>
      </div>
    </div>
  );

  const renderCaptureStage = () => (
    <>
      {showResumeBanner && (
        <div className="bg-black/40 border border-white/10 rounded-2xl p-4 mb-6 text-sm text-white/80">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60 mb-1">
            Resuming your last card
          </div>
          <p className="text-white/70">
            We saved your previous front/back photos. Retake them if you’d like to start over.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-3">
            <button
              type="button"
              className="flex-1 py-2 rounded-2xl border border-white/20 text-[11px] uppercase tracking-[0.3em] text-white/80 hover:border-white/40 transition"
              onClick={() => setShowResumeBanner(false)}
            >
              Keep These Photos
            </button>
            <button
              type="button"
              className="flex-1 py-2 rounded-2xl border border-[#F27B81]/50 bg-[#F27B81]/10 text-[#F9B8BC] text-[11px] uppercase tracking-[0.3em] hover:bg-[#F27B81]/20 transition"
              onClick={handleRetakeAll}
            >
              Retake / Start Fresh
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 relative z-20">
        {renderUploadSlot("front", "Front of card", frontPhoto)}
        {renderUploadSlot("back", "Back of card", backPhoto)}
      </div>

      {!backPhoto && frontPhoto && (
        <div className="mt-3 text-xs text-center text-white/60 tracking-[0.35em]">
          Add the back to unlock corner coverage.
        </div>
      )}

      {prepError && (
        <div className="mt-4 text-center text-sm text-red-300">{prepError}</div>
      )}
    </>
  );

  const renderConfirmStage = () => (
    <>
      <div className="grid gap-6 md:grid-cols-2 relative z-20">
        {renderConfirmedPhoto("front", "Front of card", frontPhoto)}
        {renderConfirmedPhoto("back", "Back of card", backPhoto)}
      </div>

      <div className="mt-10 rounded-2xl border border-[#E8DCC0]/30 bg-black/40 p-6 relative z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.45em] text-[#E8DCC0]/80">
            Auto Corner Coverage
          </div>
          {isAnalysisReady && (
            <div className="text-xs text-white/60">
              Ready for analysis
            </div>
          )}
        </div>
        <p className="text-xs text-white/55 mb-4">
          Confidence only reflects image clarity (High = clearly framed, Medium = visible but slightly angled). It never judges card condition.
        </p>

        {cornerLoading && (
          <div className="text-sm text-white/70">
            Capturing corner crops…
          </div>
        )}

        {!cornerLoading && (
          <>
            {["front", "back"].map((sideKey) => {
              const prettySide = sideKey === "front" ? "Front" : "Back";
              const sideConfidence = getSideConfidence(sideKey);
              return (
                <div key={sideKey} className="mt-6">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/70">
                    {prettySide} Corners
                    {isAnalysisReady && renderConfidenceBadge(sideConfidence)}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {CORNER_POSITIONS.map((corner) => {
                      const entry = cornerMap[sideKey][corner.key];
                      return (
                        <div
                          key={`${sideKey}-${corner.key}`}
                          className="text-center text-[11px] uppercase tracking-[0.25em]"
                        >
                          <div
                            className={`mb-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden corner-thumb-shell ${
                              adjustBusyKey === `${sideKey}-${corner.key}`
                                ? "corner-thumb-shell--pending"
                                : ""
                            }`}
                          >
                            {isAnalysisReady ? (
                              entry ? (
                                <img
                                  key={entry.url}
                                  src={entry.url}
                                  alt={entry.altText}
                                  className="w-full h-24 object-cover corner-thumb-image"
                                />
                              ) : (
                                <div className="h-24 flex items-center justify-center text-[10px] opacity-40">
                                  Waiting for coverage
                                </div>
                              )
                            ) : (
                              <div className="h-24 flex items-center justify-center text-[10px] opacity-40">
                                Waiting for coverage
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-center gap-2 text-white/70">
                            {corner.label}
                            {isAnalysisReady && entry && renderConfidenceBadge(entry?.confidence)}
                          </div>
                          {isAnalysisReady && entry && (
                    <div className="mt-2">
                      <button
                        type="button"
                        className="text-[10px] tracking-[0.25em] text-[#E8D5A8] hover:text-[#fff4d4] transition"
                        onClick={() =>
                          setAdjustTarget({
                            sideKey,
                            cornerKey: corner.key,
                          })
                        }
                      >
                        Adjust
                      </button>
                      {adjustTarget &&
                        adjustTarget.sideKey === sideKey &&
                        adjustTarget.cornerKey === corner.key && (
                          <div className="mt-2 rounded-2xl border border-white/15 bg-black/70 p-3 text-[10px] text-white/80 space-y-2">
                            <div className="text-center uppercase tracking-[0.3em] text-white/60">
                              Adjust Corner
                            </div>
                            <div className="grid grid-cols-3 gap-1 text-xs font-semibold">
                              <span />
                              <button
                                type="button"
                                className="adjust-arrow rounded-xl border border-white/20 hover:border-white/50 disabled:opacity-30"
                                disabled={
                                  adjustBusyKey === `${sideKey}-${corner.key}` ||
                                  isAxisClamped(entry, "y", -1)
                                }
                                onPointerDown={(event) =>
                                  handleAdjustPointerDown(event, sideKey, corner.key, "y", -1)
                                }
                                onPointerUp={handleAdjustPointerUp}
                                onPointerLeave={handleAdjustPointerUp}
                                onPointerCancel={handleAdjustPointerUp}
                                onClick={() => {
                                  if (adjustPointerActiveRef.current) return;
                                  handleAdjustMove(sideKey, corner.key, "y", -1);
                                }}
                              >
                                ↑
                              </button>
                              <span />
                              <button
                                type="button"
                                className="adjust-arrow rounded-xl border border-white/20 hover:border-white/50 disabled:opacity-30"
                                disabled={
                                  adjustBusyKey === `${sideKey}-${corner.key}` ||
                                  isAxisClamped(entry, "x", -1)
                                }
                                onPointerDown={(event) =>
                                  handleAdjustPointerDown(event, sideKey, corner.key, "x", -1)
                                }
                                onPointerUp={handleAdjustPointerUp}
                                onPointerLeave={handleAdjustPointerUp}
                                onPointerCancel={handleAdjustPointerUp}
                                onClick={() => {
                                  if (adjustPointerActiveRef.current) return;
                                  handleAdjustMove(sideKey, corner.key, "x", -1);
                                }}
                              >
                                ←
                              </button>
                              <button
                                type="button"
                                className="adjust-arrow rounded-xl border border-white/20 hover:border-white/50 disabled:opacity-30"
                                disabled={
                                  adjustBusyKey === `${sideKey}-${corner.key}` ||
                                  isAxisClamped(entry, "y", 1)
                                }
                                onPointerDown={(event) =>
                                  handleAdjustPointerDown(event, sideKey, corner.key, "y", 1)
                                }
                                onPointerUp={handleAdjustPointerUp}
                                onPointerLeave={handleAdjustPointerUp}
                                onPointerCancel={handleAdjustPointerUp}
                                onClick={() => {
                                  if (adjustPointerActiveRef.current) return;
                                  handleAdjustMove(sideKey, corner.key, "y", 1);
                                }}
                              >
                                ↓
                              </button>
                              <button
                                type="button"
                                className="adjust-arrow rounded-xl border border-white/20 hover:border-white/50 disabled:opacity-30"
                                disabled={
                                  adjustBusyKey === `${sideKey}-${corner.key}` ||
                                  isAxisClamped(entry, "x", 1)
                                }
                                onPointerDown={(event) =>
                                  handleAdjustPointerDown(event, sideKey, corner.key, "x", 1)
                                }
                                onPointerUp={handleAdjustPointerUp}
                                onPointerLeave={handleAdjustPointerUp}
                                onPointerCancel={handleAdjustPointerUp}
                                onClick={() => {
                                  if (adjustPointerActiveRef.current) return;
                                  handleAdjustMove(sideKey, corner.key, "x", 1);
                                }}
                              >
                                →
                              </button>
                              <span />
                              <span />
                            </div>
                            <button
                              type="button"
                              className="w-full py-1 rounded-full border border-white/20 text-[10px] uppercase tracking-[0.25em] text-white/70 hover:bg-white/5"
                              onClick={() => {
                                handleAdjustPointerUp();
                                setAdjustTarget(null);
                              }}
                            >
                              Done
                            </button>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
                </div>
              );
            })}
          </>
        )}

        <p className="mt-5 text-xs text-white/55">
          Corners are auto-detected for condition analysis. Retake the photos if coverage looks off.
        </p>
        {isAnalysisReady && lowConfidenceCount > 0 && (
          <div className="mt-3 text-xs text-[#F6D48F]">
            {lowConfidenceCount === 1
              ? "1 corner looks low-confidence. Retake if clarity matters."
              : `${lowConfidenceCount} corners look low-confidence. Retake if clarity matters.`}
          </div>
        )}
      </div>

        {!isAnalysisReady && cornerError && (
          <div className="mt-4 text-xs text-red-300">{cornerError}</div>
        )}

      <div className="mt-10 flex flex-col sm:flex-row gap-3 relative z-30">
        <button
          onClick={handleAnalyze}
          disabled={!isAnalysisReady}
          className={`flex-1 py-4 text-lg font-semibold rounded-xl lux-continue-btn ${
            !isAnalysisReady ? "opacity-40 cursor-not-allowed" : ""
          }`}
        >
          Analyze Card →
        </button>
        <button
          onClick={handleRetakeAll}
          className="flex-1 py-4 text-lg font-semibold rounded-xl border border-white/15 text-white/70 hover:bg-white/5 transition"
        >
          Retake Photos
        </button>
      </div>
    </>
  );

  const frontCoverageComplete = useMemo(
    () => CORNER_POSITIONS.every(({ key }) => Boolean(cornerMap.front[key])),
    [cornerMap]
  );

  const backCoverageComplete = useMemo(
    () => CORNER_POSITIONS.every(({ key }) => Boolean(cornerMap.back[key])),
    [cornerMap]
  );

  const isAnalysisReady = Boolean(
    frontPhoto &&
      backPhoto &&
      frontCoverageComplete &&
      backCoverageComplete &&
      !cornerLoading
  );
  const coverageMessage =
    "We couldn’t capture all 8 corners. Retake the photos and keep each corner visible on both sides.";

  const updateCornerEntryData = useCallback(
    (sideKey, cornerKey, updater) => {
      syncCornerEntries((prev) =>
        prev.map((entry) => {
          const entrySide = (entry.side || "Front").toLowerCase();
          if (entrySide === sideKey && entry.cornerKey === cornerKey) {
            const next = typeof updater === "function" ? updater(entry) : updater;
            return normalizeCornerEntry(next);
          }
          return entry;
        })
      );
    },
    [syncCornerEntries]
  );

  const getMomentumDelta = useCallback(
    (sideKey, cornerKey, axis, direction) => {
      const normalizedAxis = axis === "y" ? "y" : "x";
      const normalizedDirection = direction >= 0 ? "pos" : "neg";
      const key = `${sideKey}-${cornerKey}-${normalizedAxis}-${normalizedDirection}`;
      const now = Date.now();
      const record = adjustMomentumRef.current[key];
      const withinWindow = record && now - record.time < ADJUST_ACCEL_WINDOW_MS;
      const nextCount = withinWindow ? Math.min(record.count + 1, 5) : 1;
      adjustMomentumRef.current[key] = { time: now, count: nextCount };
      const boost = 1 + (nextCount - 1) * ADJUST_ACCEL_MULTIPLIER;
      return ADJUST_BASE_STEP_RATIO * boost;
    },
    []
  );

  const handleAdjustMove = useCallback(
    async (sideKey, cornerKey, axis = "x", direction = 1) => {
      const entry = cornerMap[sideKey]?.[cornerKey];
      const sourcePhoto =
        sideKey === "front" ? frontPhoto?.url : sideKey === "back" ? backPhoto?.url : null;
      if (!entry || !sourcePhoto) return;
      const busyKey = `${sideKey}-${cornerKey}`;
      if (adjustBusyKey === busyKey) {
        logAdjustEvent("ignored-corner-busy", { sideKey, cornerKey, axis, direction });
        return;
      }
      if (isRegeneratingRef.current) {
        logAdjustEvent("ignored-global-busy", { sideKey, cornerKey, axis, direction });
        return;
      }
      const step = getMomentumDelta(sideKey, cornerKey, axis, direction);
      const uiDeltaX = axis === "x" ? direction * step : 0;
      const uiDeltaY = axis === "y" ? direction * step : 0;
      const appliedDeltaX = axis === "x" ? -uiDeltaX : 0;
      const appliedDeltaY = axis === "y" ? -uiDeltaY : 0;
      const currentX = entry.offsetRatioX || 0;
      const currentY = entry.offsetRatioY || 0;
      const nextX = clamp(
        currentX + appliedDeltaX,
        -MAX_CORNER_NUDGE_RATIO,
        MAX_CORNER_NUDGE_RATIO
      );
      const nextY = clamp(
        currentY + appliedDeltaY,
        -MAX_CORNER_NUDGE_RATIO,
        MAX_CORNER_NUDGE_RATIO
      );
      const lockedNextX = axis === "y" ? currentX : nextX;
      const lockedNextY = axis === "x" ? currentY : nextY;
      if (lockedNextX === currentX && lockedNextY === currentY) {
        logAdjustEvent("clamp-reached", {
          sideKey,
          cornerKey,
          axis,
          direction,
          offset: axis === "x" ? currentX : currentY,
        });
        return;
      }
      isRegeneratingRef.current = true;
      setAdjustBusyKey(busyKey);
      let fallbackTimeout = null;
      if (typeof window !== "undefined") {
        fallbackTimeout = window.setTimeout(() => {
          if (isRegeneratingRef.current && adjustBusyKeyRef.current === busyKey) {
            logAdjustEvent("regen-timeout", { sideKey, cornerKey, axis, direction });
            isRegeneratingRef.current = false;
            setAdjustBusyKey((prev) => (prev === busyKey ? "" : prev));
          }
        }, 600);
      }
      let regenerated = null;
      try {
        regenerated = await regenerateCornerImage(
          sourcePhoto,
          cornerKey,
          lockedNextX,
          lockedNextY,
          entry
        );
      } finally {
        if (fallbackTimeout) {
          clearTimeout(fallbackTimeout);
        }
        isRegeneratingRef.current = false;
        setAdjustBusyKey((prev) => (prev === busyKey ? "" : prev));
      }
      if (!regenerated?.dataUrl) return;
      updateCornerEntryData(sideKey, cornerKey, (prevEntry) => ({
        ...prevEntry,
        url: regenerated.dataUrl,
        confidence: regenerated.confidence || prevEntry.confidence,
        offsetRatioX: lockedNextX,
        offsetRatioY: lockedNextY,
        manualOverride: true,
        sourceX:
          typeof regenerated.sourceX === "number"
            ? regenerated.sourceX
            : prevEntry.sourceX ?? null,
        sourceY:
          typeof regenerated.sourceY === "number"
            ? regenerated.sourceY
            : prevEntry.sourceY ?? null,
        sourceSize:
          typeof regenerated.sourceSize === "number"
            ? regenerated.sourceSize
            : prevEntry.sourceSize ?? null,
        baseImageWidth:
          typeof prevEntry.baseImageWidth === "number"
            ? prevEntry.baseImageWidth
            : typeof regenerated.baseImageWidth === "number"
            ? regenerated.baseImageWidth
            : null,
        baseImageHeight:
          typeof prevEntry.baseImageHeight === "number"
            ? prevEntry.baseImageHeight
            : typeof regenerated.baseImageHeight === "number"
            ? regenerated.baseImageHeight
            : null,
        initialCropBounds:
          prevEntry.initialCropBounds &&
          typeof prevEntry.initialCropBounds.x === "number" &&
          typeof prevEntry.initialCropBounds.y === "number" &&
          typeof prevEntry.initialCropBounds.size === "number"
            ? prevEntry.initialCropBounds
            : regenerated.initialCropBounds || prevEntry.initialCropBounds,
      }));
    },
    [cornerMap, frontPhoto, backPhoto, updateCornerEntryData, getMomentumDelta, adjustBusyKey]
  );

  const stopAdjustHold = useCallback(() => {
    if (adjustHoldTimerRef.current) {
      clearInterval(adjustHoldTimerRef.current);
      adjustHoldTimerRef.current = null;
    }
  }, []);

  const handleAdjustPointerUp = useCallback(() => {
    adjustPointerActiveRef.current = false;
    stopAdjustHold();
  }, [stopAdjustHold]);

  const startAdjustHold = useCallback(
    (sideKey, cornerKey, axis, direction) => {
      stopAdjustHold();
      handleAdjustMove(sideKey, cornerKey, axis, direction);
      if (typeof window !== "undefined") {
        adjustHoldTimerRef.current = window.setInterval(() => {
          handleAdjustMove(sideKey, cornerKey, axis, direction);
        }, ADJUST_HOLD_INTERVAL_MS);
      }
    },
    [handleAdjustMove, stopAdjustHold]
  );

  const handleAdjustPointerDown = useCallback(
    (event, sideKey, cornerKey, axis, direction) => {
      event.preventDefault();
      adjustPointerActiveRef.current = true;
      startAdjustHold(sideKey, cornerKey, axis, direction);
    },
    [startAdjustHold]
  );

  useEffect(() => {
    return () => {
      stopAdjustHold();
    };
  }, [stopAdjustHold]);

  useEffect(() => {
    setAdjustTarget(null);
    adjustPointerActiveRef.current = false;
    stopAdjustHold();
  }, [stage, stopAdjustHold, setAdjustTarget]);

  useEffect(() => {
    adjustBusyKeyRef.current = adjustBusyKey;
  }, [adjustBusyKey]);

  useEffect(() => {
    const signature = JSON.stringify(
      cornerEntries.map((entry) => ({
        side: entry.side || "",
        cornerKey: entry.cornerKey || "",
        url: entry.url || "",
        offsetRatioX: entry.offsetRatioX || 0,
        offsetRatioY: entry.offsetRatioY || 0,
        sourceX: typeof entry.sourceX === "number" ? entry.sourceX : null,
        sourceY: typeof entry.sourceY === "number" ? entry.sourceY : null,
        sourceSize: typeof entry.sourceSize === "number" ? entry.sourceSize : null,
        baseImageWidth:
          typeof entry.baseImageWidth === "number" ? entry.baseImageWidth : null,
        baseImageHeight:
          typeof entry.baseImageHeight === "number" ? entry.baseImageHeight : null,
        initialCropBounds: {
          x:
            typeof entry?.initialCropBounds?.x === "number"
              ? entry.initialCropBounds.x
              : null,
          y:
            typeof entry?.initialCropBounds?.y === "number"
              ? entry.initialCropBounds.y
              : null,
          size:
            typeof entry?.initialCropBounds?.size === "number"
              ? entry.initialCropBounds.size
              : null,
        },
      }))
    );
    if (signature === cornerSyncSignatureRef.current) {
      return;
    }
    cornerSyncSignatureRef.current = signature;
    setListingField("cornerPhotos", cornerEntries);
  }, [cornerEntries, setListingField]);

  useEffect(() => {
    if (!frontPhoto || !backPhoto || cornerLoading) return;
    if (!frontCoverageComplete || !backCoverageComplete) {
      setCornerError(coverageMessage);
    } else if (cornerError === coverageMessage) {
      setCornerError("");
    }
  }, [
    frontPhoto,
    backPhoto,
    frontCoverageComplete,
    backCoverageComplete,
    cornerLoading,
    cornerError,
    coverageMessage,
  ]);

  const handleAnalyze = () => {
    if (!isAnalysisReady) {
      setCornerError(coverageMessage);
      return;
    }
    if (batchMode !== "sports_cards") {
      setBatchMode("sports_cards");
    }
    requestSportsAnalysis().catch((err) => {
      console.error("Failed to trigger sports analysis:", err);
    });
    navigate("/single-listing");
  };

  const getSideConfidence = useCallback(
    (sideKey) => {
      const entries = CORNER_POSITIONS.map(
        ({ key }) => cornerMap[sideKey][key]
      ).filter(Boolean);
      if (!entries.length) return null;
      const normalized = entries.map((entry) =>
        String(entry?.confidence || "").toLowerCase()
      );
      if (normalized.some((level) => level === "low")) return "low";
      if (normalized.some((level) => level === "medium")) return "medium";
      return "high";
    },
    [cornerMap]
  );

  const getConfidenceDescription = (level) => {
    if (!level) return "";
    if (level === "high") {
      return "High confidence: corner is clearly visible and well-framed.";
    }
    if (level === "medium") {
      return "Medium confidence: corner is visible but slightly cropped, angled, or blurred.";
    }
    return "Low confidence: the photo is usable but lacks clarity. Retake if the corner looks off.";
  };

  const renderConfidenceBadge = (level) => {
    if (!level) return null;
    const tone =
      level === "high"
        ? "text-emerald-300 border-emerald-300/40"
        : level === "medium"
        ? "text-[#CBB78A] border-[#CBB78A]/50"
        : "text-white/60 border-white/20";
    return (
      <span
        className={`text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
        title={getConfidenceDescription(level)}
      >
        {level}
      </span>
    );
  };

  return (
    <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col relative">
      <div className="rr-deep-emerald"></div>

      <button
        onClick={() => navigate(-1)}
        className="text-left text-sm text-[#E8DCC0] uppercase tracking-[0.2em] mb-4 w-fit hover:opacity-80 transition"
      >
        ← Back
      </button>

      <h1 className="sparkly-header header-glitter text-center text-3xl mb-3">
        Sports Card Studio
      </h1>

      <div className="magic-cta-bar mb-6" />

      <p className="text-center opacity-65 text-sm mb-2">
        Confirm coverage for the card you just captured. These exact photos move into analysis next.
      </p>
      <div className="text-center text-[11px] uppercase tracking-[0.35em] text-white/50 mb-6">
        {stage === STAGES.CAPTURE ? "Step 1 — Capture" : "Step 2 — Confirm Corners"}
      </div>

      {stage === STAGES.CAPTURE ? renderCaptureStage() : renderConfirmStage()}

      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={frontInputRef}
        onChange={(e) => handleSelect("front", e.target.files)}
      />
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={backInputRef}
        onChange={(e) => handleSelect("back", e.target.files)}
      />
    </div>
  );
}
