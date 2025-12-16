import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { buildCornerPreviewFromEntries } from "../utils/cardIntel";
import "../styles/createListing.css";

const CORNER_POSITIONS = [
  { key: "topLeft", label: "Top Left" },
  { key: "topRight", label: "Top Right" },
  { key: "bottomLeft", label: "Bottom Left" },
  { key: "bottomRight", label: "Bottom Right" },
];

export default function MagicCardPrep() {
  const navigate = useNavigate();
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const {
    listingData,
    setListingField,
    resetListing,
  } = useListingStore();

  const [frontPhoto, setFrontPhoto] = useState(listingData?.photos?.[0] || null);
  const [backPhoto, setBackPhoto] = useState(
    listingData?.secondaryPhotos?.[0] || null
  );
  const [prepError, setPrepError] = useState("");
  const [dragging, setDragging] = useState({ front: false, back: false });
  const [cornerEntries, setCornerEntries] = useState(
    Array.isArray(listingData?.cornerPhotos) ? listingData.cornerPhotos : []
  );
  const [cornerLoading, setCornerLoading] = useState(false);
  const [cornerError, setCornerError] = useState("");

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

  const clearCorners = useCallback(() => {
    setCornerEntries([]);
    setListingField("cornerPhotos", []);
    setCornerError("");
  }, [setListingField]);

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
    resetListing("sports_cards");
    resetCardIntel();
    setListingField("cornerPhotos", []);
    setFrontPhoto(null);
    setBackPhoto(null);
    clearCorners();
    setPrepError("");
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
      clearCorners();
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
        setCornerEntries(entries);
        setListingField("cornerPhotos", entries);
      } catch (err) {
        if (!cancelled) {
          console.error("Corner preview failed:", err);
          setCornerEntries([]);
          setListingField("cornerPhotos", []);
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
  }, [frontPhoto, backPhoto, clearCorners, setListingField]);

  const renderUploadSlot = (position, label, photo, inputRef) => (
    <div>
      <div className="text-xs uppercase tracking-[0.4em] text-white/60 mb-2">
        {label}
      </div>
      <div
        className={`lux-upload-zone relative flex items-center justify-center min-h-[180px] cursor-pointer ${
          dragging[position] ? "lux-upload-hover" : ""
        }`}
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
          <div className="text-center">
            <p className="text-lg opacity-80">Upload {label.toLowerCase()}</p>
            <p className="text-sm opacity-60">JPEG / PNG supported</p>
          </div>
        )}
      </div>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={inputRef}
        onChange={(e) => handleSelect(position, e.target.files)}
      />
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

  const hasFullCoverage =
    Boolean(frontPhoto && backPhoto && cornerEntries.length >= 4 && !cornerLoading);

  const handleAnalyze = () => {
    if (!hasFullCoverage) return;
    navigate("/single-listing");
  };

  const getCornerEntry = (key) => {
    const frontMatch = cornerEntries.find(
      (entry) => entry.cornerKey === key && entry.side === "Front"
    );
    if (frontMatch) return frontMatch;
    return cornerEntries.find((entry) => entry.cornerKey === key);
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

      <p className="text-center opacity-65 text-sm mb-4">
        Confirm coverage for the card you just captured. These exact photos move into analysis next.
      </p>

      <div className="grid gap-6 md:grid-cols-2 relative z-20">
        {renderUploadSlot("front", "Front of card", frontPhoto, frontInputRef)}
        {renderUploadSlot("back", "Back of card", backPhoto, backInputRef)}
      </div>

      {!backPhoto && frontPhoto && (
        <div className="mt-3 text-xs text-center text-white/60 tracking-[0.35em]">
          Add the back to unlock corner coverage.
        </div>
      )}

      {prepError && (
        <div className="mt-4 text-center text-sm text-red-300">{prepError}</div>
      )}

      <div className="mt-10 rounded-2xl border border-[#E8DCC0]/30 bg-black/40 p-6 relative z-20">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] uppercase tracking-[0.45em] text-[#E8DCC0]/80">
            Corner Coverage
          </div>
          <div className="text-xs text-white/60">
            Auto-generated for condition analysis
          </div>
        </div>

        {cornerLoading && (
          <div className="text-sm text-white/70">
            Capturing corner crops…
          </div>
        )}

        {!cornerLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {CORNER_POSITIONS.map((corner) => {
              const entry = getCornerEntry(corner.key);
              return (
                <div
                  key={corner.key}
                  className="text-center text-[11px] uppercase tracking-[0.25em]"
                >
                  <div className="mb-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                    {entry ? (
                      <img
                        src={entry.url}
                        alt={entry.altText}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="h-24 flex items-center justify-center text-[10px] opacity-40">
                        Waiting for coverage
                      </div>
                    )}
                  </div>
                  <div className="text-white/70">{corner.label}</div>
                </div>
              );
            })}
          </div>
        )}

        {cornerError && (
          <div className="mt-4 text-xs text-red-300">{cornerError}</div>
        )}

        <p className="mt-5 text-xs text-white/55">
          Corners are locked after this step and power the condition scoring you’ll see next.
        </p>
      </div>

      <div className="mt-10 flex flex-col sm:flex-row gap-3 relative z-30">
        <button
          onClick={handleAnalyze}
          disabled={!hasFullCoverage}
          className={`flex-1 py-4 text-lg font-semibold rounded-xl lux-continue-btn ${
            !hasFullCoverage ? "opacity-40 cursor-not-allowed" : ""
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
    </div>
  );
}
