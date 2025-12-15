import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCardParser } from "../hooks/useCardParser";
import { buildCardTitle } from "../utils/buildCardTitle";
import { convertHeicIfNeeded } from "../utils/imageTools";
import {
  brighten,
  warm,
  cool,
  autoSquare,
  removeShadows,
  blurBackground,
  studioMode,
  whiteBackgroundPro,
  downloadImageFile,
  autoFix,
} from "../utils/magicPhotoTools";
import { BatchProvider, useBatchStore } from "../store/useBatchStore";
import { getPhotoWarnings } from "../utils/photoWarnings";

function BatchCompsInner() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const { batchItems, setBatch, updateBatchItem } = useBatchStore();
  const { parseCard, loading: parsing } = useCardParser();

  // Progress UI for analyzing batches
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzingAll, setAnalyzingAll] = useState(false);

   // Photo Hints (professional, rotating)
  const photoHints = [
    "Center the item in the frame for the most accurate analysis.",
    "Use even lighting. Reduce shadows for clearer detail.",
    "Hold your phone steady for one second to avoid blur.",
    "Move closer. Sharp detail increases buyer confidence.",
    "Keep the background simple so detection stays accurate.",
    "Wipe your camera lens to remove haze and improve clarity.",
    "Avoid overhead glare. Tilt slightly to reduce reflections.",
    "Place smaller items on a flat, solid surface for better detection.",
    "Shoot straight-on for accurate shape and color.",
    "Natural daylight gives the cleanest, most accurate results.",
    "Fill most of the frame with the item. Empty space lowers detail.",
    "After capturing, use Auto-Square for marketplace-ready formatting.",
  ];

  const [hintIndex, setHintIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => setHintIndex((i) => (i + 1) % photoHints.length),
      6000
    );
    return () => clearInterval(interval);
  }, [photoHints.length]);

  function PhotoWarningBlock({ src }) {
    const [localWarnings, setLocalWarnings] = useState([]);

    useEffect(() => {
      if (!src) {
        setLocalWarnings([]);
        return;
      }
      let cancelled = false;
      getPhotoWarnings(src)
        .then((w) => {
          if (!cancelled) setLocalWarnings(w || []);
        })
        .catch(() => {
          if (!cancelled) setLocalWarnings([]);
        });
      return () => {
        cancelled = true;
      };
    }, [src]);

    if (!localWarnings.length) return null;

    return (
      <div className="mt-2 space-y-1">
        {localWarnings.map((w, idx) => (
          <div
            key={idx}
            className="text-[10px] opacity-60 border-l-2 border-[#E8D5A8] pl-2"
          >
            {w}
          </div>
        ))}
      </div>
    );
  }

  const handleFiles = useCallback(
    async (files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;

      const processed = [];

      for (const file of incoming) {
        try {
          const fixed = await convertHeicIfNeeded(file);
          const url = URL.createObjectURL(fixed);
          processed.push({
            id:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            photo: url,
            cardAttributes: null,
            title: "",
            pricing: null,
            editedPhoto: null,
            editHistory: [],
          });
        } catch (err) {
          console.error("BatchComps HEIC conversion failed:", err);
        }
      }

      if (processed.length) {
        setBatch(processed);
      }
    },
    [setBatch]
  );

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    if (e.dataTransfer.files?.length) {
      await handleFiles(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const analyzeOne = async (item) => {
    try {
      const result = await parseCard(item.photo);
      if (!result) return;

      const title = buildCardTitle(result);
      updateBatchItem(item.id, {
        cardAttributes: result,
        title,
        pricing: result.pricing || null,
      });
    } catch (err) {
      console.error("BatchComps analyzeOne failed:", err);
    }
  };

  // Chunked analyzer — 3 at a time to avoid Netlify throttling
  const analyzeAll = async () => {
    if (!batchItems.length || parsing) return;

    setAnalyzingAll(true);
    setAnalyzeProgress(0);

    const chunkSize = 3;
    const total = batchItems.length;
    let completed = 0;

    // break into chunks of 3
    for (let i = 0; i < batchItems.length; i += chunkSize) {
      const chunk = batchItems.slice(i, i + chunkSize);

      // Run up to 3 analyses in parallel
      // eslint-disable-next-line no-await-in-loop
      await Promise.all(
        chunk.map(async (item) => {
          await analyzeOne(item);
          completed += 1;
          setAnalyzeProgress(completed / total);
        })
      );
    }

    setAnalyzingAll(false);
  };

  const fixBatch = async (item, fn) => {
    try {
      const src = item.editedPhoto || item.photo;
      if (!src) return;
      const out = await fn(src);
      updateBatchItem(item.id, {
        editedPhoto: out,
        editHistory: [...(item.editHistory || []), out],
      });
    } catch (err) {
      console.error("BatchComps photo fix failed:", err);
    }
  };

  const undoBatch = (item) => {
    const history = item?.editHistory || [];

    if (history.length <= 1) {
      updateBatchItem(item.id, { editedPhoto: null, editHistory: [] });
      return;
    }

    const newHistory = history.slice(0, -1);
    const previousVersion = newHistory[newHistory.length - 1];

    updateBatchItem(item.id, {
      editedPhoto: previousVersion,
      editHistory: newHistory,
    });
  };

  const revertBatch = (item) => {
    updateBatchItem(item.id, { editedPhoto: null, editHistory: [] });
  };

  const exportCSV = () => {
    if (!batchItems.length) return;
    const headers = "Title,Low,Mid,High,Suggested,Confidence\n";
    const rows = batchItems
      .map((i) =>
        [
          i.title || "",
          i.pricing?.low || "",
          i.pricing?.mid || "",
          i.pricing?.high || "",
          i.pricing?.suggestedListPrice || "",
          i.pricing?.confidence || "",
        ].join(",")
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "batch_comps.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Batch Market Assist
        </h1>

        <div className="magic-cta-bar mb-8 text-center">
          Use smart pricing tools to prep multiple sports cards at once.
        </div>

        {/* LAUNCH DECK CTA */}
        {batchItems.some((i) => i.customPrice || i.pricing) && (
          <div className="mb-6">
            <button
              onClick={() => navigate("/launch")}
              className="lux-small-btn"
            >
              Launch Deck
            </button>
          </div>
        )}

        {/* Upload zone */}
        <div
          className="lux-upload-zone mt-2 flex flex-col items-center justify-center cursor-pointer"
          onClick={handleBrowse}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <p className="text-lg opacity-80 mb-2">
            Drop card photos or click to upload
          </p>
          <p className="text-sm opacity-60">
            JPEG / PNG / HEIC — multiple files supported
          </p>

          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {/* Actions row */}
        {batchItems.length > 0 && (
          <div className="flex items-center justify-between mt-6 mb-4">
            <div className="text-sm opacity-75">
              {batchItems.length} card
              {batchItems.length === 1 ? "" : "s"} loaded.
            </div>
            <div className="flex gap-3">
              <button
                onClick={analyzeAll}
                className="lux-small-btn"
                disabled={parsing}
              >
                {parsing ? "Analyzing…" : "Analyze All Cards"}
              </button>
              <button onClick={exportCSV} className="lux-small-btn">
                Export Pricing CSV
              </button>
            </div>
          </div>
        )}

        {batchItems.length > 0 && analyzingAll && (
          <div className="mt-3 w-full">
            <div className="text-xs opacity-70 mb-1">
              Analyzing {Math.round(analyzeProgress * 100)}%
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E8D5A8] transition-all"
                style={{ width: `${analyzeProgress * 100}%` }}
              />
            </div>
          </div>
        )}

        {batchItems.length === 0 && (
          <div className="py-4 text-sm text-[#d6c7a1]/70">
            No sports cards in this batch.
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4">
          {batchItems.map((item) => (
            <div key={item.id} className="lux-card relative">
              {/* STATUS CHIP */}
              <div className="absolute top-2 right-2">
                <div
                  className={`
                    text-[10px] px-2 py-1 rounded-full tracking-wide uppercase
                    ${
                      item.customPrice
                        ? "bg-[#E8D5A8] text-black"
                        : item.cardAttributes
                        ? "bg-white/20 text-white/80"
                        : "bg-black/40 text-white/60"
                    }
                  `}
                >
                  {item.customPrice
                    ? "Ready"
                    : item.cardAttributes
                    ? "Analyzed"
                    : "Pending"}
                </div>
              </div>

              {item.photo && (
                <>
                  <img
                    src={item.editedPhoto || item.photo}
                    alt="Card"
                    className="w-full rounded-xl mb-3 border border-white/20"
                  />
                  <div className="text-center text-[10px] opacity-60 mt-2 select-none">
                    {photoHints[hintIndex]}
                  </div>
                  {!item.editedPhoto && (
                    <PhotoWarningBlock src={item.photo} />
                  )}
                </>
              )}

              <div className="flex items-center justify-between mb-3">
                <div className="text-xs uppercase tracking-[0.18em] opacity-70">
                  {item.cardAttributes?.player || "Card"}
                </div>
                <button
                  onClick={() => analyzeOne(item)}
                  className="lux-small-btn"
                  disabled={parsing}
                >
                  {parsing ? "Analyzing…" : "Analyze"}
                </button>
              </div>

              {item.title && (
                <div className="text-sm font-semibold mb-2">
                  {item.title}
                </div>
              )}

              {item.cardAttributes?.grading && (
                <div className="text-xs opacity-80 mb-2 space-y-0.5">
                  <div>
                    <span className="opacity-60">Centering:</span>{" "}
                    {item.cardAttributes.grading.centering || "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Corners:</span>{" "}
                    {item.cardAttributes.grading.corners || "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Edges:</span>{" "}
                    {item.cardAttributes.grading.edges || "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Surface:</span>{" "}
                    {item.cardAttributes.grading.surface || "—"}
                  </div>
                </div>
              )}

              {item.pricing && (
                <div className="mt-2 text-xs opacity-85 space-y-0.5">
                  <div>
                    <span className="opacity-60">Low:</span>{" "}
                    {item.pricing.low ? `$${item.pricing.low}` : "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Mid:</span>{" "}
                    {item.pricing.mid ? `$${item.pricing.mid}` : "—"}
                  </div>
                  <div>
                    <span className="opacity-60">High:</span>{" "}
                    {item.pricing.high ? `$${item.pricing.high}` : "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Suggested:</span>{" "}
                    {item.pricing.suggestedListPrice
                      ? `$${item.pricing.suggestedListPrice}`
                      : "—"}
                  </div>
                  <div>
                    <span className="opacity-60">Confidence:</span>{" "}
                    {item.pricing.confidence || "—"}
                  </div>

                  {/* Inline override for suggested price */}
                  <div className="mt-2">
                    <div className="text-[11px] opacity-70 mb-1">
                      Edit Suggested Price
                    </div>
                    <input
                      type="text"
                      className="w-full bg-black/40 border border-white/20 rounded-lg px-2 py-1 text-xs"
                      value={item.pricing.suggestedListPrice || ""}
                      onChange={(e) =>
                        updateBatchItem(item.id, {
                          pricing: {
                            ...item.pricing,
                            suggestedListPrice: e.target.value,
                          },
                        })
                      }
                      placeholder="e.g., 24.99"
                    />
                  </div>
                </div>
              )}

              {/* MAGIC PHOTO FIX TOOLS (per card) */}
              {item.photo && (
                <div className="flex flex-wrap gap-1 mt-3">
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, brighten)}
                  >
                    Brighten
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, warm)}
                  >
                    Warm
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, cool)}
                  >
                    Cool
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, autoSquare)}
                  >
                    Square
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, removeShadows)}
                  >
                    Shadows
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, blurBackground)}
                  >
                    Blur BG
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, whiteBackgroundPro)}
                  >
                    White BG Pro
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() => fixBatch(item, studioMode)}
                  >
                    Studio Mode
                  </button>
                  <button
                    className="lux-small-btn bg-[#E8D5A8] text-black"
                    onClick={() => fixBatch(item, autoFix)}
                  >
                    Auto-Fix
                  </button>
                  <button
                    className="lux-small-btn"
                    onClick={() =>
                      downloadImageFile(
                        item.editedPhoto || item.photo,
                        `${item.title || "card"}.jpg`
                      )
                    }
                  >
                    Save Photo
                  </button>
                  <div className="flex gap-1 mt-2 w-full">
                    <button
                      className="lux-small-btn bg-black/40 border-white/20 text-white hover:bg-black/60"
                      onClick={() => undoBatch(item)}
                    >
                      Undo
                    </button>
                    <button
                      className="lux-small-btn bg-red-500/20 border-red-500/40 text-red-200 hover:bg-red-500/30"
                      onClick={() => revertBatch(item)}
                    >
                      Revert
                    </button>
                  </div>
                </div>
              )}

              {/* INLINE PRICE EDITOR */}
              {(item.pricing || item.cardAttributes) && (
                <div className="mt-3">
                  <div className="text-xs opacity-70 mb-1">Your Price</div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="e.g. 19.99"
                      defaultValue={item.customPrice || ""}
                      onChange={(e) =>
                        updateBatchItem(item.id, {
                          customPrice: e.target.value,
                        })
                      }
                      className="
                        bg-black/40 border border-white/20 rounded-lg px-2 py-1
                        text-sm w-28 text-white focus:outline-none
                      "
                    />
                    <button
                      className="lux-small-btn"
                      onClick={() =>
                        updateBatchItem(item.id, {
                          customPrice: item.customPrice || "",
                        })
                      }
                    >
                      Set
                    </button>
                  </div>
                </div>
              )}

              {item.title && (
                <div className="flex gap-2 mt-3 flex-wrap">
                  <button
                    onClick={() => {
                      const encoded = encodeURIComponent(item.title || "");
                      if (!encoded) return;
                      window.open(
                        `https://www.ebay.com/sch/i.html?_nkw=${encoded}`,
                        "_blank"
                      );
                    }}
                    className="lux-small-btn"
                  >
                    Open eBay
                  </button>
                  <button
                    onClick={() => {
                      const encoded = encodeURIComponent(item.title || "");
                      if (!encoded) return;
                      window.open(
                        `https://www.mercari.com/search/?keyword=${encoded}`,
                        "_blank"
                      );
                    }}
                    className="lux-small-btn"
                  >
                    Open Mercari
                  </button>
                  <button
                    onClick={() => {
                      if (!item.title) return;
                      if (navigator?.clipboard?.writeText) {
                        navigator.clipboard.writeText(item.title);
                      }
                    }}
                    className="lux-small-btn"
                  >
                    Copy Title
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BatchComps() {
  return (
    <BatchProvider>
      <BatchCompsInner />
    </BatchProvider>
  );
}
