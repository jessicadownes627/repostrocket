import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useListingStore } from "../store/useListingStore";
import { getPremiumStatus } from "../store/premiumStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { generateMagicDraft } from "../utils/generateMagicDraft";
import {
  analyzeCardImages,
  buildCardAttributesFromIntel,
} from "../utils/cardIntel";
import "../styles/createListing.css";

const confidenceTone = {
  high: "text-emerald-300 border-emerald-300/40",
  medium: "text-[#CBB78A] border-[#CBB78A]/50",
  low: "text-white/60 border-white/20",
};

export default function MagicCardPrep() {
  const navigate = useNavigate();
  const frontInputRef = useRef(null);
  const backInputRef = useRef(null);
  const listingSnapshotRef = useRef(null);
  const {
    listingData,
    setListingField,
    resetListing,
    premiumUsesRemaining,
    consumeMagicUse,
  } = useListingStore();

  const [frontPhoto, setFrontPhoto] = useState(null);
  const [backPhoto, setBackPhoto] = useState(null);
  const [cardIntel, setCardIntel] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [prepError, setPrepError] = useState("");
  const [dragging, setDragging] = useState({ front: false, back: false });
  const analyzingRef = useRef(false);

  useEffect(() => {
    listingSnapshotRef.current = listingData;
  }, [listingData]);

  useEffect(() => {
    analyzingRef.current = analyzing;
  }, [analyzing]);

  const devPremiumOverride =
    typeof window !== "undefined" &&
    window.localStorage.getItem("rr_dev_premium") === "true";
  const isPremiumUser = getPremiumStatus() || devPremiumOverride;
  const canAutoMagic = isPremiumUser || premiumUsesRemaining > 0;

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

  const handleSelect = useCallback(
    async (position, files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;

      try {
        const entry = await prepareEntry(incoming[0], `${position} card photo`);
        if (position === "front") {
          resetListing();
          setBackPhoto(null);
          setCardIntel(null);
          setFrontPhoto(entry);
          syncListingPhotos(entry, backPhoto);
          setListingField("cardIntel", null);
          setListingField("cardAttributes", null);
        } else {
          setBackPhoto(entry);
          syncListingPhotos(frontPhoto, entry);
        }
      } catch (err) {
        console.error("Failed to prepare card photo:", err);
        setPrepError("Unable to load that image. Please try another file.");
      }
    },
    [backPhoto, frontPhoto, prepareEntry, resetListing, setListingField, syncListingPhotos]
  );

  const clearPhoto = useCallback(
    (position) => {
      if (position === "front") {
        setFrontPhoto(null);
        setCardIntel(null);
        resetListing();
      } else {
        setBackPhoto(null);
        syncListingPhotos(frontPhoto, null);
      }
    },
    [frontPhoto, resetListing, syncListingPhotos]
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

  useEffect(() => {
    if (!frontPhoto) return;
    if (!canAutoMagic) return;
    if (analyzingRef.current) return;

    let cancelled = false;

    const runPipeline = async () => {
      setAnalyzing(true);
      setPrepError("");

      try {
        const snapshot = listingSnapshotRef.current || {};
        const photoBundle = [frontPhoto, backPhoto].filter(Boolean);

        const intel = await analyzeCardImages(
          {
            ...snapshot,
            photos: photoBundle,
            secondaryPhotos: backPhoto ? [backPhoto] : [],
            category: "Sports Cards",
          },
          { photos: photoBundle }
        );

        if (cancelled) return;

        if (intel) {
          setCardIntel(intel);
          setListingField("cardIntel", intel);
          const attributes = buildCardAttributesFromIntel(intel);
          if (attributes) {
            setListingField("cardAttributes", attributes);
          }
        }

        const draftInput = {
          ...snapshot,
          photos: frontPhoto ? [frontPhoto] : [],
          secondaryPhotos: backPhoto ? [backPhoto] : [],
          category: "Sports Cards",
          cardIntel: intel || snapshot.cardIntel || null,
        };

        const draft = await generateMagicDraft(draftInput, {
          glowMode: true,
          cardIntel: intel || snapshot.cardIntel || null,
          cardMode: true,
        });

        if (!cancelled && draft?.parsed) {
          const { parsed } = draft;
          if (parsed.title?.after) setListingField("title", parsed.title.after);
          if (parsed.description?.after)
            setListingField("description", parsed.description.after);
          if (parsed.price?.after) setListingField("price", parsed.price.after);
          if (Array.isArray(parsed.tags?.after) && parsed.tags.after.length) {
            setListingField("tags", parsed.tags.after);
          }
          if (parsed.category_choice) {
            setListingField("category", parsed.category_choice);
          }
        }

        if (!cancelled && !isPremiumUser) {
          consumeMagicUse();
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Sports Card Studio pipeline failed:", err);
          setPrepError("Unable to understand that card. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setAnalyzing(false);
        }
      }
    };

    runPipeline();
    return () => {
      cancelled = true;
    };
  }, [
    frontPhoto,
    backPhoto,
    canAutoMagic,
    isPremiumUser,
    setListingField,
    consumeMagicUse,
  ]);

  const goNext = () => {
    if (!frontPhoto || !backPhoto || analyzing) return;
    navigate("/single-listing");
  };

  const renderConfidenceBadge = (field) => {
    const level = cardIntel?.confidence?.[field];
    if (!level) return null;
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${confidenceTone[level] || confidenceTone.low}`}
      >
        {level}
      </span>
    );
  };

  const renderIntelRow = (label, value, field) => (
    <div className="text-white/90">
      <div className="text-[11px] uppercase tracking-[0.35em] opacity-70 flex items-center">
        {label}
        {renderConfidenceBadge(field)}
      </div>
      <div className="mt-1 text-sm">
        {value || <span className="opacity-40">—</span>}
      </div>
    </div>
  );

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
            clearPhoto(position);
          }}
        >
          Remove {label}
        </button>
      )}
    </div>
  );

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
        Upload the front and back of your card. We’ll read the fine print to
        identify player, year, set, and card number before drafting.
      </p>

      <div className="grid gap-6 md:grid-cols-2 relative z-20">
        {renderUploadSlot("front", "Front of card", frontPhoto, frontInputRef)}
        {renderUploadSlot("back", "Back of card", backPhoto, backInputRef)}
      </div>

      {!backPhoto && frontPhoto && (
        <div className="mt-3 text-xs text-center text-white/60 tracking-[0.35em]">
          Add the back for higher confidence on set + numbering.
        </div>
      )}

      {analyzing && (
        <div className="text-center mt-6 text-sm uppercase tracking-[0.35em] text-[#E8DCC0]">
          Understanding card…
        </div>
      )}

      {prepError && (
        <div className="mt-4 text-center text-sm text-red-300">{prepError}</div>
      )}

      {cardIntel && (
        <div className="mt-8 rounded-2xl border border-[#E8DCC0]/30 bg-black/40 p-6 relative z-20">
          <div className="text-[11px] uppercase tracking-[0.45em] text-[#E8DCC0]/80">
            Card Identity
          </div>
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            {renderIntelRow("Player", cardIntel.player, "player")}
            {renderIntelRow("Team", cardIntel.team, "team")}
            {renderIntelRow("Year", cardIntel.year, "year")}
            {renderIntelRow("Set", cardIntel.setName, "setName")}
            {renderIntelRow("Card #", cardIntel.cardNumber, "cardNumber")}
            {renderIntelRow("Brand", cardIntel.brand, "brand")}
          </div>
          {cardIntel.notes && (
            <p className="mt-4 text-sm text-white/70">{cardIntel.notes}</p>
          )}
          <p className="mt-3 text-xs text-white/50">
            Confidence is highest when both sides of the card are visible.
          </p>
        </div>
      )}

      <div className="mt-auto pt-10 relative z-30">
        {frontPhoto && !backPhoto && (
          <p className="text-center text-xs text-red-300 mb-3">
            Add a photo of the back of the card to continue.
          </p>
        )}
        <button
          onClick={goNext}
          disabled={!frontPhoto || !backPhoto || analyzing}
          className={`w-full py-4 text-lg font-semibold rounded-xl lux-continue-btn ${
            !frontPhoto || !backPhoto || analyzing
              ? "opacity-40 cursor-not-allowed"
              : ""
          }`}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
