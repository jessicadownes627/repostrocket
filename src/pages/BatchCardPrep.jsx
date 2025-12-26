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
import AnalysisProgress from "../components/AnalysisProgress";

const CORNER_LABELS = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};
const CARD_IDENTITY_FIELDS = [
  { key: "player", label: "Player" },
  { key: "team", label: "Team" },
  { key: "year", label: "Year" },
  { key: "setName", label: "Set" },
];

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
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [analysisInitialized, setAnalysisInitialized] = useState(false);
  const [filterNeedsVerification, setFilterNeedsVerification] = useState(false);
  const [openEvidenceField, setOpenEvidenceField] = useState(null);

  const hasCards = batchItems.length > 0;
  const visibleCards = useMemo(
    () => (filterNeedsVerification ? batchItems.filter(cardNeedsVerification) : batchItems),
    [batchItems, filterNeedsVerification]
  );
  const hasVisibleCards = visibleCards.length > 0;
  const filterActiveButEmpty = filterNeedsVerification && !hasVisibleCards;

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
    () => visibleCards.findIndex((item) => item.id === requestedId),
    [visibleCards, requestedId]
  );
  const currentCard = currentIndex >= 0 ? visibleCards[currentIndex] : null;
  const prevCardId = currentIndex > 0 ? visibleCards[currentIndex - 1]?.id : null;
  const nextCardId =
    currentIndex >= 0 && currentIndex < visibleCards.length - 1
      ? visibleCards[currentIndex + 1]?.id
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
  const cardIdentityStatuses = useMemo(() => {
    const manualOverrides = activeCardAttributes?.manualOverrides || {};
    const suggestions = activeCardIntel?.manualSuggestions || {};
    return CARD_IDENTITY_FIELDS.reduce((acc, field) => {
      const verified =
        activeCardIntel?.sources?.[field.key] === "ocr" &&
        activeCardIntel?.isTextVerified?.[field.key];
      const baseValue =
        field.key === "setName"
          ? activeCardAttributes?.set || activeCardAttributes?.setName || ""
          : activeCardAttributes?.[field.key] || "";
      const manualValue =
        typeof manualOverrides[field.key] === "string"
          ? manualOverrides[field.key]
          : "";
      const suggestion =
        typeof suggestions[field.key] === "string" ? suggestions[field.key] : "";
      acc[field.key] = {
        verified,
        baseValue,
        manualValue,
        hasManual: Boolean(manualValue),
        suggestion,
        hasSuggestion: Boolean(suggestion),
        needsManual: !verified && !manualValue,
      };
      return acc;
    }, {});
  }, [activeCardAttributes, activeCardIntel]);

  const identityEvidenceByField = useMemo(() => {
    const map = {};
    CARD_IDENTITY_FIELDS.forEach(({ key }) => {
      map[key] = [];
    });
    if (Array.isArray(activeCardIntel?.sourceEvidence)) {
      activeCardIntel.sourceEvidence.forEach((line) => {
        if (typeof line !== "string") return;
        CARD_IDENTITY_FIELDS.forEach(({ key }) => {
          if (line.toLowerCase().includes(`-> ${key.toLowerCase()}`)) {
            map[key].push(line);
          }
        });
      });
    }
    return map;
  }, [activeCardIntel?.sourceEvidence]);

  const verifiedIdentityFields = useMemo(
    () => CARD_IDENTITY_FIELDS.filter((field) => cardIdentityStatuses[field.key]?.verified),
    [cardIdentityStatuses]
  );
  const hasVerifiedIdentity = verifiedIdentityFields.length > 0;
  const totalIdentityFields = CARD_IDENTITY_FIELDS.length;
  const verifiedIdentityCount = verifiedIdentityFields.length;

  useEffect(() => {
    if (!hasCards || !requestedId) {
      return;
    }
    if (!currentCard && batchItems[0]) {
      setSearchParams({ cardId: batchItems[0].id }, { replace: true });
    }
  }, [hasCards, requestedId, currentCard, batchItems, setSearchParams]);

  useEffect(() => {
    if (!filterNeedsVerification || !hasVisibleCards) return;
    if (visibleCards.some((item) => item.id === requestedId)) return;
    if (visibleCards[0]) {
      setSearchParams({ cardId: visibleCards[0].id }, { replace: true });
    }
  }, [filterNeedsVerification, hasVisibleCards, visibleCards, requestedId, setSearchParams]);

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
      (listingData.cornerPhotos?.length || 0) >= 8;
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

  useEffect(() => {
    setOpenEvidenceField(null);
  }, [currentCard?.id]);

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

  if (filterActiveButEmpty) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg text-white/70">
          Every card is already verified. Turn off “Needs verification” to review all cards.
        </p>
        <button
          type="button"
          className="lux-continue-btn"
          onClick={() => setFilterNeedsVerification(false)}
        >
          Show all cards
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

  const cardNeedsVerification = (card) => {
    if (!card) return true;
    const attrs = card.cardAttributes;
    if (!attrs) return true;
    return attrs.needsUserConfirmation !== false;
  };

  const listingHasFullPrep =
    listingData.batchCardId === currentCard.id &&
    Array.isArray(listingData.photos) &&
    listingData.photos.length > 0 &&
    Array.isArray(listingData.secondaryPhotos) &&
    listingData.secondaryPhotos.length > 0 &&
    Array.isArray(listingData.cornerPhotos) &&
    listingData.cornerPhotos.length >= 8;

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

  const getConfidenceDescription = (level) => {
    if (!level) return "";
    if (level === "high") return "High confidence: corner image is crisp and well-framed.";
    if (level === "medium")
      return "Medium confidence: corner is visible but slightly cropped, angled, or soft.";
    return "Low confidence: image lacks clarity — consider retaking if the corner matters.";
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
        title={getConfidenceDescription(level)}
      >
        {level}
      </span>
    );
  };

  const showAnalysisResults = Boolean(
    currentCard.approvedForAnalysis &&
      (activeCardAttributes || activeCardIntel || activePricing)
  );
  const canShowAnalysisView = approving || showAnalysisResults;

  useEffect(() => {
    if (!canShowAnalysisView) {
      setAnalysisVisible(false);
      setAnalysisInitialized(false);
      return;
    }
    if (!analysisInitialized) {
      setAnalysisVisible(true);
      setAnalysisInitialized(true);
    }
  }, [canShowAnalysisView, analysisInitialized]);

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
    setAnalysisError("");
    setAnalysisVisible(true);
    setApproving(true);
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
      if (!intel || intel.error) {
        const message =
          intel?.error || "Unable to analyze this card. Retake the photos and retry.";
        setAnalysisError(message);
        updateBatchItem(currentCard.id, {
          approvedForAnalysis: false,
          analysisError: message,
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

  const renderAnalysisView = () => {
    if (!canShowAnalysisView) {
      return null;
    }
    if (!showAnalysisResults) {
      return (
        <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col bg-black text-white">
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 px-4">
            <p className="text-lg text-white/70">Analyzing this card…</p>
            <AnalysisProgress active={approving} />
            {analysisError && (
              <p className="text-sm text-[#F6BDB2]">{analysisError}</p>
            )}
          </div>
        </div>
      );
    }
    return (
      <div className="app-wrapper min-h-screen px-6 py-10 flex flex-col bg-black text-white">
        <div className="max-w-4xl mx-auto w-full px-6 mt-4 pb-6">
          <HeaderBar label="Card Details" />

          <div className="lux-card mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs uppercase opacity-70 tracking-wide mb-3">
              <span>Detected Attributes</span>
              <span className="text-white/60 text-[11px]">
                Verified {verifiedIdentityCount} of {totalIdentityFields} identity fields
              </span>
            </div>
            {!hasVerifiedIdentity && (
              <div className="rounded-2xl border border-[#f6d48f]/30 bg-gradient-to-r from-[#352217] to-[#1f120c] px-4 py-3 text-sm text-[#FBEACC] mb-4">
                We couldn’t verify details from the card yet. Confirm them before launching.
              </div>
            )}
            <div className="space-y-4 text-sm opacity-85">
              {CARD_IDENTITY_FIELDS.map(({ key, label }) => {
                const status = cardIdentityStatuses[key] || {};
                const displayValue = status.verified
                  ? status.baseValue
                  : status.hasManual
                  ? status.manualValue
                  : "";
                const manualTag = !status.verified && status.hasManual;
                const isVerified = Boolean(status.verified);
                const isSuggested = !isVerified && !status.hasManual && status.hasSuggestion;
                const isBlank = !isVerified && !status.hasManual && !status.hasSuggestion;
                const hasEvidence = isVerified && identityEvidenceByField[key]?.length > 0;
                const showEvidence = hasEvidence && openEvidenceField === key;
                return (
                  <div key={key}>
                    <div className="flex items-center gap-2">
                      <span className="opacity-60">{label}:</span>
                      {isVerified && (
                        <span className="text-[10px] uppercase tracking-[0.35em] text-[#8FF0C5] border border-[#1F4B37] rounded-full px-2 py-0.5 bg-[#081811]">
                          Verified from card
                        </span>
                      )}
                      {manualTag && (
                        <span className="text-[10px] uppercase tracking-[0.35em] text-white/70 border border-white/20 rounded-full px-2 py-0.5">
                          Entered by you
                        </span>
                      )}
                      {isSuggested && (
                        <span className="text-[10px] uppercase tracking-[0.35em] text-white/70 border border-white/20 rounded-full px-2 py-0.5">
                          Suggested
                        </span>
                      )}
                    </div>
                    <div className="pl-4 mt-1 space-y-2">
                      {isVerified && (
                        <div className="rounded-2xl border border-[#1F4B37] bg-[#061711] px-4 py-3 text-white/90">
                          <div className="flex items-start gap-3">
                            <div className="text-base font-semibold text-white">{displayValue}</div>
                          </div>
                          {hasEvidence && (
                            <>
                              <button
                                type="button"
                                className="mt-2 inline-flex items-center gap-2 text-xs text-[#8FF0C5] hover:text-white transition"
                                onClick={() =>
                                  setOpenEvidenceField((prev) => (prev === key ? null : key))
                                }
                              >
                                {showEvidence ? "Hide proof" : "Show proof"}
                              </button>
                              {showEvidence && (
                                <ul className="mt-2 space-y-1 text-xs text-white/70">
                                  {identityEvidenceByField[key].slice(0, 3).map((line, idx) => (
                                    <li key={`${key}-evidence-${idx}`} className="flex gap-2">
                                      <span className="h-1.5 w-1.5 rounded-full bg-[#8FF0C5] mt-1" />
                                      <span>{line}</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      {!isVerified && status.hasManual && (
                        <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white/85">
                          <div className="text-xs text-white/60 mb-1">Entered by you</div>
                          <div>{displayValue}</div>
                        </div>
                      )}

                      {isSuggested && (
                        <div className="rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-white/80">
                          <div className="text-xs text-white/60 mb-1">Suggested</div>
                          <div>{status.suggestion}</div>
                        </div>
                      )}

                      {isBlank && (
                        <div className="rounded-2xl border border-dashed border-white/20 px-4 py-3 text-white/40">
                          <div className="text-2xl leading-none">—</div>
                          <div className="text-xs uppercase tracking-[0.3em] mt-1">
                            Not verified yet
                          </div>
                        </div>
                      )}

                      {status.needsManual && (
                        <div className="text-xs text-[#F6D48F] space-y-1">
                          <div>Please confirm this detail before batch launch.</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div>
                <div className="flex items-center gap-2">
                  <span className="opacity-60">Parallel:</span>
                  {renderCardConfidence("parallel")}
                </div>
                <div className="pl-4">
                  {activeCardAttributes?.parallel || <span className="opacity-40">—</span>}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="opacity-60">Card #:</span>
                  {renderCardConfidence("cardNumber")}
                </div>
                <div className="pl-4">
                  {activeCardAttributes?.cardNumber || <span className="opacity-40">—</span>}
                </div>
              </div>
            </div>
          </div>

          {activeCornerData && (
            <div className="lux-card mb-8">
              <div className="flex items-center gap-2 text-xs uppercase opacity-70 tracking-wide mb-2">
                Corner Inspection
              </div>
              <p className="text-xs text-white/55 mb-4">
                Confidence only reflects image clarity (High = clearly framed, Medium = visible but a bit angled). It does not judge card condition.
              </p>
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
                                    className={`w-full h-24 object-cover ${
                                      entry?.manualOverride ? "ring-1 ring-[#E8D5A8]" : ""
                                    }`}
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
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-xs text-white/55">
                Corners are auto-detected for condition analysis. Retake if alignment looks off.
              </p>
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
      </div>
    );
  };

  const renderPrepView = () => (
    <MagicCardPrep analysisActive={approving} />
  );

  return (
    <>
      {analysisVisible ? renderAnalysisView() : renderPrepView()}
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
        <div className="text-xs uppercase tracking-[0.35em] text-white/70 flex flex-col items-end gap-1">
          {hasVisibleCards ? (
            <>
              <span>
                Card {currentIndex + 1} / {visibleCards.length}
              </span>
              {filterNeedsVerification && (
                <span className="text-[10px] text-[#8FF0C5] tracking-[0.3em]">
                  Filter: Needs verification
                </span>
              )}
            </>
          ) : (
            <span>Card — / {batchItems.length}</span>
          )}
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
        {canShowAnalysisView && (
          <button
            type="button"
            className="lux-small-btn"
            onClick={() => setAnalysisVisible((prev) => !prev)}
          >
            {analysisVisible ? "View Prep" : "View Analysis"}
          </button>
        )}
        <button
          type="button"
          className={`text-[11px] uppercase tracking-[0.3em] border rounded-full px-3 py-1 transition ${
            filterNeedsVerification
              ? "border-[#8FF0C5]/60 text-[#8FF0C5]"
              : "border-white/20 text-white/70 hover:text-white"
          }`}
          onClick={() => setFilterNeedsVerification((prev) => !prev)}
        >
          Needs verification
        </button>
        <button
          type="button"
          className="text-[11px] uppercase tracking-[0.3em] text-white/70 hover:text-white transition"
          onClick={() => navigate("/batch-comps")}
        >
          Back to Batch List
        </button>
      </div>
      {!analysisVisible && (
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
      )}
    </>
  );
}
