import { useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import MagicCardPrep from "./MagicCardPrep";
import { useBatchStore } from "../store/useBatchStore";
import { useListingStore } from "../store/useListingStore";

export default function BatchCardPrep() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("cardId");
  const { batchItems, updateBatchItem } = useBatchStore();
  const { listingData, setListing } = useListingStore();
  const loadedCardIdRef = useRef(null);

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
    </>
  );
}
