import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getPhotoUrl } from "../utils/photoHelpers";
import { evaluatePhotoPreflight } from "../utils/photoPreflight";
import {
  buildMarketplaceExportSet,
  downloadMarketplaceZip,
  downloadBatchMarketplaceZip,
  getPhotoSignature as getMarketplacePhotoSignature,
} from "../utils/marketplacePhotoExports";
import usePaywallGate from "../hooks/usePaywallGate";
import PremiumModal from "../components/PremiumModal";

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
  { key: "grade", label: "Grading" },
];
const OPTIONAL_IDENTITY_FIELDS = new Set(["grade"]);

// ---------------------------------------------------------------------------
// Batch readiness contract (v1 stable)
// DO NOT change without explicit product approval.
// Ready = prep complete + analysis approved + no pending confirmations.
// Needs attention = prep done but approvals or verifications outstanding.
// Not started = prep/capture incomplete. Sorting is deterministic (ready → needs → not started)
// and verified-field counts must always derive from OCR sources for parity with Single Listing.
// ---------------------------------------------------------------------------
function cardNeedsVerification(card) {
  if (!card) return true;
  const attrs = card.cardAttributes;
  if (!attrs) return true;
  return attrs.needsUserConfirmation !== false;
}

function cardPrepComplete(card) {
  return Boolean(card?.prepComplete);
}

function deriveCardStatus(card) {
  if (!cardPrepComplete(card)) return "notStarted";
  if (!card?.approvedForAnalysis || cardNeedsVerification(card)) {
    return "needsAttention";
  }
  return "ready";
}

function countVerifiedIdentityFields(card) {
  if (!card) return 0;
  const intel = card.cardIntel;
  if (!intel) return 0;
  return CARD_IDENTITY_FIELDS.reduce((count, field) => {
    const verified =
      intel?.sources?.[field.key] === "ocr" && intel?.isTextVerified?.[field.key];
    return verified ? count + 1 : count;
  }, 0);
}

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
  const { gate, paywallState, closePaywall } = usePaywallGate();
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
  const [batchPreflightStatus, setBatchPreflightStatus] = useState({});
  const [cardMarketplaceExports, setCardMarketplaceExports] = useState({
    front: null,
    back: null,
  });
  const [cardExportsLoading, setCardExportsLoading] = useState(false);
  const [cardExportsError, setCardExportsError] = useState("");
  const [cardCopyFlash, setCardCopyFlash] = useState(false);
  const [selectedCardIds, setSelectedCardIds] = useState(() => new Set());
  const [bulkExporting, setBulkExporting] = useState(false);
  const [bulkExportError, setBulkExportError] = useState("");
  const requireBatchPremium = (action) => gate("batchMode", action);

  const totalCards = batchItems.length;
  const hasCards = totalCards > 0;
  const {
    cardStatusMap,
    readyCardCount,
    needsAttentionCount,
    notStartedCount,
  } = useMemo(() => {
    const statusMap = {};
    let ready = 0;
    let attention = 0;
    let notStarted = 0;

    batchItems.forEach((card) => {
      const status = deriveCardStatus(card);
      const verifiedCount = countVerifiedIdentityFields(card);
      if (card?.id) {
        statusMap[card.id] = {
          status,
          verifiedCount,
          gradeLabel: card?.cardAttributes?.grade || "",
        };
      }
      if (status === "ready") {
        ready += 1;
      } else if (status === "needsAttention") {
        attention += 1;
      } else {
        notStarted += 1;
      }
    });

    return {
      cardStatusMap: statusMap,
      readyCardCount: ready,
      needsAttentionCount: attention,
      notStartedCount: notStarted,
    };
  }, [batchItems]);

  // Ready-first ordering keeps Batch deterministic for sellers. Do not re-order without revisiting v1 contract.
  const sortedBatchItems = useMemo(() => {
    const priority = { ready: 0, needsAttention: 1, notStarted: 2 };
    const indexMap = new Map();
    batchItems.forEach((card, idx) => {
      indexMap.set(card, idx);
    });
    return [...batchItems].sort((a, b) => {
      const statusA = cardStatusMap[a?.id]?.status || deriveCardStatus(a);
      const statusB = cardStatusMap[b?.id]?.status || deriveCardStatus(b);
      const diff =
        (priority[statusA] ?? 3) -
        (priority[statusB] ?? 3);
      if (diff !== 0) return diff;
      const idxA = indexMap.get(a) ?? 0;
      const idxB = indexMap.get(b) ?? 0;
      return idxA - idxB;
    });
  }, [batchItems, cardStatusMap]);

  const visibleCards = useMemo(() => {
    const source = sortedBatchItems;
    return filterNeedsVerification ? source.filter(cardNeedsVerification) : source;
  }, [sortedBatchItems, filterNeedsVerification]);

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
  const primaryFrontBatchPhoto = activePhotos?.[0] || null;
  const primaryBackBatchPhoto = activeSecondaryPhotos?.[0] || null;
  const frontMarketplaceSignature = useMemo(
    () => getMarketplacePhotoSignature(primaryFrontBatchPhoto),
    [primaryFrontBatchPhoto]
  );
  const backMarketplaceSignature = useMemo(
    () => getMarketplacePhotoSignature(primaryBackBatchPhoto),
    [primaryBackBatchPhoto]
  );
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
          ? activeCardAttributes?.setBrand || activeCardAttributes?.setName || ""
          : activeCardAttributes?.[field.key] || "";
      const manualValue =
        typeof manualOverrides[field.key] === "string"
          ? manualOverrides[field.key]
          : "";
      const suggestion =
        typeof suggestions[field.key] === "string" ? suggestions[field.key] : "";
      const needsManual = OPTIONAL_IDENTITY_FIELDS.has(field.key)
        ? false
        : !verified && !manualValue;
      acc[field.key] = {
        verified,
        baseValue,
        manualValue,
        hasManual: Boolean(manualValue),
        suggestion,
        hasSuggestion: Boolean(suggestion),
        needsManual,
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
  const summarizePreflightResult = useCallback((result) => {
    if (!result) {
      return { label: "Checking…", tone: "muted" };
    }
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    if (!warnings.length) {
      return { label: "Looks centered", tone: "ok" };
    }
    if (warnings.some((warning) => warning.type === "tightCrop")) {
      return { label: "Corner near edge", tone: "warn" };
    }
    if (warnings.some((warning) => warning.type === "lowLight")) {
      return { label: "Lighting issue", tone: "warn" };
    }
    return { label: "May need retake", tone: "warn" };
  }, []);

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
    let cancelled = false;
    const pendingCards = batchItems.filter((item) => !batchPreflightStatus[item.id]);
    if (!pendingCards.length) {
      return () => {
        cancelled = true;
      };
    }

    pendingCards.forEach((item) => {
      const primarySource =
        getPhotoUrl(item.photos?.[0]) || getPhotoUrl(item.secondaryPhotos?.[0]);
      if (!primarySource) {
        setBatchPreflightStatus((prev) => ({
          ...prev,
          [item.id]: { label: "No photo", tone: "warn" },
        }));
        return;
      }
      evaluatePhotoPreflight(primarySource)
        .then((result) => {
          if (cancelled) return;
          setBatchPreflightStatus((prev) => ({
            ...prev,
            [item.id]: summarizePreflightResult(result),
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setBatchPreflightStatus((prev) => ({
            ...prev,
            [item.id]: { label: "Needs check", tone: "muted" },
          }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [batchItems, batchPreflightStatus, summarizePreflightResult]);

  useEffect(() => {
    setSelectedCardIds((prev) => {
      if (!prev.size) return prev;
      const next = new Set();
      batchItems.forEach((card) => {
        if (card?.id && prev.has(card.id)) {
          next.add(card.id);
        }
      });
      return next.size === prev.size ? prev : next;
    });
  }, [batchItems]);

  useEffect(() => {
    if (!frontMarketplaceSignature && !backMarketplaceSignature) {
      setCardMarketplaceExports({ front: null, back: null });
      setCardExportsError("");
      setCardExportsLoading(false);
      return;
    }
    let cancelled = false;
    setCardExportsLoading(true);
    setCardExportsError("");
    buildMarketplaceExportSet(primaryFrontBatchPhoto, primaryBackBatchPhoto)
      .then((result) => {
        if (cancelled) return;
        setCardMarketplaceExports(result);
      })
      .catch((err) => {
        console.error("Batch marketplace export failed:", err);
        if (cancelled) return;
        setCardMarketplaceExports({ front: null, back: null });
        setCardExportsError("Unable to prep ready photos for this card.");
      })
      .finally(() => {
        if (!cancelled) {
          setCardExportsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    frontMarketplaceSignature,
    backMarketplaceSignature,
    primaryFrontBatchPhoto,
    primaryBackBatchPhoto,
  ]);

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

  const selectedCards = useMemo(
    () => batchItems.filter((card) => card?.id && selectedCardIds.has(card.id)),
    [batchItems, selectedCardIds]
  );
  const selectedCount = selectedCards.length;
  const hasSelection = selectedCount > 0;
  const selectedReadyCount = selectedCards.filter(
    (card) => cardStatusMap[card.id]?.status === "ready"
  ).length;
  const selectionAllReady = hasSelection && selectedReadyCount === selectedCount;
  const selectedNeedsPrepId =
    selectedCards.find((card) => cardStatusMap[card.id]?.status !== "ready")?.id || null;

  const toggleCardSelection = (cardId) => {
    if (!cardId) return;
    setBulkExportError("");
    if (selectedCardIds.has(cardId)) {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        next.delete(cardId);
        return next;
      });
      return;
    }
    requireBatchPremium(() => {
      setSelectedCardIds((prev) => {
        const next = new Set(prev);
        next.add(cardId);
        return next;
      });
    });
  };

  const handleSelectAllReady = () => {
    setBulkExportError("");
    if (!readyCardCount) {
      setSelectedCardIds(new Set());
      return;
    }
    requireBatchPremium(() => {
      setSelectedCardIds(() => {
        const next = new Set();
        batchItems.forEach((card) => {
          if (card?.id && cardStatusMap[card.id]?.status === "ready") {
            next.add(card.id);
          }
        });
        return next;
      });
    });
  };

  const handleClearSelection = () => {
    setBulkExportError("");
    setSelectedCardIds(new Set());
  };

  const handlePrepareSelectedCards = () => {
    if (!selectedNeedsPrepId) return;
    setFilterNeedsVerification(false);
    setAnalysisVisible(false);
    goToCard(selectedNeedsPrepId);
  };

  const handleDownloadSelectedReadyPhotos = async () => {
    if (!selectionAllReady) return;
    const readyCards = selectedCards.filter(
      (card) => cardStatusMap[card.id]?.status === "ready"
    );
    if (!readyCards.length) return;
    setBulkExportError("");
    setBulkExporting(true);
    try {
      const exportEntries = [];
      for (const card of readyCards) {
        const frontEntry = card.photos?.[0] || null;
        const backEntry = card.secondaryPhotos?.[0] || null;
        if (!frontEntry && !backEntry) continue;
        const exportSet = await buildMarketplaceExportSet(frontEntry, backEntry);
        if (exportSet) {
          const label =
            (card.title || card.cardAttributes?.generatedTitle || `card-${card.id || ""}`)
              .slice(0, 80) || `card-${card.id || ""}`;
          exportEntries.push({ label, exportSet });
        }
      }
      if (!exportEntries.length) {
        setBulkExportError("Selected cards need fresh exports before download.");
        return;
      }
      await downloadBatchMarketplaceZip(
        exportEntries,
        `batch-ready-${exportEntries.length}`
      );
    } catch (err) {
      console.error("Batch bulk marketplace export failed:", err);
      setBulkExportError("Unable to download photos for selected cards.");
    } finally {
      setBulkExporting(false);
    }
  };

  const handlePrimarySelectionCta = () => {
    if (!hasSelection) return;
    requireBatchPremium(() => {
      if (selectionAllReady) {
        if (!bulkExporting) {
          handleDownloadSelectedReadyPhotos();
        }
      } else {
        handlePrepareSelectedCards();
      }
    });
  };

  const selectionCtaLabel = !hasSelection
    ? "Select cards to continue"
    : selectionAllReady
    ? bulkExporting
      ? "Preparing download…"
      : "Download photos for selected cards"
    : "Prepare selected cards";
  const selectionCtaDisabled = !hasSelection
    ? true
    : selectionAllReady
    ? bulkExporting
    : !selectedNeedsPrepId;
  const selectionCtaSubcopy = !hasSelection
    ? "Choose cards to prep or export."
    : selectionAllReady
    ? `${selectedReadyCount} ready for download`
    : `${selectedCount - selectedReadyCount} need prep first`;
  const selectionSummaryText = hasSelection
    ? `${selectedCount} ${selectedCount === 1 ? "card selected" : "cards selected"}`
    : "No cards selected yet";
  const readySelectionAvailable = readyCardCount > 0;

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

  const cardMarketplaceReady =
    (cardMarketplaceExports.front?.variants?.length || 0) +
      (cardMarketplaceExports.back?.variants?.length || 0) >
    0;

  const handleDownloadBatchMarketplacePhotos = () => {
    if (!cardMarketplaceReady) return;
    const label = (listingTitle || "card-photos").slice(0, 80) || "card-photos";
    downloadMarketplaceZip(cardMarketplaceExports, label);
  };

  const handleCopyBatchMarketplaceNote = async () => {
    if (!cardMarketplaceReady) return;
    const title = listingTitle || "Sports card listing";
    const message = `${title} photos are prepared for listings (Square + 4:5). Generated via Repost Rocket on ${new Date().toLocaleDateString()}.`;
    try {
      await navigator?.clipboard?.writeText?.(message);
      setCardCopyFlash(true);
      window.setTimeout(() => setCardCopyFlash(false), 2000);
    } catch (err) {
      console.error("Failed to copy batch marketplace note:", err);
    }
  };

  const progressPercent = totalCards
    ? Math.min(100, Math.max(0, Math.round((readyCardCount / totalCards) * 100)))
    : 0;
  const statusVisualMap = {
    ready: {
      label: "Ready to list",
      badgeClass:
        "text-emerald-200 border border-emerald-200/40 bg-emerald-500/10",
      cardClass: "border border-emerald-200/35 bg-emerald-500/5",
    },
    needsAttention: {
      label: "Needs attention",
      badgeClass: "text-[#F6D48F] border border-[#F6D48F]/40 bg-[#F6D48F]/10",
      cardClass: "border border-[#F6D48F]/30 bg-[#F6D48F]/5",
    },
    notStarted: {
      label: "Not started",
      badgeClass: "text-white/70 border border-white/20",
      cardClass: "border border-white/15 bg-black/30",
    },
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
            <p className="text-[11px] text-white/45 mb-4">
              Only printed text visible in these photos counts toward verification.
            </p>
            {!hasVerifiedIdentity && (
              <div className="rounded-2xl border border-[#f6d48f]/30 bg-gradient-to-r from-[#352217] to-[#1f120c] px-4 py-3 text-sm text-[#FBEACC] mb-4">
                We couldn’t see the printed card text clearly yet — confirm the remaining rows before launch.
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
                const isOptionalField = OPTIONAL_IDENTITY_FIELDS.has(key);
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
                            {isOptionalField ? "Optional" : "Not verified yet"}
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
              <div className="text-xs uppercase opacity-70 tracking-wide mb-1">
                Pricing insights (beta)
              </div>
              <p className="text-[11px] text-white/55 mb-2">
                Approximate ranges pulled when recent sales data is available.
              </p>
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
      <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-3 w-[260px] max-w-full">
        <div className="w-full rounded-3xl border border-white/15 bg-black/85 p-4 shadow-[0_15px_40px_rgba(0,0,0,0.55)] space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">
                {totalCards
                  ? `${readyCardCount} of ${totalCards} cards ready`
                  : "Batch prep"}
              </div>
              <div className="text-[11px] text-white/55">
                {hasVisibleCards
                  ? `Card ${currentIndex + 1} / ${visibleCards.length}`
                  : `Card — / ${batchItems.length}`}
              </div>
            </div>
          </div>
          <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-emerald-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-white/60">
            <span>{needsAttentionCount} need attention</span>
            <span>{notStartedCount} not started</span>
          </div>
          {readyCardCount === 0 && (
            <p className="text-[11px] text-white/55">
              No cards are ready yet — fix one to get started.
            </p>
          )}
          <div className="text-[11px] text-white/70">{selectionSummaryText}</div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <button
              type="button"
              className={`px-3 py-1 rounded-full border transition ${
                readySelectionAvailable
                  ? "border-white/30 text-white/80 hover:border-white/70"
                  : "border-white/10 text-white/30 cursor-not-allowed"
              }`}
              onClick={handleSelectAllReady}
              disabled={!readySelectionAvailable}
            >
              Select all ready
            </button>
            <button
              type="button"
              className={`px-3 py-1 rounded-full border transition ${
                hasSelection
                  ? "border-white/30 text-white/80 hover:border-white/70"
                  : "border-white/10 text-white/30 cursor-not-allowed"
              }`}
              onClick={handleClearSelection}
              disabled={!hasSelection}
            >
              Clear selection
            </button>
          </div>
          <button
            type="button"
            className={`w-full rounded-2xl py-3 text-xs font-semibold uppercase tracking-[0.35em] transition ${
              selectionCtaDisabled
                ? "bg-white/10 text-white/40 cursor-not-allowed"
                : "bg-white text-black hover:bg-white/90"
            }`}
            onClick={handlePrimarySelectionCta}
            disabled={selectionCtaDisabled}
          >
            {selectionCtaLabel}
          </button>
          <p className="text-[11px] text-white/60">{selectionCtaSubcopy}</p>
          {bulkExportError && (
            <p className="text-[11px] text-[#F6BDB2]">{bulkExportError}</p>
          )}
        </div>
        <div className="flex items-center gap-2 w-full justify-end">
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
        {hasVisibleCards && (
          <div className="w-full max-h-[42vh] overflow-y-auto rounded-3xl border border-white/12 bg-black/75 p-3 space-y-2">
            {visibleCards.map((item, index) => {
              const preflight = batchPreflightStatus[item.id];
              const toneClass =
                preflight?.tone === "ok"
                  ? "text-emerald-200 border-emerald-200/40"
                  : preflight?.tone === "warn"
                  ? "text-[#F6D48F] border-[#F6D48F]/40"
                  : "text-white/60 border-white/25";
              const statusInfo = cardStatusMap[item.id] || {
                status: "notStarted",
                verifiedCount: 0,
              };
              const stateConfig = statusVisualMap[statusInfo.status] || statusVisualMap.notStarted;
              const isActive = item.id === currentCard?.id;
              const isSelected = item.id && selectedCardIds.has(item.id);
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => goToCard(item.id)}
                  className={`w-full rounded-2xl px-3 py-2.5 text-left transition cursor-pointer ${stateConfig.cardClass} ${
                    isActive ? "border-white/60" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs text-white/75">Card {index + 1}</div>
                    <span
                      className={`text-[10px] uppercase tracking-[0.3em] rounded-full px-2 py-0.5 ${stateConfig.badgeClass}`}
                    >
                      {stateConfig.label}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="text-[11px] text-white/60">
                      {statusInfo.verifiedCount || 0} verified
                    </div>
                    <button
                      type="button"
                      className={`text-[10px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border transition ${
                        isSelected
                          ? "border-emerald-300 text-emerald-200 bg-emerald-400/10"
                          : "border-white/25 text-white/60 hover:text-white"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardSelection(item.id);
                      }}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                  {statusInfo.gradeLabel && (
                    <div className="mt-1 text-[11px] text-white/65">{statusInfo.gradeLabel}</div>
                  )}
                  <div className="mt-2 text-[10px] text-white/65">
                    <span className={`rounded-full px-2 py-0.5 border ${toneClass}`}>
                      {preflight?.label || "Checking…"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="w-full rounded-2xl border border-white/10 bg-black/65 p-3 space-y-2 text-sm text-white/75">
          <div className="text-[10px] uppercase tracking-[0.35em] text-white/55">
            Photos prepared for listings
          </div>
          <p className="text-[11px] text-white/60">
            Square + 4:5 outputs padded safely for marketplaces when both photos are available.
          </p>
          {cardExportsError && (
            <div className="text-[11px] text-[#F6BDB2]">{cardExportsError}</div>
          )}
          {cardExportsLoading && (
            <div className="text-[11px] text-white/55">Preparing photos…</div>
          )}
          <button
            type="button"
            className="w-full rounded-2xl bg-white/90 text-black py-2 text-xs font-semibold uppercase tracking-[0.3em] disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleDownloadBatchMarketplacePhotos}
            disabled={!cardMarketplaceReady || cardExportsLoading}
          >
            Download prepared photos
          </button>
          <button
            type="button"
            className="w-full rounded-2xl border border-white/20 py-2 text-xs uppercase tracking-[0.3em] text-white/80 hover:border-white/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleCopyBatchMarketplaceNote}
            disabled={!cardMarketplaceReady}
          >
            {cardCopyFlash ? "Copied" : "Copy “Photos prepared” note"}
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
        <div className="flex flex-col items-end gap-2 w-full">
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
      <PremiumModal
        open={paywallState.open}
        reason={paywallState.reason}
        usage={paywallState.usage}
        limit={paywallState.limit}
        onClose={closePaywall}
      />
    </>
  );
}
