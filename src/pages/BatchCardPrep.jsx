import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MagicCardPrep from "./MagicCardPrep";
import { useBatchStore } from "../store/useBatchStore";
import { useListingStore } from "../store/useListingStore";
import {
  analyzeCardImages,
  buildCardAttributesFromIntel,
  extractCornerPhotoEntries,
} from "../utils/cardIntel";
import { buildCardTitle } from "../utils/buildCardTitle";

export default function BatchCardPrep() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("cardId");
  const { batchItems, updateBatchItem } = useBatchStore();
  const { listingData, setListing, setListingField } = useListingStore();
  const loadedCardIdRef = useRef(null);
  const [analysisError, setAnalysisError] = useState("");
  const [approving, setApproving] = useState(false);

  const hasCards = batchItems.length > 0;

  useEffect(() => {
    if (!hasCards) {
      navigate("/batch-comps", { replace: true });
      return;
    }
    if (!requestedId) {
      setSearchParams({ cardId: batchItems[0].id }, { replace: true });
    }
  }, [hasCards, requestedId, batchItems, navigate, setSearchParams]);

  const currentIndex = useMemo(
    () => batchItems.findIndex((item) => item.id === requestedId),
    [batchItems, requestedId]
  );
  const currentCard = currentIndex >= 0 ? batchItems[currentIndex] : null;
  const prevCardId = currentIndex > 0 ? batchItems[currentIndex - 1]?.id : null;
  const nextCardId =
    currentIndex >= 0 && currentIndex < batchItems.length - 1
      ? batchItems[currentIndex + 1]?.id
      : null;

  useEffect(() => {
    if (!hasCards || !requestedId) {
      return;
    }
    if (!currentCard && batchItems[0]) {
      setSearchParams({ cardId: batchItems[0].id }, { replace: true });
    }
  }, [hasCards, requestedId, currentCard, batchItems, setSearchParams]);

  useEffect(() => {
    if (!currentCard) return;
    if (loadedCardIdRef.current === currentCard.id) return;
    loadedCardIdRef.current = currentCard.id;
    setListing({
      category: currentCard.category || "Sports Cards",
      photos: currentCard.photos || [],
      secondaryPhotos: currentCard.secondaryPhotos || [],
      cornerPhotos: currentCard.cornerPhotos || [],
      cardIntel: currentCard.cardIntel || null,
      cardAttributes: currentCard.cardAttributes || null,
      pricing: currentCard.pricing || null,
      title: currentCard.title || "",
      batchCardId: currentCard.id,
    });
  }, [currentCard, setListing]);

  useEffect(() => {
    if (!currentCard) return;
    if (listingData.batchCardId !== currentCard.id) return;
    const prepComplete =
      Boolean(listingData.photos?.length) &&
      Boolean(listingData.secondaryPhotos?.length) &&
      (listingData.cornerPhotos?.length || 0) >= 4;
    updateBatchItem(currentCard.id, {
      photos: listingData.photos || [],
      secondaryPhotos: listingData.secondaryPhotos || [],
      cornerPhotos: listingData.cornerPhotos || [],
      cardIntel: listingData.cardIntel || null,
      cardAttributes: listingData.cardAttributes || null,
      pricing: listingData.pricing || null,
      title: listingData.title || "",
      prepComplete,
      batchCardId: currentCard.id,
    });
  }, [
    currentCard,
    listingData.batchCardId,
    listingData.photos,
    listingData.secondaryPhotos,
    listingData.cornerPhotos,
    listingData.cardIntel,
    listingData.cardAttributes,
    listingData.pricing,
    listingData.title,
    updateBatchItem,
  ]);

  if (!hasCards) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-white/70">Load cards in Batch Mode to start prepping.</p>
        <button
          type="button"
          className="lux-continue-btn"
          onClick={() => navigate("/batch-comps")}
        >
          Go to Batch Upload
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4">
        <p className="text-lg text-white/70">Loading selected card…</p>
        <button
          type="button"
          className="lux-continue-btn"
          onClick={() => navigate("/batch-comps")}
        >
          Back to Batch Upload
        </button>
      </div>
    );
  }

  const goToCard = (id) => {
    if (!id) return;
    setSearchParams({ cardId: id }, { replace: true });
  };

  const listingHasFullPrep =
    listingData.batchCardId === currentCard.id &&
    Array.isArray(listingData.photos) &&
    listingData.photos.length > 0 &&
    Array.isArray(listingData.secondaryPhotos) &&
    listingData.secondaryPhotos.length > 0 &&
    Array.isArray(listingData.cornerPhotos) &&
    listingData.cornerPhotos.length >= 4;

  const approveDisabled = !listingHasFullPrep || approving;

  const handleApproveForAnalysis = async () => {
    if (!currentCard || approveDisabled) return;
    const photos = Array.isArray(listingData.photos) ? listingData.photos : [];
    const secondary = Array.isArray(listingData.secondaryPhotos)
      ? listingData.secondaryPhotos
      : [];
    if (!photos.length || !secondary.length) {
      setAnalysisError("Need front & back photos before analysis.");
      return;
    }
    setApproving(true);
    setAnalysisError("");
    try {
      const payload = {
        category: "Sports Cards",
        photos,
        secondaryPhotos: secondary,
      };
      const bundle = [...photos, ...secondary];
      const intel = await analyzeCardImages(payload, { photos: bundle });
      if (!intel) {
        setAnalysisError("Unable to analyze this card. Retake the photos and retry.");
        updateBatchItem(currentCard.id, {
          approvedForAnalysis: false,
          analysisError:
            "Unable to analyze this card. Retake the photos and retry.",
        });
        return;
      }
      const attributes = buildCardAttributesFromIntel(intel) || null;
      if (attributes) {
        setListingField("cardAttributes", attributes);
      }
      setListingField("cardIntel", intel);
      if (intel.pricing) {
        setListingField("pricing", intel.pricing);
      }
      const titleFromIntel =
        buildCardTitle(attributes || {}) ||
        listingData.title ||
        currentCard.title ||
        "";
      if (titleFromIntel) {
        setListingField("title", titleFromIntel);
      }
      const latestCorners = Array.isArray(listingData.cornerPhotos)
        ? listingData.cornerPhotos
        : [];
      if (!latestCorners.length) {
        const extracted = extractCornerPhotoEntries(intel);
        if (extracted.length) {
          setListingField("cornerPhotos", extracted);
        }
      }
      updateBatchItem(currentCard.id, {
        approvedForAnalysis: true,
        analysisError: "",
      });
    } catch (err) {
      console.error("Batch card analysis failed:", err);
      setAnalysisError("Analysis failed. Please retry in a moment.");
      updateBatchItem(currentCard.id, {
        analysisError: "Analysis failed. Please retry in a moment.",
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <>
      <MagicCardPrep />
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="text-xs uppercase tracking-[0.35em] text-white/70">
          Card {currentIndex + 1} / {batchItems.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="lux-small-btn"
            onClick={() => goToCard(prevCardId)}
            disabled={!prevCardId}
          >
            ← Prev
          </button>
          <button
            type="button"
            className="lux-small-btn"
            onClick={() => goToCard(nextCardId)}
            disabled={!nextCardId}
          >
            Next →
          </button>
        </div>
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.3em] text-white/70 hover:text-white transition"
          onClick={() => navigate("/batch-comps")}
        >
          Back to Batch List
        </button>
      </div>
      <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
        <div className="bg-black/70 border border-white/15 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60 mb-2">
            Batch Approval
          </div>
          <p className="text-sm text-white/80 mb-3">
            Confirm the photos look good, then manually approve this card for AI analysis.
          </p>
          <button
            type="button"
            className={`w-full py-3 text-center text-base font-semibold rounded-xl lux-continue-btn ${
              approveDisabled ? "opacity-40 cursor-not-allowed" : ""
            }`}
            disabled={approveDisabled}
            onClick={handleApproveForAnalysis}
          >
            {approving ? "Approving…" : "Approve for Analysis"}
          </button>
          {analysisError && (
            <div className="mt-3 text-xs text-[#F6BDB2]">{analysisError}</div>
          )}
          {currentCard.approvedForAnalysis && !analysisError && (
            <div className="mt-3 text-xs text-[#E8DCC0]">
              Approved — running Single Listing analysis.
            </div>
          )}
        </div>
      </div>
    </>
  );
}
