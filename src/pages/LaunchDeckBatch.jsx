import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import "../styles/launchdeck.css";
import PreviewCard from "../components/PreviewCard";
import { buildPlatformPreview } from "../utils/platformPreview";
import { formatDescriptionByPlatform } from "../utils/formatDescriptionByPlatform";

import {
  formatEbay,
  formatMercari,
  formatPoshmark,
  formatDepop,
  formatEtsy,
  formatFacebook,
  formatGrailed,
  formatVinted,
  formatKidizen,
} from "../utils/formatters";

import { runAIReview } from "../utils/safeAI/runAIReview";
import { runMagicFill } from "../utils/safeAI/runMagicFill";
import { runAutoFill } from "../utils/safeAI/runAutoFill";
import { mergeAITurboSignals } from "../utils/aiTurboMerge";
import { autoCropCard } from "../utils/autoCropCard";
import { autoEnhanceCard } from "../utils/autoEnhanceCard";
import {
  transformForEbay,
  transformForWhatnot,
  transformForMercari,
} from "../engines/platformTransforms";
import { groupSportsCards } from "../engines/smartGrouping";
import {
  predictCategoryFromPhoto,
  guessBrandFromPhoto,
  buildSeoKeywords,
  isSportsCardPhoto,
  extractCardYear,
  extractCardNumber,
  extractCardSerial,
  detectCardBrand,
  extractCardPlayer,
  extractCardTeam,
  detectCardParallel,
  autoSportsCardTitle,
  autoSportsCardDescription,
  autoSportsCardSpecifics,
  detectSport,
  detectLeague,
  detectRookie,
  detectGrading,
  detectSlab,
  recommendProtection,
} from "../engines/visionHelpers";
import { smartPriceSense } from "../engines/smartPriceSense";
import CardDetailSidebar from "../components/CardDetailSidebar";
import { deriveAltTextFromFilename, getPhotoUrl, mapPhotosToUrls } from "../utils/photoHelpers";
import { downloadImageFile } from "../utils/magicPhotoTools";
import { getPremiumStatus } from "../store/premiumStore";
import { generateMagicDraft } from "../utils/generateMagicDraft";
import {
  buildCardAttributesFromIntel,
  extractCornerPhotoEntries,
} from "../utils/cardIntel";
import { buildApparelAttributesFromIntel } from "../utils/apparelIntel";
 

const platformFormatters = {
  ebay: formatEbay,
  mercari: formatMercari,
  poshmark: formatPoshmark,
  depop: formatDepop,
  etsy: formatEtsy,
  facebook: formatFacebook,
  grailed: formatGrailed,
  vinted: formatVinted,
  kidizen: formatKidizen,
};

const CORNER_LABELS = {
  topLeft: "Top Left",
  topRight: "Top Right",
  bottomLeft: "Bottom Left",
  bottomRight: "Bottom Right",
};
const GRADING_PATHS = {
  featured: null,
  primary: [
    {
      label: "PSA",
      description: "Industry-standard grading with broad buyer trust.",
      url: "https://www.psacard.com/",
    },
  ],
  alternatives: [
    {
      label: "SGC",
      description: "Popular option for vintage and modern slabs.",
      url: "https://gosgc.com/",
    },
    {
      label: "BGS",
      description: "Beckett grading with subgrades.",
      url: "https://www.beckett.com/grading/",
    },
    {
      label: "CGC",
      description: "Trusted grading for sports + collectibles.",
      url: "https://www.cgccards.com/",
    },
  ],
};

function normalizeBatchItems(payload = []) {
  return payload.map((item, idx) => {
    const basePhotos = Array.isArray(item?.photos) ? [...item.photos] : [];
    const normalizedExtras = [];

    if (Array.isArray(item?.secondaryPhotos)) {
      item.secondaryPhotos.forEach((photo, extraIdx) => {
        if (!photo) return;
        if (typeof photo === "string") {
          normalizedExtras.push({
            url: photo,
            altText: `secondary photo ${extraIdx + 1}`,
          });
        } else {
          normalizedExtras.push(photo);
        }
      });
    } else if (item?.secondaryPhoto) {
      if (typeof item.secondaryPhoto === "string") {
        normalizedExtras.push({
          url: item.secondaryPhoto,
          altText: item.secondaryPhotoAlt || `secondary photo ${idx + 1}`,
        });
      } else {
        normalizedExtras.push(item.secondaryPhoto);
      }
    }

    return {
      ...item,
      photos: normalizedExtras.length
        ? [...basePhotos, ...normalizedExtras]
        : basePhotos,
    };
  });
}

function isBabyApparelListing(item = {}) {
  const category = (item.category || "").toLowerCase();
  if (category.includes("baby") || category.includes("kids") || category.includes("toddler")) {
    return true;
  }
  const text = `${item.title || ""} ${item.description || ""} ${
    Array.isArray(item.tags) ? item.tags.join(" ") : ""
  }`.toLowerCase();
  return /\b(onesie|romper|bodysuit|infant|newborn|0-3m|3-6m|6-9m|12m|18m|24m|toddler|nb)\b/.test(
    text
  );
}

export default function LaunchDeckBatch() {
  const location = useLocation();
  const navigate = useNavigate();

  const fallbackItems = useMemo(() => [], []);
  const rawItems = location.state?.items;
  const items = Array.isArray(rawItems) ? rawItems : fallbackItems;
  const normalizedItems = useMemo(() => normalizeBatchItems(items), [items]);
  const [processing, setProcessing] = useState(!normalizedItems.length);
  const [progress, setProgress] = useState(0);
  const [processedItems, setProcessedItems] = useState(normalizedItems);
  const [toolbarMode, setToolbarMode] = useState(null);
  const [toolbarValue, setToolbarValue] = useState("");
  const [platform, setPlatform] = useState("ebay");
  const [cardGroups, setCardGroups] = useState(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState("all");
  const [activeDetailIndex, setActiveDetailIndex] = useState(null);
  const isPremiumUser =
    getPremiumStatus() ||
    (typeof window !== "undefined" &&
      window.localStorage.getItem("rr_dev_premium") === "true");

  const updateItem = useCallback(
    (i, updater) => {
      setProcessedItems((prev) => {
        if (!prev || !prev.length || i < 0 || i >= prev.length) return prev;
        const copy = [...prev];
        copy[i] = updater(copy[i]);
        return copy;
      });
    },
    [setProcessedItems]
  );

  const handleAutoCropAll = async () => {
    if (!processedItems || !processedItems.length) return;

    const updated = [];

    for (const item of processedItems) {
      const sourcePhoto = getPhotoUrl(item?.photos?.[0]);
      if (!sourcePhoto) {
        updated.push(item);
        continue;
      }

      try {
        const edited = await autoCropCard(sourcePhoto);
        updated.push({ ...item, editedPhoto: edited });
      } catch (err) {
        console.error("Auto crop failed for batch item:", item.id, err);
        updated.push(item);
      }
    }

    setProcessedItems(updated);
  };

  const handleEnhanceAll = async () => {
    if (!processedItems || !processedItems.length) return;

    const updated = [];

    for (const item of processedItems) {
      const sourcePhoto = getPhotoUrl(item?.photos?.[0]);
      if (!sourcePhoto) {
        updated.push(item);
        continue;
      }

      try {
        const enhanced = await autoEnhanceCard(sourcePhoto);
        updated.push({ ...item, editedPhoto: enhanced });
      } catch (err) {
        console.error("Auto enhance failed for batch item:", item.id, err);
        updated.push(item);
      }
    }

    setProcessedItems(updated);
  };

  const applyAutoFields = useCallback(
    (
      prev,
      finalBase,
      initialSnapshot,
      parsedDraft,
      autoCategory,
      autoBrand,
      seoKeywords,
      cardMeta,
      priceSenseData,
      autoListing,
      cardIntelDetails,
      aiMetadata,
      cardIntelAttributes,
      apparelIntelDetails,
      apparelAttributes,
      cornerPhotos
    ) => {
      if (!prev) return prev;
      const next = { ...prev };

      const shouldApplyTitle =
        isPremiumUser &&
        parsedDraft &&
        finalBase.title &&
        (!prev.title || prev.title === initialSnapshot.title);
      if (shouldApplyTitle) next.title = finalBase.title;

      const shouldApplyDescription =
        isPremiumUser &&
        parsedDraft &&
        finalBase.description &&
        (!prev.description || prev.description === initialSnapshot.description);
      if (shouldApplyDescription) next.description = finalBase.description;

      const shouldApplyPrice =
        isPremiumUser &&
        parsedDraft &&
        finalBase.price &&
        (!prev.price || prev.price === initialSnapshot.price);
      if (shouldApplyPrice) next.price = finalBase.price;

      const prevTags = Array.isArray(prev.tags) ? prev.tags : [];
      const prevTagsKey = prevTags.join("|");
      const initialTagsKey = initialSnapshot.tags.join("|");
      const finalTags = Array.isArray(finalBase.tags) ? finalBase.tags : [];
      const shouldApplyTags =
        isPremiumUser &&
        parsedDraft &&
        finalTags.length > 0 &&
        (!prevTagsKey || prevTagsKey === initialTagsKey);
      if (shouldApplyTags) next.tags = finalTags;

      next.autoCategory = autoCategory;
      next.autoBrand = autoBrand;
      next.seoKeywords = seoKeywords;

      if (priceSenseData) next.priceSense = priceSenseData;
      if (autoListing) next.autoListing = autoListing;

      if (cardMeta) {
        Object.entries(cardMeta).forEach(([key, value]) => {
          if (value) next[key] = value;
        });
      }

      if (cardIntelAttributes) {
        next.cardAttributes = {
          ...(next.cardAttributes || {}),
          ...cardIntelAttributes,
        };
      }

      if (cardIntelDetails) {
        next.cardIntel = cardIntelDetails;
      }

      if (apparelIntelDetails) {
        next.apparelIntel = apparelIntelDetails;
      }

      if (apparelAttributes) {
        next.apparelAttributes = {
          ...(next.apparelAttributes || {}),
          ...apparelAttributes,
        };
      }

      if (cornerPhotos && cornerPhotos.length) {
        next.cornerPhotos = cornerPhotos;
      }

      if (parsedDraft) next.magicDiffs = parsedDraft;
      if (aiMetadata) next.magicMetadata = aiMetadata;

      return next;
    },
    [isPremiumUser]
  );

  const processItem = useCallback(
    async (seedItem, index, options = {}) => {
      if (!seedItem) return;

      const photoEntries = Array.isArray(seedItem?.photos) ? [...seedItem.photos] : [];
      const secondaryEntries = Array.isArray(seedItem?.secondaryPhotos)
        ? [...seedItem.secondaryPhotos]
        : [];

      const initialSnapshot = {
        title: seedItem?.title || "",
        description: seedItem?.description || "",
        price: seedItem?.price || "",
        tags: Array.isArray(seedItem?.tags) ? seedItem.tags : [],
      };

      let finalBase = {
        ...seedItem,
        photos: photoEntries,
        secondaryPhotos: secondaryEntries,
      };

      let parsedDraft = null;
      let aiMetadata = null;
      let cardIntelResult = seedItem?.cardIntel || null;
      let apparelIntelResult = seedItem?.apparelIntel || null;
      const isCardCategory =
        (finalBase?.category || "").toLowerCase().includes("card") ||
        isSportsCardPhoto(mapPhotosToUrls(photoEntries));
      const isApparelCategory = isBabyApparelListing(finalBase);

      if (isPremiumUser) {
        try {
          const draft = await generateMagicDraft(finalBase, {
            glowMode: true,
            cardMode: isCardCategory,
            cardIntel: cardIntelResult,
            apparelMode: isApparelCategory,
            apparelIntel: apparelIntelResult,
          });
          if (draft?.cardIntel && !cardIntelResult) {
            cardIntelResult = draft.cardIntel;
          }
          if (draft?.apparelIntel) {
            apparelIntelResult = draft.apparelIntel;
          }
          if (draft?.parsed) {
            parsedDraft = draft.parsed;
            aiMetadata = draft.ai || null;
            const { parsed } = draft;
            const tagsAfter =
              Array.isArray(parsed.tags.after) && parsed.tags.after.length
                ? parsed.tags.after
                : Array.isArray(finalBase.tags)
                ? finalBase.tags
                : [];
            finalBase = {
              ...finalBase,
              title: parsed.title.after || finalBase.title || "",
              description: parsed.description.after || finalBase.description || "",
              price: parsed.price.after || finalBase.price || "",
              tags: tagsAfter,
            };
          }
        } catch (err) {
          console.error("Batch Magic Draft failed:", seedItem?.id || index, err);
        }
      }

      const normalizedPhotos = mapPhotosToUrls(finalBase.photos || []);
      const autoCategory = predictCategoryFromPhoto(normalizedPhotos);
      const autoBrand = guessBrandFromPhoto(normalizedPhotos);
      const seoKeywords = buildSeoKeywords({
        title: finalBase.title || "",
        description: finalBase.description || "",
        tags: Array.isArray(finalBase.tags) ? finalBase.tags : [],
      });

      let cardMeta = null;
      let priceSenseData = null;
      let autoListing = null;
      let cardIntelligence = null;

      if (isSportsCardPhoto(normalizedPhotos) || isCardCategory) {
        const combinedText = `
          ${finalBase.title || ""}
          ${finalBase.description || ""}
          ${Array.isArray(finalBase.tags) ? finalBase.tags.join(" ") : ""}
          ${getPhotoUrl(finalBase.photos?.[0]) || ""}
        `.toLowerCase();

        const cardYear = extractCardYear(combinedText);
        const cardNumber = extractCardNumber(combinedText);
        const cardSerial = extractCardSerial(combinedText);
        const cardBrandExact = detectCardBrand(combinedText);
        const cardPlayer = extractCardPlayer(combinedText);
        const cardTeam = extractCardTeam(combinedText);
        const cardParallel = detectCardParallel(combinedText);

        cardMeta = {
          cardYear,
          cardNumber,
          cardSerial,
          cardBrandExact,
          cardPlayer,
          cardTeam,
          cardParallel,
        };

        const enrichedForPriceSense = {
          ...finalBase,
          ...cardMeta,
        };

        priceSenseData = smartPriceSense(enrichedForPriceSense);

        autoListing = {
          title: autoSportsCardTitle(enrichedForPriceSense),
          description: autoSportsCardDescription(enrichedForPriceSense),
          specifics: autoSportsCardSpecifics(enrichedForPriceSense),
        };

        const combinedTextFull = combinedText;
        const sport = detectSport(cardTeam);
        const league = detectLeague(cardTeam);
        const rookie = detectRookie(combinedTextFull);
        const { graded, company, value } = detectGrading(combinedTextFull);
        const slabbed = detectSlab(combinedTextFull);

        const protection = recommendProtection({
          slabbed,
          graded,
          serial: cardSerial,
        });

        cardIntelligence = {
          sport,
          league,
          rookie,
          graded,
          gradingCompany: company,
          gradeValue: value,
          slabbed,
          protection,
        };
      }

      if (options.isCancelled?.()) return;

      const cardIntelAttributes = cardIntelResult
        ? buildCardAttributesFromIntel(cardIntelResult)
        : null;
      const apparelAttributes = apparelIntelResult
        ? buildApparelAttributesFromIntel(apparelIntelResult)
        : null;
      const cornerAssets = cardIntelResult
        ? extractCornerPhotoEntries(cardIntelResult)
        : [];

      updateItem(index, (prev) =>
        applyAutoFields(
          prev,
          finalBase,
          initialSnapshot,
          parsedDraft,
          autoCategory,
          autoBrand,
          seoKeywords,
          cardMeta,
          priceSenseData,
          autoListing,
          cardIntelResult
            ? {
                ...cardIntelResult,
                confidence: cardIntelResult.confidence || {},
              }
            : null,
          aiMetadata,
          cardIntelAttributes,
          apparelIntelResult
            ? {
                ...apparelIntelResult,
                confidence: apparelIntelResult.confidence || {},
              }
            : null,
          apparelAttributes,
          cornerAssets
        )
      );

      if (cardIntelligence) {
        updateItem(index, (prev) =>
          prev ? { ...prev, cardIntelligence } : prev
        );
      }

      if (typeof options.onProgress === "function") {
        options.onProgress();
      }
    },
    [applyAutoFields, isPremiumUser, updateItem]
  );

  const refreshItem = useCallback(
    (index, seedOverride = null) => {
      const source =
        seedOverride ||
        (processedItems && processedItems[index]) ||
        (normalizedItems && normalizedItems[index]);
      if (!source) return;
      processItem(source, index);
    },
    [processedItems, normalizedItems, processItem]
  );

  useEffect(() => {
    setProcessedItems(normalizedItems);
    setProgress(0);
  }, [normalizedItems]);

  useEffect(() => {
    if (!normalizedItems.length) {
      setProcessing(false);
      return;
    }

    let cancelled = false;
    setProcessing(true);
    setProgress(0);

    const run = async () => {
      for (let i = 0; i < normalizedItems.length; i++) {
        if (cancelled) break;
        await processItem(normalizedItems[i], i, {
          isCancelled: () => cancelled,
          onProgress: () =>
            setProgress(Math.round(((i + 1) / normalizedItems.length) * 100)),
        });
      }
      if (!cancelled) setProcessing(false);
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [normalizedItems, processItem]);

  // Recompute groups when processed items change
  useEffect(() => {
    if (processedItems && processedItems.length) {
      const groups = groupSportsCards(processedItems);
      setCardGroups(groups);
    }
  }, [processedItems]);

  // Re-apply transforms when platform changes
  useEffect(() => {
    setProcessedItems((prev) => {
      if (!prev || !prev.length) return prev;

      return prev.map((item) => {
        if (!item?.autoListing) return item;

        const baseListing = item.autoListing;
        let transformed = baseListing;

        if (platform === "ebay") transformed = transformForEbay(baseListing);
        if (platform === "whatnot") transformed = transformForWhatnot(baseListing);
        if (platform === "mercari") transformed = transformForMercari(baseListing);

        return {
          ...item,
          autoListing: transformed,
        };
      });
    });
  }, [platform]);

  // Apply Smart Group Filter
  let displayedItems = processedItems;

  if (activeGroupFilter !== "all" && cardGroups) {
    displayedItems = cardGroups[activeGroupFilter] || [];
  }

  if (!items.length) {
    navigate("/");
    return null;
  }

  if (processing) {
    const processingHeadline = isPremiumUser
      ? "Running Magic Fill…"
      : "Preparing cards…";
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-3xl font-cinzel mb-6 tracking-wide">
          {processingHeadline}
        </h1>

        <div className="w-full max-w-xl bg-white/10 h-4 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#F5E7D0] transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        <p className="mt-4 text-lg opacity-80">{progress}% complete</p>
      </div>
    );
  }

  return (
    <div
      className="ld-batch-wrapper"
      style={{ maxWidth: "1100px", margin: "0 auto", padding: "1rem", color: "white" }}
    >
      {/* Platform Toggle Toolbar */}
      <div className="flex items-center gap-3 mb-6 mt-2">
        {["ebay", "whatnot", "mercari"].map((p) => (
          <button
            key={p}
            onClick={() => setPlatform(p)}
            className={`px-4 py-1.5 rounded-full text-sm border transition ${
              platform === p
                ? "bg-[#F5E7D0] text-black border-[#F5E7D0]"
                : "bg-black/30 text-white border-white/20 hover:bg-black/50"
            }`}
          >
            {p === "ebay" && "eBay"}
            {p === "whatnot" && "Whatnot"}
            {p === "mercari" && "Mercari"}
          </button>
        ))}
      </div>

      {/* SMART GROUPING PANEL — TAPPABLE FILTERS */}
      {cardGroups && (
        <div className="bg-black/50 border border-white/10 p-4 rounded-xl mb-6 text-white/90">
          <div className="text-lg font-cinzel mb-3 text-[#E8DCC0]">
            Smart Groups
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {[
              { key: "highValue", label: "High Value" },
              { key: "rookies", label: "Rookies" },
              { key: "parallels", label: "Parallels / Serial" },
              { key: "graded", label: "Graded / Slabbed" },
              { key: "base", label: "Base Cards" },
              { key: "bulk", label: "Bulk Lots" },
            ].map((g) => (
              <button
                key={g.key}
                onClick={() => {
                  setActiveGroupFilter(
                    activeGroupFilter === g.key ? "all" : g.key
                  );
                }}
                className={`flex flex-col items-start p-2 rounded-lg border transition ${
                  activeGroupFilter === g.key
                    ? "border-[#E8DCC0] bg-[#E8DCC0]/10 text-[#E8DCC0]"
                    : "border-white/10 bg-black/20 text-white/80 hover:bg-black/40"
                }`}
              >
                <span className="font-semibold">{g.label}</span>
                <span className="opacity-70">
                  {cardGroups[g.key]?.length || 0} cards
                </span>
              </button>
            ))}
          </div>

          {/* RESET FILTER BUTTON */}
          {activeGroupFilter !== "all" && (
            <button
              onClick={() => setActiveGroupFilter("all")}
              className="mt-4 w-full px-4 py-2 text-sm rounded-lg 
          bg-[#F5E7D0] text-black font-semibold hover:bg-[#F0E1BF] transition"
            >
              Show All Cards
            </button>
          )}
        </div>
      )}

      {/* Batch Image Tools */}
      <div className="flex gap-3 mb-4">
        <button
          className="px-4 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm hover:bg-black/60 transition"
          onClick={handleAutoCropAll}
        >
          Auto Crop All
        </button>
        <button
          className="px-4 py-2 bg-black/40 border border-white/20 rounded-lg text-white text-sm hover:bg-black/60 transition"
          onClick={handleEnhanceAll}
        >
          Enhance All
        </button>
      </div>

      {/* Floating Batch Toolbar */}
      <div className="ld-toolbar">
        <div className="ld-toolbar-inner">
          <button
            className="ld-toolbar-btn"
            onClick={() => {
              setToolbarMode("category");
              setToolbarValue("");
            }}
          >
            Category
          </button>
          <button
            className="ld-toolbar-btn"
            onClick={() => {
              setToolbarMode("condition");
              setToolbarValue("");
            }}
          >
            Condition
          </button>
          <button
            className="ld-toolbar-btn"
            onClick={() => {
              setToolbarMode("pricing");
              setToolbarValue("");
            }}
          >
            Pricing
          </button>
          <button
            className="ld-toolbar-btn"
            onClick={() => {
              setToolbarMode("tags");
              setToolbarValue("");
            }}
          >
            Tags
          </button>
          <button
            className="ld-toolbar-btn"
            onClick={() => {
              setToolbarMode("seo");
              setToolbarValue("");
            }}
          >
            SEO
          </button>
        </div>
      </div>

      <h1 className="ld-title">LaunchDeck — Batch Mode</h1>

      {(displayedItems.length ? displayedItems : processedItems).length === 0 && (
        <div className="pt-4 text-sm text-[#d6c7a1]/70">
          No sports cards selected for launch.
        </div>
      )}

      <div className="ld-grid">
        {(displayedItems.length ? displayedItems : processedItems).map(
          (item, index) => (
            <BatchCard
              key={index}
              item={item}
              index={index}
              updateItem={updateItem}
              setActiveDetailIndex={setActiveDetailIndex}
              onRefreshItem={refreshItem}
            />
          )
        )}
      </div>

      {activeDetailIndex !== null && (
        <CardDetailSidebar
          item={
            processedItems[activeDetailIndex] ??
            items[activeDetailIndex]
          }
          index={activeDetailIndex}
          updateItem={updateItem}
          onClose={() => setActiveDetailIndex(null)}
        />
      )}

      {/* Champagne Modal for Apply-to-All */}
      {toolbarMode && (
        <div className="ld-modal-backdrop" onClick={() => setToolbarMode(null)}>
          <div
            className="ld-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ld-modal-title">
              {toolbarMode === "category" && "Set Category for All Items"}
              {toolbarMode === "condition" && "Set Condition for All Items"}
              {toolbarMode === "pricing" && "Set Price for All Items"}
              {toolbarMode === "tags" && "Set Tags for All Items"}
              {toolbarMode === "seo" && "Set SEO Keywords for All Items"}
            </div>
            <div className="ld-modal-sub">
              Apply a single value across every item in this batch.
            </div>

            <input
              className="ld-modal-input"
              placeholder={
                toolbarMode === "pricing"
                  ? "e.g., 45"
                  : toolbarMode === "tags" || toolbarMode === "seo"
                  ? "Comma-separated, e.g., cozy, neutral, fall"
                  : "Type a value…"
              }
              value={toolbarValue}
              onChange={(e) => setToolbarValue(e.target.value)}
            />

            <div className="ld-modal-hint">
              {toolbarMode === "tags" &&
                "Tags will be split on commas and cleaned."}
              {toolbarMode === "seo" &&
                "SEO keywords help buyers find your items faster."}
            </div>

            <div className="ld-modal-actions">
              <button
                className="ld-modal-btn-quiet"
                onClick={() => setToolbarMode(null)}
              >
                Cancel
              </button>
              <button
                className="ld-modal-btn-apply"
                onClick={() => {
                  if (!toolbarValue.trim()) {
                    setToolbarMode(null);
                    return;
                  }

                  setProcessedItems((prev) => {
                    const source =
                      prev && prev.length ? prev : items;

                    return source.map((item) => {
                      if (toolbarMode === "category") {
                        return { ...item, category: toolbarValue.trim() };
                      }
                      if (toolbarMode === "condition") {
                        return { ...item, condition: toolbarValue.trim() };
                      }
                      if (toolbarMode === "pricing") {
                        return { ...item, price: toolbarValue.trim() };
                      }
                      if (toolbarMode === "tags") {
                        const raw = toolbarValue
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        return { ...item, tags: raw };
                      }
                      if (toolbarMode === "seo") {
                        const raw = toolbarValue
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean);
                        return { ...item, seoKeywords: raw };
                      }
                      return item;
                    });
                  });

                  setToolbarMode(null);
                  setToolbarValue("");
                }}
              >
                Apply to All Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BatchCard({ item, index, updateItem, setActiveDetailIndex, onRefreshItem }) {
  const outputRef = useRef(null);

  const [activePlatform, setActivePlatform] = useState(null);
  const [formattedOutput, setFormattedOutput] = useState("");
  const [enhancedOutput, setEnhancedOutput] = useState("");

  const [aiReview, setAiReview] = useState(null);
  const [aiMagic, setAiMagic] = useState(null);
  const [aiAuto, setAiAuto] = useState(null);
  const [aiMerged, setAiMerged] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAI, setShowAI] = useState(false);

  const [quickFixMode, setQuickFixMode] = useState(null);
  const [quickFixValue, setQuickFixValue] = useState("");
  const backInputRef = useRef(null);

  const applyQuickFix = () => {
    if (!quickFixMode) return;
    updateItem(index, (prev) => ({
      ...prev,
      [quickFixMode]: quickFixValue.trim(),
    }));
    setQuickFixMode(null);
  };

  const confidenceTone = {
    high: "text-emerald-300 border-emerald-300/40",
    medium: "text-[#CBB78A] border-[#CBB78A]/40",
    low: "text-white/60 border-white/20",
  };

  const renderConfidenceBadge = (field) => {
    const level = item?.cardIntel?.confidence?.[field];
    if (!level) return null;
    const tone = confidenceTone[level] || confidenceTone.low;
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  };

  const renderApparelConfidenceBadge = (field) => {
    const level = item?.apparelIntel?.confidence?.[field];
    if (!level) return null;
    const tone = confidenceTone[level] || confidenceTone.low;
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  };

  const cornerPhotos = item?.cornerPhotos || [];
  const handleSaveCornerImages = () => {
    if (!cornerPhotos.length) return;
    cornerPhotos.forEach((entry, idx) => {
      if (!entry?.url) return;
      const name =
        entry.label?.toLowerCase().replace(/\s+/g, "-") || `corner-${idx + 1}`;
      downloadImageFile(entry.url, `${name}.jpg`);
    });
  };

  const renderCornerBadge = (level) => {
    if (!level) return null;
    const tone = confidenceTone[level] || confidenceTone.low;
    return (
      <span
        className={`ml-2 text-[9px] uppercase tracking-[0.3em] px-2 py-0.5 rounded-full border ${tone}`}
      >
        {level}
      </span>
    );
  };

  const handleBackUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const entry = {
      url: URL.createObjectURL(file),
      altText: deriveAltTextFromFilename(file.name) || "card back photo",
      file,
    };
    const nextSeed = {
      ...item,
      secondaryPhotos: [entry],
      cardIntel: null,
    };
    updateItem(index, () => nextSeed);
    if (onRefreshItem) {
      onRefreshItem(index, nextSeed);
    }
  };

  async function handlePlatformClick(key) {
    const formatter = platformFormatters[key];
    const text = formatter ? formatter(item) : "";

    setActivePlatform(key);
    setEnhancedOutput("");
    setFormattedOutput(text);

    // Scroll into view
    setTimeout(() => {
      if (outputRef.current) {
        outputRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);

    // AI block
    let review = null;
    let magic = null;
    let auto = null;

    try {
      review = await runAIReview(item);
    } catch {}
    try {
      magic = await runMagicFill(item);
    } catch {}
    try {
      auto = await runAutoFill(item);
    } catch {}

    setAiReview(review);
    setAiMagic(magic);
    setAiAuto(auto);

    const merged = mergeAITurboSignals({ review, magic, auto });
    setAiMerged(merged);

    const suggestions = extractSuggestions(merged);
    setAiSuggestions(suggestions);

    const autoPicks = autoPickTopSuggestions(merged);

    if (autoPicks.length > 0) {
      setEnhancedOutput(`${text}\n\n${autoPicks.join("\n\n")}`);
    }

    setShowAI(true);
  }

  function extractSuggestions(merged) {
    if (!merged) return [];
    const pool = [];
    if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
    if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
    if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);
    return [...new Set(pool)].slice(0, 6);
  }

  function autoPickTopSuggestions(merged) {
    if (!merged) return [];
    const pool = [];
    if (merged.review?.suggestions) pool.push(...merged.review.suggestions);
    if (merged.magic?.suggestions) pool.push(...merged.magic.suggestions);
    if (merged.auto?.suggestions) pool.push(...merged.auto.suggestions);
    return [...new Set(pool)].slice(0, 3);
  }

  function applySuggestion(s) {
    const base = enhancedOutput || formattedOutput;
    setEnhancedOutput(`${base}\n\n${s}`);
  }

  const platformPreview = buildPlatformPreview(item);
  const platformDescriptions = formatDescriptionByPlatform({
    ...item,
    description:
      platformPreview.summaryDescription || item.description,
  });
  const apparelAttrs = item?.apparelAttributes || {};
  const hasApparelSignals =
    !!item?.apparelIntel &&
    (apparelAttrs.itemType ||
      apparelAttrs.brand ||
      apparelAttrs.size ||
      apparelAttrs.condition ||
      item.apparelIntel.notes);

  return (
    <div className="ld-card">
      {/* Shared Preview UI — one card per marketplace */}
      <div className="space-y-4 mb-4">
        {["ebay", "poshmark", "mercari"].map((platformKey) => (
          <PreviewCard
            key={platformKey}
            platform={platformKey}
            item={item}
            platformTitle={
              platformPreview?.titles
                ? platformPreview.titles[platformKey]
                : undefined
            }
            platformDescription={platformDescriptions[platformKey]}
            onEdit={
              setActiveDetailIndex
                ? () => setActiveDetailIndex(index)
                : undefined
            }
          />
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60 mb-2">
            Front Photo
          </div>
          {getPhotoUrl(item?.photos?.[0]) ? (
            <img
              src={getPhotoUrl(item.photos[0])}
              alt="Front of card"
              className="w-full rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/50">
              No front photo
            </div>
          )}
        </div>
        <div className="flex-1">
          <div className="text-[11px] uppercase tracking-[0.35em] text-white/60 mb-2 flex items-center justify-between">
            <span>Back Photo</span>
            <button
              className="text-[10px] uppercase tracking-[0.35em] text-[#E8DCC0] hover:text-white transition"
              onClick={() => backInputRef.current?.click()}
              type="button"
            >
              {item?.secondaryPhotos?.length ? "Replace" : "Add"}
            </button>
          </div>
          {item?.secondaryPhotos?.length ? (
            <img
              src={getPhotoUrl(item.secondaryPhotos[0])}
              alt="Back of card"
              className="w-full rounded-xl border border-white/10 object-cover"
            />
          ) : (
            <div
              className="rounded-xl border border-dashed border-white/15 p-6 text-center text-xs text-white/50 cursor-pointer hover:border-white/40 transition"
              onClick={() => backInputRef.current?.click()}
            >
              Optional — add the back for higher confidence
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            ref={backInputRef}
            className="hidden"
            onChange={handleBackUpload}
          />
        </div>
      </div>

      {(item.autoCategory || item.autoBrand) && (
        <div className="ld-pills-row">
          {item.autoCategory && (
            <span className="ld-pill">{item.autoCategory}</span>
          )}
          {item.autoBrand && (
            <span className="ld-pill ld-pill-muted">{item.autoBrand}</span>
          )}
        </div>
      )}

      {hasApparelSignals && (
        <div className="text-xs text-white/90 bg-black/30 border border-white/15 rounded-lg p-3 mb-4">
          <div className="font-semibold text-[#E8DCC0] mb-2 tracking-wide uppercase text-[11px]">
            Apparel Signals
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Item Type {renderApparelConfidenceBadge("itemType")}
              </div>
              <div>{apparelAttrs.itemType || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Brand {renderApparelConfidenceBadge("brand")}
              </div>
              <div>{apparelAttrs.brand || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Size {renderApparelConfidenceBadge("size")}
              </div>
              <div>{apparelAttrs.size || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Condition {renderApparelConfidenceBadge("condition")}
              </div>
              <div>{apparelAttrs.condition || <span className="opacity-40">—</span>}</div>
            </div>
            {item?.apparelIntel?.notes && (
              <div className="opacity-70 text-[11px]">
                Note: {item.apparelIntel.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {item?.cardIntel?.corners && (
        <div className="text-xs text-white/90 bg-black/30 border border-white/15 rounded-lg p-3 mb-4">
          <div className="font-semibold text-[#E8DCC0] mb-2 tracking-wide uppercase text-[11px]">
            Corner Inspection
          </div>
          {["front", "back"].map((side) => {
            const cornerSet = item.cardIntel.corners?.[side];
            if (!cornerSet) return null;
            const condition = item.cardIntel.cornerCondition?.[side];
            const prettySide = side === "front" ? "Front" : "Back";
            return (
              <div key={`${item.id || index}-${side}`} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                  {prettySide} Corners
                  {renderCornerBadge(condition?.confidence)}
                </div>
                {condition?.description && (
                  <div className="opacity-60 text-[11px] mt-1">
                    Looks {condition.description}.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3 mt-3">
                  {Object.entries(CORNER_LABELS).map(([key, label]) => {
                    const entry = cornerSet[key];
                    return (
                      <div key={`${side}-${key}`} className="text-center text-[10px] uppercase tracking-[0.3em]">
                        <div className="mb-2 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
                          {entry?.image ? (
                            <img
                              src={entry.image}
                              alt={`${prettySide} ${label}`}
                              className="w-full h-20 object-cover"
                            />
                          ) : (
                            <div className="h-20 flex items-center justify-center opacity-30">
                              No data
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-center gap-1">
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
      )}

      {(item?.cardIntel?.corners || GRADING_PATHS.featured) && (
        <div className="text-xs text-white/90 bg-black/30 border border-white/15 rounded-lg p-3 mb-4">
          <div className="font-semibold text-[#E8DCC0] mb-2 tracking-wide uppercase text-[11px]">
            Grading Paths
          </div>
          {GRADING_PATHS.featured && (
            <div className="mb-3 border border-dashed border-white/30 rounded-xl p-2 text-center uppercase text-[10px] tracking-[0.35em] text-white/60">
              Featured Partner Slot
            </div>
          )}
          <div className="opacity-70 text-[11px] mb-2">
            Explore grading services (opens new tab).
          </div>
          <div className="space-y-2">
            {GRADING_PATHS.primary.map((path) => (
              <button
                key={path.label}
                type="button"
                onClick={() => window.open(path.url, "_blank", "noopener")}
                className="w-full text-left border border-white/15 rounded-2xl px-3 py-2.5 bg-black/30 hover:bg-black/45 transition"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.35em]">
                  <span>{path.label}</span>
                  <span className="text-[9px] opacity-70">Neutral</span>
                </div>
                <div className="text-xs opacity-70 mt-1">
                  {path.description}
                </div>
              </button>
            ))}
          </div>
          <div className="mt-4 text-[10px] uppercase tracking-[0.35em] opacity-60">
            Alternative Options
          </div>
          <div className="space-y-1.5 mt-2">
            {GRADING_PATHS.alternatives.map((path) => (
              <button
                key={path.label}
                type="button"
                onClick={() => window.open(path.url, "_blank", "noopener")}
                className="w-full text-left border border-white/10 rounded-2xl px-3 py-2 bg-black/20 hover:bg-black/35 transition"
              >
                <div className="text-[11px] uppercase tracking-[0.3em]">
                  {path.label}
                </div>
                <div className="text-[11px] opacity-65 mt-0.5">
                  {path.description}
                </div>
              </button>
            ))}
          </div>
          {cornerPhotos.length > 0 && (
            <button
              type="button"
              onClick={handleSaveCornerImages}
              className="mt-3 w-full border border-white/20 rounded-2xl py-2 text-[10px] uppercase tracking-[0.35em] text-white/80 hover:bg-white/10 transition"
            >
              Save Corner Images
            </button>
          )}
        </div>
      )}

      {/* Per-card image tools */}
      {(() => {
        const primaryPhoto = getPhotoUrl(item?.photos?.[0]);
        if (item?.cardPlayer === undefined || !primaryPhoto) return null;
        return (
          <div className="flex gap-2 mb-3">
            <button
              onClick={async () => {
                try {
                  const edited = await autoCropCard(primaryPhoto);
                  updateItem(index, (prev) => ({
                    ...prev,
                    editedPhoto: edited,
                  }));
                } catch (err) {
                  console.error("Per-card crop failed:", err);
                }
              }}
              className="text-xs px-2 py-1 bg-black/30 border border-white/20 rounded-lg text-white hover:bg-black/50 transition"
            >
              Crop
            </button>
            <button
              onClick={async () => {
                try {
                  const enhanced = await autoEnhanceCard(primaryPhoto);
                  updateItem(index, (prev) => ({
                    ...prev,
                    editedPhoto: enhanced,
                  }));
                } catch (err) {
                  console.error("Per-card enhance failed:", err);
                }
              }}
              className="text-xs px-2 py-1 bg-black/30 border border-white/20 rounded-lg text-white hover:bg-black/50 transition"
            >
              Enhance
            </button>
          </div>
        );
      })()}

      {/* Sports Card Suite Copy Toolbar */}
      {item?.autoListing && (
        <div className="flex flex-wrap gap-2 mb-3 mt-1">
          {/* Copy Title */}
          <button
            onClick={() => {
              if (navigator?.clipboard?.writeText && item.autoListing.title) {
                navigator.clipboard.writeText(item.autoListing.title);
              }
            }}
            className="px-3 py-1 rounded-full text-xs border border-[#E8DCC0] text-[#E8DCC0] bg-black/30 hover:bg-black/50 transition"
          >
            Copy Title
          </button>

          {/* Copy Description */}
          <button
            onClick={() => {
              if (
                navigator?.clipboard?.writeText &&
                item.autoListing.description
              ) {
                navigator.clipboard.writeText(item.autoListing.description);
              }
            }}
            className="px-3 py-1 rounded-full text-xs border border-white/15 text-white bg-black/20 hover:bg-black/40 transition"
          >
            Copy Description
          </button>

          {/* Copy Item Specifics */}
          <button
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                navigator.clipboard.writeText(
                  JSON.stringify(item.autoListing.specifics || {}, null, 2)
                );
              }
            }}
            className="px-3 py-1 rounded-full text-xs border border-white/20 text-white/80 bg-black/20 hover:bg-black/40 transition"
          >
            Copy Item Specifics
          </button>

          {/* Copy Full Listing */}
          <button
            onClick={() => {
              if (navigator?.clipboard?.writeText) {
                const specifics = JSON.stringify(
                  item.autoListing.specifics || {},
                  null,
                  2
                );
                const full = `${item.autoListing.title || ""}\n\n${
                  item.autoListing.description || ""
                }\n\nItem Specifics:\n${specifics}`;
                navigator.clipboard.writeText(full.trim());
              }
            }}
            className="px-3 py-1 rounded-full text-xs border border-[#E8DCC0] text-black bg-[#F5E7D0] hover:bg-[#F0E1BF] transition font-semibold"
          >
            Copy Full Listing
          </button>
        </div>
      )}

      {/* Quick Fix Buttons */}
      {item?.cardPlayer !== undefined && (
        <div className="flex flex-wrap gap-2 mb-3">
          {[
            ["cardPlayer", "Player"],
            ["cardTeam", "Team"],
            ["cardYear", "Year"],
            ["cardNumber", "Card #"],
            ["cardSerial", "Serial #"],
            ["cardParallel", "Parallel"],
          ].map(([field, label]) => (
            <button
              key={field}
              onClick={() => {
                setQuickFixMode(field);
                setQuickFixValue(item[field] || "");
              }}
              className="px-2 py-1 rounded-full text-xs border border-white/20 text-white/80 bg-black/20 hover:bg-black/40 transition"
            >
              Fix {label}
            </button>
          ))}
        </div>
      )}

      {item?.cardPlayer !== undefined && (
        <button
          onClick={() => setActiveDetailIndex(index)}
          className="text-xs text-[#E8DCC0] underline mb-3 hover:text-[#FFF3D0]"
        >
          Card Details →
        </button>
      )}

      {item?.cardIntel && (
        <div className="text-xs text-white/90 bg-black/30 border border-white/15 rounded-lg p-3 mb-3">
          <div className="font-semibold text-[#E8DCC0] mb-2 tracking-wide uppercase text-[11px]">
            Card Identity
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Player {renderConfidenceBadge("player")}
              </div>
              <div>{item.cardIntel.player || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Team {renderConfidenceBadge("team")}
              </div>
              <div>{item.cardIntel.team || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Year {renderConfidenceBadge("year")}
              </div>
              <div>{item.cardIntel.year || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Set {renderConfidenceBadge("setName")}
              </div>
              <div>{item.cardIntel.setName || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Card # {renderConfidenceBadge("cardNumber")}
              </div>
              <div>{item.cardIntel.cardNumber || <span className="opacity-40">—</span>}</div>
            </div>
            <div>
              <div className="flex items-center gap-2 opacity-70 text-[11px] uppercase tracking-[0.35em]">
                Brand {renderConfidenceBadge("brand")}
              </div>
              <div>{item.cardIntel.brand || <span className="opacity-40">—</span>}</div>
            </div>
          </div>
        </div>
      )}

      {item?.priceSense && (
        <div className="text-xs text-[#E8DCC0] bg-black/30 border border-[#E8DCC0]/40 rounded-lg p-2 mt-2">
          <div className="font-semibold">
            Suggested Range: {item.priceSense.range}
          </div>
          <div className="opacity-70">
            ({item.priceSense.reason})
          </div>
        </div>
      )}

      {/* Card Intelligence Panel */}
      {item?.cardIntelligence && (
        <div className="text-xs text-white/90 bg-black/40 border border-white/10 rounded-lg p-3 mt-3">
          <div className="font-semibold text-[#E8DCC0] mb-1 tracking-wide">
            Card Intelligence
          </div>

          <div className="space-y-0.5">
            {item.cardIntelligence.sport && (
              <div>• Sport: {item.cardIntelligence.sport}</div>
            )}

            {item.cardIntelligence.league && (
              <div>• League: {item.cardIntelligence.league}</div>
            )}

            <div>
              • Rookie Card:{" "}
              {item.cardIntelligence.rookie ? "Yes" : "No"}
            </div>

            <div>
              • Graded:{" "}
              {item.cardIntelligence.graded
                ? `${item.cardIntelligence.gradingCompany} ${item.cardIntelligence.gradeValue}`
                : "No"}
            </div>

            {item.cardIntelligence.slabbed && (
              <div>• Slabbed: Yes</div>
            )}

            {item.cardParallel && (
              <div>• Parallel: {item.cardParallel}</div>
            )}

            {item.cardSerial && <div>• Serial: /{item.cardSerial}</div>}

            {item.cardBrandExact && (
              <div>• Brand: {item.cardBrandExact}</div>
            )}

            {item.cardYear && <div>• Year: {item.cardYear}</div>}

            <div className="pt-1 italic text-[#E8DCC0]/90">
              Recommendation: {item.cardIntelligence.protection}
            </div>
          </div>
        </div>
      )}

      <div className="ld-platform-buttons">
        {Object.keys(platformFormatters).map((key) => (
          <button
            key={key}
            className={`ld-platform-btn ${
              activePlatform === key ? "ld-platform-btn-active" : ""
            }`}
            onClick={() => handlePlatformClick(key)}
          >
            {key.toUpperCase()}
          </button>
        ))}
      </div>

      {formattedOutput && (
        <div ref={outputRef} className="ld-output-block">
          <pre className="ld-output-text">
            {enhancedOutput || formattedOutput}
          </pre>
        </div>
      )}

      {showAI && (
        <div className="ld-ai-block">
          <button
            onClick={() => setShowAI(!showAI)}
            className="ld-ai-toggle"
          >
            {showAI ? "▼ Turbo Insights" : "▶ Turbo Insights"}
          </button>

          {showAI && (
            <div className="ld-ai-inner">
              <p><strong>Listing Review:</strong> {aiReview?.summary || "—"}</p>
              <p><strong>Magic Fill:</strong> {aiMagic?.summary || "—"}</p>
              <p><strong>Auto Fill:</strong> {aiAuto?.summary || "—"}</p>

              {aiSuggestions.length > 0 && (
                <div className="ld-suggestions-row">
                  {aiSuggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => applySuggestion(s)}
                      className="ld-suggestion-pill"
                    >
                      + {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {quickFixMode && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setQuickFixMode(null)}
        >
          <div
            className="bg-black border border-white/20 rounded-xl p-6 w-full max-w-sm text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-xl font-semibold mb-3">
              Fix {quickFixMode.replace("card", "")}
            </div>

            <input
              value={quickFixValue}
              onChange={(e) => setQuickFixValue(e.target.value)}
              className="w-full bg-black/40 border border-white/20 rounded-lg p-2 mb-4 text-white"
              placeholder="Enter value..."
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setQuickFixMode(null)}
                className="px-3 py-1 rounded-md border border-white/20"
              >
                Cancel
              </button>
              <button
                onClick={applyQuickFix}
                className="px-4 py-1 rounded-md bg-[#F5E7D0] text-black font-medium"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
