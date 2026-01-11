import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import {
  deriveAltTextFromFilename,
  photoEntryToDataUrl,
} from "../utils/photoHelpers";
import {
  buildCornerPreviewFromEntries,
  regenerateCornerImage,
  MAX_CORNER_NUDGE_RATIO,
} from "../utils/cardIntel";
import { evaluatePhotoPreflight } from "../utils/photoPreflight";
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

const ADJUST_BASE_STEP_RATIO = 0.011;
const ADJUST_ACCEL_WINDOW_MS = 420;
const ADJUST_ACCEL_MULTIPLIER = 0.35;
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
  const [photoPreflight, setPhotoPreflight] = useState({ front: null, back: null });
  const [preflightDismissed, setPreflightDismissed] = useState({
    front: false,
    back: false,
  });
  const preflightTargetRef = useRef({ front: null, back: null });
  const [capturePrimerSeen, setCapturePrimerSeen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("rr_capture_primer_seen") === "true";
  });
  const [showCapturePrimer, setShowCapturePrimer] = useState(false);
  const [pendingPickerSide, setPendingPickerSide] = useState(null);
  const [cornerEntries, setCornerEntries] = useState(
    Array.isArray(listingData?.cornerPhotos)
      ? listingData.cornerPhotos.map(normalizeCornerEntry)
      : []
  );
  const [cornerLoading, setCornerLoading] = useState(false);
  const [cornerError, setCornerError] = useState("");
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [adjustBusyKey, setAdjustBusyKey] = useState("");
  const [rotatingPhotoSide, setRotatingPhotoSide] = useState(null);
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

  useEffect(() => {
    if (!capturePrimerSeen) return;
    try {
      window.sessionStorage.setItem("rr_capture_primer_seen", "true");
    } catch {
      // ignore storage failures
    }
  }, [capturePrimerSeen]);

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

  const evaluatePhotoForSide = useCallback((entry, side) => {
    if (!entry?.url) {
      preflightTargetRef.current[side] = null;
      setPhotoPreflight((prev) => ({ ...prev, [side]: null }));
      return;
    }
    const sourceKey = entry.url;
    preflightTargetRef.current[side] = sourceKey;
    evaluatePhotoPreflight(sourceKey)
      .then((result) => {
        if (preflightTargetRef.current[side] !== sourceKey) return;
        setPhotoPreflight((prev) => ({
          ...prev,
          [side]: result ? { ...result, source: sourceKey } : null,
        }));
        setPreflightDismissed((prev) => ({ ...prev, [side]: false }));
      })
      .catch(() => {
        if (preflightTargetRef.current[side] !== sourceKey) return;
        setPhotoPreflight((prev) => ({ ...prev, [side]: null }));
      });
  }, []);

  useEffect(() => {
    evaluatePhotoForSide(frontPhoto, "front");
  }, [frontPhoto, evaluatePhotoForSide]);

  useEffect(() => {
    evaluatePhotoForSide(backPhoto, "back");
  }, [backPhoto, evaluatePhotoForSide]);

  const dismissPreflight = useCallback((position) => {
    setPreflightDismissed((prev) => ({ ...prev, [position]: true }));
  }, []);

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

  const openFilePickerImmediate = useCallback((position) => {
    if (position === "front") {
      frontInputRef.current?.click();
    } else {
      backInputRef.current?.click();
    }
  }, []);

  const handleBrowse = (position) => {
    if (!capturePrimerSeen) {
      setPendingPickerSide(position);
      setShowCapturePrimer(true);
      return;
    }
    openFilePickerImmediate(position);
  };

  const handleCapturePrimerContinue = () => {
    setCapturePrimerSeen(true);
    setShowCapturePrimer(false);
    const target = pendingPickerSide;
    setPendingPickerSide(null);
    if (target) {
      requestAnimationFrame(() => openFilePickerImmediate(target));
    }
  };

  const handleCapturePrimerDismiss = () => {
    setShowCapturePrimer(false);
    setPendingPickerSide(null);
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
    handleBrowse("front");
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

  const rotateImageEntry = useCallback(async (entry) => {
    if (!entry) return null;
    try {
      const src = await photoEntryToDataUrl(entry);
      if (!src) return null;
      return await rotateImageDataUrl(src);
    } catch (err) {
      console.error("Failed to rotate photo:", err);
      return null;
    }
  }, []);

  const rotateConfirmedPhoto = useCallback(
    async (position) => {
      if (rotatingPhotoSide) return;
      const entry = position === "front" ? frontPhoto : backPhoto;
      if (!entry) return;
      setRotatingPhotoSide(position);
      try {
        const rotatedUrl = await rotateImageEntry(entry);
        if (!rotatedUrl) return;
        const nextEntry = {
          ...entry,
          url: rotatedUrl,
          file: undefined,
        };
        if (position === "front") {
          setFrontPhoto(nextEntry);
          syncListingPhotos(nextEntry, backPhoto);
        } else {
          setBackPhoto(nextEntry);
          syncListingPhotos(frontPhoto, nextEntry);
        }
        resetCardIntel();
        clearCorners();
      } finally {
        setRotatingPhotoSide(null);
      }
    },
    [
      rotatingPhotoSide,
      frontPhoto,
      backPhoto,
      syncListingPhotos,
      resetCardIntel,
      clearCorners,
      rotateImageEntry,
    ]
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

  const renderPreflightNotice = (position, label) => {
    const result = photoPreflight[position];
    if (!result || preflightDismissed[position]) return null;
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    if (!warnings.length) return null;
    return (
      <div className="mt-3 rounded-2xl border border-[#F6D48F]/35 bg-black/40 p-3 text-sm text-white/85">
        <div className="text-[11px] uppercase tracking-[0.35em] text-[#F6D48F] mb-1">
          Quick check
        </div>
        <p className="text-xs text-white/70">
          This photo may be hard to read — want to retake?
        </p>
        <ul className="space-y-1 text-xs text-white/75 mt-2">
          {warnings.map((warning, idx) => (
            <li key={`${position}-warn-${idx}`} className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#F6D48F]/80" />
              <span>{warning.message}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col sm:flex-row gap-2 mt-3">
          <button
            type="button"
            className="flex-1 rounded-2xl border border-white/20 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/80 hover:border-white/45 transition"
            onClick={() => handleBrowse(position)}
          >
            Retake {label}
          </button>
          <button
            type="button"
            className="flex-1 rounded-2xl border border-transparent px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-white/50 hover:text-white/80 transition"
            onClick={() => dismissPreflight(position)}
          >
            Continue anyway
          </button>
        </div>
      </div>
    );
  };

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
      {renderPreflightNotice(position, label)}
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
          disabled={Boolean(rotatingPhotoSide)}
          className="px-4 rounded-xl border border-white/10 text-[11px] uppercase tracking-[0.25em] text-white/55 hover:border-white/40 transition"
          onClick={() => rotateConfirmedPhoto(position)}
        >
          {rotatingPhotoSide === position ? "Rotating..." : "🔄 Rotate 90°"}
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

      <div className="mt-4 text-xs text-white/60 flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-[#E8D5A8]/80"></span>
        We balanced lighting for analysis.
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

  const closeAdjustOverlay = useCallback(() => {
    handleAdjustPointerUp();
    setAdjustTarget(null);
  }, [handleAdjustPointerUp]);

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
    requestSportsAnalysis({ force: true, bypassAllGuards: true }).catch((err) => {
      console.error("Failed to trigger sports analysis:", err);
    });
    navigate("/single-listing", {
      state: {
        fromAnalysis: true,
        source: "sportsSuite",
        mode: "sports",
        listingData,
      },
    });
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

  const renderCornerAdjustOverlay = () => {
    if (stage !== STAGES.CONFIRM || !adjustTarget) return null;
    const targetEntry =
      cornerMap[adjustTarget.sideKey]?.[adjustTarget.cornerKey] || null;
    const targetInfo = CORNER_POSITIONS.find(
      (corner) => corner.key === adjustTarget.cornerKey
    );
    if (!targetEntry || !targetInfo) return null;
    const prettySide = adjustTarget.sideKey === "front" ? "Front" : "Back";
    const isBusy =
      adjustBusyKey === `${adjustTarget.sideKey}-${adjustTarget.cornerKey}`;

    const renderArrowButton = (axis, direction, label) => (
      <button
        type="button"
        className="adjust-arrow rounded-xl border border-white/20 hover:border-white/50 disabled:opacity-30"
        disabled={isBusy || isAxisClamped(targetEntry, axis, direction)}
        onPointerDown={(event) => {
          event.stopPropagation();
          handleAdjustPointerDown(
            event,
            adjustTarget.sideKey,
            adjustTarget.cornerKey,
            axis,
            direction
          );
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          handleAdjustPointerUp();
        }}
        onPointerLeave={(event) => {
          event.stopPropagation();
          handleAdjustPointerUp();
        }}
        onPointerCancel={(event) => {
          event.stopPropagation();
          handleAdjustPointerUp();
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (adjustPointerActiveRef.current) return;
          handleAdjustMove(
            adjustTarget.sideKey,
            adjustTarget.cornerKey,
            axis,
            direction
          );
        }}
      >
        {label}
      </button>
    );

    return (
      <div className="corner-adjust-overlay" onClick={closeAdjustOverlay}>
        <div
          className="corner-adjust-panel"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-[11px] uppercase tracking-[0.35em] text-white/60">
              Adjust {prettySide} {targetInfo.label}
            </div>
            <button
              type="button"
              className="text-[10px] uppercase tracking-[0.35em] text-white/40"
              onClick={(event) => {
                event.stopPropagation();
                closeAdjustOverlay();
              }}
            >
              Close
            </button>
          </div>
          <div className="adjust-controls grid grid-cols-3 gap-2 text-lg font-semibold text-white/85">
            <span />
            {renderArrowButton("y", -1, "↑")}
            <span />
            {renderArrowButton("x", -1, "←")}
            {renderArrowButton("y", 1, "↓")}
            {renderArrowButton("x", 1, "→")}
          </div>
          <p className="text-[11px] text-white/50 mt-3 text-center">
            Tap or hold to nudge the corner gently.
          </p>
          <button
            type="button"
            className="mt-4 w-full rounded-full border border-white/20 py-2 text-[10px] uppercase tracking-[0.3em] text-white/70 hover:bg-white/5"
            onClick={(event) => {
              event.stopPropagation();
              closeAdjustOverlay();
            }}
          >
            Done
          </button>
        </div>
      </div>
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
      {renderCornerAdjustOverlay()}

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

      {showCapturePrimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur">
          <div className="w-[min(520px,90vw)] rounded-3xl border border-white/15 bg-[#050505] p-6 text-white shadow-[0_25px_80px_rgba(0,0,0,0.65)]">
            <div className="text-[11px] uppercase tracking-[0.35em] text-white/50">
              Quick capture tip
            </div>
            <h2 className="text-2xl font-semibold mt-2">Keep all four corners visible</h2>
            <p className="text-sm text-white/70 mt-1">
              Flat surface, centered card. That’s it.
            </p>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div className="rounded-2xl border border-emerald-400/30 bg-[#081811] p-4">
                <div className="relative h-36 rounded-xl border border-emerald-300/30 flex items-center justify-center">
                  <div className="w-24 h-32 rounded-lg border-2 border-emerald-200/80 shadow-[0_10px_20px_rgba(0,0,0,0.45)]"></div>
                </div>
                <div className="mt-3 text-xs text-emerald-200 uppercase tracking-[0.3em]">
                  Looks good
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Corners breathing, card centered.
                </p>
              </div>
              <div className="rounded-2xl border border-[#F27B81]/40 bg-[#2b1416] p-4">
                <div className="relative h-36 rounded-xl border border-[#F27B81]/30 bg-[#1a0d0e] flex items-center justify-center overflow-hidden">
                  <div className="absolute -left-4 -top-6 w-28 h-32 rotate-[12deg] rounded-lg border-2 border-[#F27B81]/80 opacity-70"></div>
                  <div className="absolute -right-4 -bottom-6 w-28 h-32 rotate-[-8deg] rounded-lg border-2 border-[#F27B81]/50 opacity-70"></div>
                </div>
                <div className="mt-3 text-xs text-[#F6BDB2] uppercase tracking-[0.3em]">
                  Needs retake
                </div>
                <p className="text-xs text-white/60 mt-1">
                  Tilted or corners cropped.
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 mt-6">
              <button
                type="button"
                className="flex-1 rounded-2xl bg-white text-black py-3 text-sm font-semibold uppercase tracking-[0.3em]"
                onClick={handleCapturePrimerContinue}
              >
                Start {pendingPickerSide === "back" ? "Back" : "Front"} Photo
              </button>
              <button
                type="button"
                className="flex-1 rounded-2xl border border-white/25 text-white/80 py-3 text-sm uppercase tracking-[0.3em] hover:border-white/50 transition"
                onClick={handleCapturePrimerDismiss}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function rotateImageDataUrl(dataUrl) {
  if (!dataUrl) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context unavailable"));
        return;
      }
      ctx.translate(canvas.width, 0);
      ctx.rotate((90 * Math.PI) / 180);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg"));
    };
    img.onerror = (err) => {
      reject(err || new Error("Failed to load image for rotation"));
    };
    img.src = dataUrl;
  });
}
