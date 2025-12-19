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
import CornerAdjustModal from "../components/CornerAdjustModal";
import AnalysisProgress from "../components/AnalysisProgress";

const CORNER_LABELS = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};

const HeaderBar = ({ label }) => (
  <div className="w-full mt-8 mb-6">
    <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
    <div className="text-center text-[13px] uppercase tracking-[0.28em] py-3 opacity-70 text-[var(--lux-text)]">
      {label}
    </div>
    <div className="h-[1px] w-full bg-[var(--lux-border)] opacity-50"></div>
  </div>
);

export default function BatchCardPrep() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedId = searchParams.get("cardId");
  const { batchItems, updateBatchItem } = useBatchStore();
  const { listingData, setListing, setListingField, setBatchItems } = useListingStore();
  const loadedCardIdRef = useRef(null);
  const [analysisError, setAnalysisError] = useState("");
  const [approving, setApproving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [cornerAdjustTarget, setCornerAdjustTarget] = useState(null);

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

  const listingMatchesCard =
    Boolean(currentCard) && listingData.batchCardId === currentCard.id;

  const activeCardAttributes = listingMatchesCard
    ? listingData.cardAttributes || currentCard?.cardAttributes || null
    : currentCard?.cardAttributes || null;
  const activeCardIntel = listingMatchesCard
    ? listingData.cardIntel || currentCard?.cardIntel || null
    : currentCard?.cardIntel || null;
  const activePricing = listingMatchesCard
    ? listingData.pricing ||
      activeCardIntel?.pricing ||
      currentCard?.pricing ||
      null
    : currentCard?.pricing || activeCardIntel?.pricing || null;
  const activeCornerData = activeCardAttributes?.corners || null;
  const activeGrading = activeCardAttributes?.grading || null;
  const activePhotos = listingMatchesCard
    ? listingData.photos || currentCard?.photos || []
    : currentCard?.photos || [];
  const activeSecondaryPhotos = listingMatchesCard
    ? listingData.secondaryPhotos || currentCard?.secondaryPhotos || []
    : currentCard?.secondaryPhotos || [];
  const activeCornerPhotos = listingMatchesCard
    ? listingData.cornerPhotos || currentCard?.cornerPhotos || []
    : currentCard?.cornerPhotos || [];
  const listingTitle = listingMatchesCard
    ? listingData.title || currentCard?.title || ""
    : currentCard?.title || "";

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

  const renderCardConfidence = (field) => {
    const level = activeCardIntel?.confidence?.[field];
    if (!level) return null;
    const tone =
      level === "high"
        ? "text-emerald-300 border-emerald-300/40"
        : level === "medium"
        ? "text-[#CBB78A] border-[#CBB78A]/50"
        : "text-white/60 border-white/20";
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  };

  const renderCornerBadge = (level) => {
    if (!level) return null;
    const tone =
      level === "high"
        ? "text-emerald-300 border-emerald-300/40"
        : level === "medium"
        ? "text-[#CBB78A] border-[#CBB78A]/50"
        : "text-white/60 border-white/20";
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  };

  const showAnalysisResults = Boolean(
    currentCard.approvedForAnalysis &&
      (activeCardAttributes || activeCardIntel || activePricing)
  );

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
      try {
        console.log("[QA] analyzeCardImages invoked", {
          cardId: currentCard.id,
          photos: photos.length,
          secondaryPhotos: secondary.length,
          timestamp: Date.now(),
        });
      } catch (err) {
        // swallow logging errors
      }
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

  const handleCornerAdjustSave = useCallback(
    (target, dataUrl) => {
      if (!target || !dataUrl) return;
      const sideLabel = target.sideLabel?.toLowerCase() || "";
      const updatedPhotos = (listingData.cornerPhotos || []).map((entry) =>
        entry &&
        entry.cornerKey === target.cornerKey &&
        (entry.side || "").toLowerCase() === sideLabel
          ? { ...entry, url: dataUrl, manualOverride: true }
          : entry
      );
      setListingField("cornerPhotos", updatedPhotos);

      const existingCorners = listingData.cardAttributes?.corners || {};
      const sideKey = target.sideKey;
      const sideSet = existingCorners?.[sideKey] || {};
      const updatedSide = {
        ...sideSet,
        [target.cornerKey]: {
          ...(sideSet?.[target.cornerKey] || {}),
          image: dataUrl,
          manualOverride: true,
        },
      };

      setListingField("cardAttributes", {
        ...(listingData.cardAttributes || {}),
        corners: {
          ...existingCorners,
          [sideKey]: updatedSide,
        },
      });
      setCornerAdjustTarget(null);
    },
    [listingData.cornerPhotos, listingData.cardAttributes, setListingField]
  );

  const handleSendToLaunchDeck = () => {
    if (!showAnalysisResults || launching) return;
    setLaunching(true);
    try {
      const payloadItem = {
        id: currentCard.id,
        title: listingTitle || "",
        description: "",
        price: activePricing?.suggestedListPrice
          ? String(activePricing.suggestedListPrice)
          : "",
        category: "Sports Cards",
        cardAttributes: activeCardAttributes || null,
        cardIntel: activeCardIntel || null,
        pricing: activePricing || null,
        cornerPhotos: activeCornerPhotos || [],
        photos: activePhotos || [],
        secondaryPhotos: activeSecondaryPhotos || [],
      };
      try {
        console.log("[QA] Launch Deck payload", {
          cardId: payloadItem.id,
          photos: payloadItem.photos?.length || 0,
          secondaryPhotos: payloadItem.secondaryPhotos?.length || 0,
          title: payloadItem.title,
          price: payloadItem.price,
          timestamp: Date.now(),
        });
      } catch (err) {
        // ignore logging failures
      }
      setBatchItems([payloadItem]);
      navigate("/batch-launch", { state: { items: [payloadItem] } });
    } finally {
      setLaunching(false);
    }
  };

  return (
    <>
      <MagicCardPrep analysisActive={approving} />
      {showAnalysisResults && (
        <div className="max-w-4xl mx-auto w-full px-6 mt-10 pb-6">
          <HeaderBar label="Card Details" />

          <div className="lux-card mb-8">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
              Detected Attributes
            </div>
            <div className="space-y-1 text-sm opacity-85">
              <div className="flex items-center gap-2">
                <span className="opacity-60">Player:</span>
                {renderCardConfidence("player")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.player || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Team:</span>
                {renderCardConfidence("team")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.team || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Year:</span>
                {renderCardConfidence("year")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.year || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Set:</span>
                {renderCardConfidence("setName")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.set ||
                  activeCardAttributes?.setName || (
                    <span className="opacity-40">—</span>
                  )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Parallel:</span>
                {renderCardConfidence("parallel")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.parallel || (
                  <span className="opacity-40">—</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="opacity-60">Card #:</span>
                {renderCardConfidence("cardNumber")}
              </div>
              <div className="pl-4">
                {activeCardAttributes?.cardNumber || (
                  <span className="opacity-40">—</span>
                )}
              </div>
            </div>
          </div>

          {activeCornerData && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Corner Inspection
              </div>
              <div className="space-y-4">
                {["front", "back"].map((side) => {
                  const cornerSet = activeCornerData?.[side];
                  if (!cornerSet) return null;
                  const condition =
                    activeCardAttributes?.cornerCondition?.[side];
                  const prettySide = side === "front" ? "Front" : "Back";
                  return (
                    <div key={side}>
                      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.35em] opacity-70">
                        {prettySide} Corners
                        {renderCornerBadge(condition?.confidence)}
                      </div>
                      {condition?.description && (
                        <div className="text-xs opacity-60 mt-1">
                          Looks {condition.description}.
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {Object.entries(CORNER_LABELS).map(([key, label]) => {
                          const entry = cornerSet[key];
                          return (
                            <div
                              key={`${side}-${key}`}
                              className="text-center text-[11px] uppercase tracking-[0.25em]"
                            >
                              <div className="mb-2 rounded-2xl border border-white/10 bg-black/30 overflow-hidden">
                                {entry?.image ? (
                                  <img
                                    src={entry.image}
                                    alt={`${prettySide} ${label}`}
                                    className={`w-full h-24 object-cover ${entry.manualOverride ? "ring-1 ring-[#E8D5A8]" : ""}`}
                                  />
                                ) : (
                                  <div className="h-24 flex items-center justify-center text-[10px] opacity-40">
                                    No data
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center justify-center gap-2 text-[10px] tracking-[0.3em]">
                                {label}
                                {renderCornerBadge(entry?.confidence)}
                              </div>
                              {entry?.image && (
                                <button
                                  type="button"
                                  className="mt-2 text-[10px] tracking-[0.25em] text-[#E8D5A8]"
                                  onClick={() =>
                                    setCornerAdjustTarget({
                                      url: entry.image,
                                      label: `${prettySide} ${label}`,
                                      sideKey: side,
                                      sideLabel: prettySide,
                                      cornerKey: key,
                                    })
                                  }
                                >
                                  Adjust
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="lux-card mb-8">
            <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
              Grading Assist
            </div>
            {activeGrading ? (
              <div className="space-y-1 text-sm opacity-85">
                <div>
                  <span className="opacity-60">Centering:</span>{" "}
                  {activeGrading.centering || "—"}
                </div>
                <div>
                  <span className="opacity-60">Corners:</span>{" "}
                  {activeGrading.corners || "—"}
                </div>
                <div>
                  <span className="opacity-60">Edges:</span>{" "}
                  {activeGrading.edges || "—"}
                </div>
                <div>
                  <span className="opacity-60">Surface:</span>{" "}
                  {activeGrading.surface || "—"}
                </div>
              </div>
            ) : (
              <div className="text-sm text-white/55">
                No grading data available for this card yet.
              </div>
            )}
          </div>

          {activePricing && (
            <div className="lux-card mb-8">
              <div className="text-xs uppercase opacity-70 tracking-wide mb-3">
                Market Value Assist
              </div>

              <div className="space-y-1 text-sm opacity-85">
                <div>
                  <span className="opacity-60">Recent Low:</span>{" "}
                  {activePricing.low ? `$${activePricing.low}` : "—"}
                </div>
                <div>
                  <span className="opacity-60">Recent Mid:</span>{" "}
                  {activePricing.mid ? `$${activePricing.mid}` : "—"}
                </div>
                <div>
                  <span className="opacity-60">Recent High:</span>{" "}
                  {activePricing.high ? `$${activePricing.high}` : "—"}
                </div>
                <div className="mt-2">
                  <span className="opacity-60">Suggested List Price:</span>{" "}
                  {activePricing.suggestedListPrice
                    ? `$${activePricing.suggestedListPrice}`
                    : "—"}
                </div>
                <div>
                  <span className="opacity-60">Confidence:</span>{" "}
                  {activePricing.confidence || "—"}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <button
                  onClick={() => {
                    const encoded = encodeURIComponent(listingTitle || "");
                    if (!encoded) return;
                    window.open(
                      `https://www.ebay.com/sch/i.html?_nkw=${encoded}`,
                      "_blank",
                      "noopener"
                    );
                  }}
                  className="lux-small-btn"
                >
                  Open eBay
                </button>

                <button
                  onClick={() => {
                    const encoded = encodeURIComponent(listingTitle || "");
                    if (!encoded) return;
                    window.open(
                      `https://www.mercari.com/search/?keyword=${encoded}`,
                      "_blank",
                      "noopener"
                    );
                  }}
                  className="lux-small-btn"
                >
                  Open Mercari
                </button>

                <button
                  onClick={() => {
                    if (!listingTitle) return;
                    navigator?.clipboard?.writeText?.(listingTitle);
                  }}
                  className="lux-small-btn"
                >
                  Copy Title
                </button>
              </div>
            </div>
          )}

          <div className="mt-8">
            <button
              type="button"
              className={`w-full py-4 text-lg font-semibold rounded-2xl lux-continue-btn ${
                launching ? "opacity-60 cursor-not-allowed" : ""
              }`}
              onClick={handleSendToLaunchDeck}
              disabled={launching}
            >
              {launching ? "Sending…" : "Send to Launch Deck →"}
            </button>
          </div>
        </div>
      )}
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
          {approving && <AnalysisProgress active={approving} />}
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
      <CornerAdjustModal
        target={
          cornerAdjustTarget
            ? {
                url: cornerAdjustTarget.url,
                label: cornerAdjustTarget.label,
              }
            : null
        }
        onClose={() => setCornerAdjustTarget(null)}
        onSave={(dataUrl) => {
          if (!cornerAdjustTarget) return;
          handleCornerAdjustSave(
            {
              sideLabel: cornerAdjustTarget.sideLabel,
              sideKey: cornerAdjustTarget.sideKey,
              cornerKey: cornerAdjustTarget.cornerKey,
            },
            dataUrl
          );
        }}
      />
    </>
  );
}
