import { useCallback, useRef, useState } from "react";
import { useCardParser } from "../hooks/useCardParser";
import { buildCardTitle } from "../utils/buildCardTitle";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { BatchProvider, useBatchStore } from "../store/useBatchStore";

function BatchCompsInner() {
  const fileInputRef = useRef(null);
  const { batchItems, setBatch, updateBatchItem } = useBatchStore();
  const { parseCard, loading: parsing } = useCardParser();

  // Progress UI for analyzing batches
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzingAll, setAnalyzingAll] = useState(false);

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
          Use AI to prep pricing for multiple sports cards at once.
        </div>

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

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mt-4">
          {batchItems.map((item) => (
            <div key={item.id} className="lux-card relative">
              {/* STATUS CHIP */}
              <div className="absolute top-2 right-2">
                {item.cardAttributes ? (
                  <span className="px-2 py-1 text-[10px] rounded-lg bg-green-500/20 border border-green-400/30 text-green-200 uppercase tracking-wide">
                    Analyzed
                  </span>
                ) : analyzingAll ? (
                  <span className="px-2 py-1 text-[10px] rounded-lg bg-yellow-500/20 border border-yellow-400/30 text-yellow-200 uppercase tracking-wide">
                    Working…
                  </span>
                ) : (
                  <span className="px-2 py-1 text-[10px] rounded-lg bg-white/10 border border-white/20 text-white/70 uppercase tracking-wide">
                    Not Analyzed
                  </span>
                )}
              </div>

              {item.photo && (
                <img
                  src={item.photo}
                  alt="Card"
                  className="w-full rounded-xl mb-3 border border-white/20"
                />
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
