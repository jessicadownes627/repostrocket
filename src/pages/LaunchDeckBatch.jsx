import React, { useState, useRef, useEffect } from "react";
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
import { parseMagicFillOutput } from "../engines/MagicFillEngine";
import { runMagicFill as callMagicFillFunction } from "../utils/runMagicFill";
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
import { fileToDataUrl, getPhotoUrl, mapPhotosToUrls } from "../utils/photoHelpers";

async function ensureDataUrl(source) {
  if (!source) return "";
  if (source.startsWith("data:")) return source;
  try {
    const res = await fetch(source);
    const blob = await res.blob();
    const file = new File([blob], "batch-photo", {
      type: blob.type || "image/jpeg",
    });
    return await fileToDataUrl(file);
  } catch (err) {
    console.error("ensureDataUrl failed:", err);
    return "";
  }
}

async function runMagicFillEngine(item) {
  try {
    const firstPhotoEntry = Array.isArray(item?.photos) ? item.photos[0] : null;
    const primaryPhoto =
      item?.editedPhoto ||
      (firstPhotoEntry && (getPhotoUrl(firstPhotoEntry) || "")) ||
      "";
    const photoDataUrl = await ensureDataUrl(primaryPhoto);
    const payload = {
      photoDataUrl,
      brand: item?.brand || "",
      category: item?.category || "",
      size: item?.size || "",
      condition: item?.condition || "",
      userTitle: item?.title || "",
      userDescription: item?.description || "",
      userTags: Array.isArray(item?.tags) ? item.tags : [],
      previousAiChoices: item?.previousAiChoices || {},
    };

    const ai = await callMagicFillFunction(payload);
    if (!ai?.output) return null;

    const parsed = parseMagicFillOutput(ai.output);
    return {
      title: parsed.title.after || item.title || "",
      description: parsed.description.after || item.description || "",
      price: parsed.price.after || item.price || "",
      tags:
        Array.isArray(parsed.tags.after) && parsed.tags.after.length
          ? parsed.tags.after
          : item.tags || [],
    };
  } catch (err) {
    console.error("runMagicFillEngine failed:", err);
    return null;
  }
}

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

export default function LaunchDeckBatch() {
  const location = useLocation();
  const navigate = useNavigate();

  const items = location.state?.items || [];

  const [processing, setProcessing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [processedItems, setProcessedItems] = useState([]);
  const [toolbarMode, setToolbarMode] = useState(null);
  const [toolbarValue, setToolbarValue] = useState("");
  const [platform, setPlatform] = useState("ebay");
  const [cardGroups, setCardGroups] = useState(null);
  const [activeGroupFilter, setActiveGroupFilter] = useState("all");
  const [activeDetailIndex, setActiveDetailIndex] = useState(null);

  const updateItem = (i, updater) => {
    setProcessedItems((prev) => {
      if (!prev || !prev.length) return prev;
      const copy = [...prev];
      copy[i] = updater(copy[i]);
      return copy;
    });
  };

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

  useEffect(() => {
    if (!items || items.length === 0) {
      setProcessing(false);
      return;
    }

    async function runBatchFill() {
      const results = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        try {
          // Use the same engine as SingleListing
          const filled = await runMagicFillEngine(item);
          const base = filled ? { ...item, ...filled } : { ...item };

          const normalizedPhotos = mapPhotosToUrls(base.photos || []);
          const autoCategory = predictCategoryFromPhoto(normalizedPhotos);
          const autoBrand = guessBrandFromPhoto(normalizedPhotos);
          const seoKeywords = buildSeoKeywords({
            title: base.title || "",
            description: base.description || "",
            tags: base.tags || [],
          });

          let enriched = {
            ...base,
            autoCategory,
            autoBrand,
            seoKeywords,
          };

          if (isSportsCardPhoto(normalizedPhotos)) {
            enriched = {
              ...enriched,
              cardPlayer: "",
              cardTeam: "",
              cardBrandExact: "",
              cardYear: "",
              cardParallel: "",
              cardNumber: "",
              cardSerial: "",
            };

            const combinedText = `
              ${base.title || ""}
              ${base.description || ""}
              ${base.tags?.join(" ") || ""}
              ${getPhotoUrl(base.photos?.[0]) || ""}
            `.toLowerCase();

            const cardYear = extractCardYear(combinedText);
            const cardNumber = extractCardNumber(combinedText);
            const cardSerial = extractCardSerial(combinedText);
            const cardBrandExact = detectCardBrand(combinedText);
            const cardPlayer = extractCardPlayer(combinedText);
            const cardTeam = extractCardTeam(combinedText);
            const cardParallel = detectCardParallel(combinedText);

            enriched = {
              ...enriched,
              cardYear,
              cardNumber,
              cardSerial,
              cardBrandExact,
              cardPlayer,
              cardTeam,
              cardParallel,
            };

            enriched.priceSense = smartPriceSense(enriched);

            enriched.autoListing = {
              title: autoSportsCardTitle(enriched),
              description: autoSportsCardDescription(enriched),
              specifics: autoSportsCardSpecifics(enriched),
            };

            // Phase 8: Sport + League + Rookie + Grading + Slab
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

            enriched.cardIntelligence = {
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

          results.push(enriched);
        } catch (err) {
          console.error("Batch Magic Fill failed for item:", item.id, err);
          results.push(item);
        }

        setProgress(Math.round(((i + 1) / items.length) * 100));
      }

      setProcessedItems(results);
      setProcessing(false);
    }

    runBatchFill();
  }, [items]);

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
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-10 text-center">
        <h1 className="text-3xl font-cinzel mb-6 tracking-wide">
          Running Magic Fill…
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

function BatchCard({ item, index, updateItem, setActiveDetailIndex }) {
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

  const applyQuickFix = () => {
    if (!quickFixMode) return;
    updateItem(index, (prev) => ({
      ...prev,
      [quickFixMode]: quickFixValue.trim(),
    }));
    setQuickFixMode(null);
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
            {showAI ? "▼ AI Turbo Insights" : "▶ AI Turbo Insights"}
          </button>

          {showAI && (
            <div className="ld-ai-inner">
              <p><strong>AI Review:</strong> {aiReview?.summary || "—"}</p>
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
