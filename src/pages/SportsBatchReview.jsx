import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { buildCornerPreviewFromEntries, prepareCardIntelPayload } from "../utils/cardIntelClient";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";

const identityRows = [
  { key: "player", label: "Player" },
  { key: "year", label: "Year" },
  { key: "brand", label: "Brand" },
  { key: "setName", label: "Set" },
  { key: "team", label: "Team" },
  { key: "sport", label: "Sport" },
];

export default function SportsBatchReview() {
  const navigate = useNavigate();
  const { batchItems, updateBatchItem } = useSportsBatchStore();
  const [openCardId, setOpenCardId] = useState(null);
  const [openCornerId, setOpenCornerId] = useState(null);
  const inFlightRef = useRef(new Set());

  const items = useMemo(() => batchItems || [], [batchItems]);

  const handleToggleDetails = (id) => {
    setOpenCardId((prev) => (prev === id ? null : id));
  };

  const handleToggleCorners = (id) => {
    setOpenCornerId((prev) => (prev === id ? null : id));
  };

  const splitCornerEntries = (entries) => {
    const front = [];
    const back = [];
    entries.forEach((entry) => {
      if (entry.side === "Front") front.push(entry);
      if (entry.side === "Back") back.push(entry);
    });
    return { front, back };
  };

  const handleRecrop = async (item) => {
    if (!item?.frontImage || !item?.backImage) return;
    try {
      const preview = await buildCornerPreviewFromEntries(
        item.frontImage,
        item.backImage
      );
      if (!preview?.entries?.length) return;
      const split = splitCornerEntries(preview.entries);
      updateBatchItem(item.id, {
        frontCorners: split.front,
        backCorners: split.back,
        cornerPhotos: preview.entries,
        status:
          split.front.length >= 4 ? "ready" : "needs_attention",
      });
    } catch (err) {
      console.error("Failed to recrop corners", err);
    }
  };

  const renderThumbnail = (src, alt) => {
    if (!src) {
      return (
        <div className="h-16 w-16 rounded-lg border border-dashed border-white/20" />
      );
    }
    return (
      <img
        src={src}
        alt={alt}
        className="h-16 w-16 rounded-lg border border-white/10 object-cover"
      />
    );
  };

  useEffect(() => {
    const runAnalysisForCard = async (item) => {
      if (!item?.id) return;
      if (item.reviewIdentity?.player) return;
      if (inFlightRef.current.has(item.id)) return;
      inFlightRef.current.add(item.id);

      const front = item.frontImage || item.photos?.[0] || null;
      const back = item.backImage || item.secondaryPhotos?.[0] || null;
      const payload = {
        category: "Sports Cards",
        photos: front ? [front] : [],
        secondaryPhotos: back ? [back] : [],
        frontCorners: Array.isArray(item.frontCorners) ? item.frontCorners : [],
        backCorners: Array.isArray(item.backCorners) ? item.backCorners : [],
      };

      try {
        const prep = await prepareCardIntelPayload(payload, {
          photos: [...payload.photos, ...payload.secondaryPhotos],
          requestId: `analysis-${Date.now()}-${item.id}`,
          includeBackImage: Boolean(back),
          disableCrops: true,
          includeNameZones: true,
        });
        if (!prep || prep.error || prep.cancelled) return;

        const minimalPayload = {
          frontImage: prep.payload?.frontImage || null,
          backImage: prep.payload?.backImage || null,
          nameZoneCrops: prep.payload?.nameZoneCrops || null,
          backNameZoneCrops: prep.payload?.backNameZoneCrops || null,
          frontCorners: payload.frontCorners,
          backCorners: payload.backCorners,
          altText: {
            front: prep.payload?.altText?.front || "",
            back: prep.payload?.altText?.back || "",
          },
          hints: prep.payload?.hints || {},
          requestId: prep.payload?.requestId,
          imageHash: prep.payload?.imageHash,
        };

        const response = await fetch("/.netlify/functions/cardIntel_front", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(minimalPayload),
        });
        if (!response.ok) return;
        const data = await response.json();
        const ocrLines = Array.isArray(data?.ocrLines) ? data.ocrLines : [];
        const slabLabelLines = Array.isArray(data?.slabLabelLines)
          ? data.slabLabelLines
          : [];
        const resolved = cardFactsResolver({ ocrLines, slabLabelLines });
        const mergeIdentity = (base, incoming) => {
          const next = { ...(base || {}) };
          Object.entries(incoming || {}).forEach(([key, value]) => {
            if (key === "_sources") return;
            if (value === "" || value === null || value === undefined) return;
            if (key === "isSlabbed" && value === true) {
              next.isSlabbed = true;
              return;
            }
            if (next[key] !== undefined && next[key] !== null && next[key] !== "") return;
            next[key] = value;
          });
          next._sources = { ...(next._sources || {}), ...(incoming?._sources || {}) };
          return next;
        };
        const initialIdentity = mergeIdentity(item.reviewIdentity, resolved);
        initialIdentity.frontOcrLines = ocrLines;
        initialIdentity.backOcrStatus =
          minimalPayload.backImage || minimalPayload.nameZoneCrops?.slabLabel
            ? "pending"
            : "complete";
        updateBatchItem(item.id, { reviewIdentity: initialIdentity });

        if (minimalPayload.backImage || minimalPayload.nameZoneCrops?.slabLabel) {
          fetch("/.netlify/functions/cardIntel_back", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              backImage: minimalPayload.backImage,
              nameZoneCrops: minimalPayload.nameZoneCrops,
              backNameZoneCrops: minimalPayload.backNameZoneCrops,
              requestId: minimalPayload.requestId,
              imageHash: minimalPayload.imageHash,
            }),
          })
            .then((backResponse) => (backResponse.ok ? backResponse.json() : null))
            .then((backData) => {
              if (!backData || backData.status !== "ok") return;
              const backOcrLines = Array.isArray(backData?.backOcrLines)
                ? backData.backOcrLines
                : [];
              const slabLines = Array.isArray(backData?.slabLabelLines)
                ? backData.slabLabelLines
                : [];
              if (!backOcrLines.length && !slabLines.length) return;
              updateBatchItem(item.id, (prev) => {
                const currentIdentity = prev?.reviewIdentity || item.reviewIdentity || {};
                const resolvedBack = cardFactsResolver({
                  ocrLines: currentIdentity.frontOcrLines || ocrLines,
                  backOcrLines,
                  slabLabelLines: slabLines,
                });
                const merged = mergeIdentity(currentIdentity, resolvedBack);
                merged.backOcrLines = backOcrLines;
                merged.backOcrStatus = "complete";
                return { ...prev, reviewIdentity: merged };
              });
            })
            .catch(() => {});
        }
      } catch (err) {
        console.error("Sports batch analysis failed:", err);
      }
    };

    items.forEach((item) => {
      runAnalysisForCard(item);
    });
  }, [items, updateBatchItem]);

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-batch")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Review Batch Cards
        </h1>
        <p className="text-center text-white/65 text-sm mb-8">
          Confirm details before launch.
        </p>

        {items.length === 0 ? (
          <div className="min-h-[50vh] flex items-center justify-center text-white/70 text-center">
            No sports batch items found. Start from Sports Card Suite → Batch.
          </div>
        ) : (
          <div className="grid gap-6">
            {items.map((item) => {
              const identity = item.reviewIdentity || {};
              const title = composeCardTitle(identity);
              const frontSrc =
                item.frontImage?.url || item.photos?.[0]?.url || "";
              const backEntry = item.backImage || item.secondaryPhotos?.[0] || null;
              const backSrc =
                backEntry?.url ||
                backEntry?.dataUrl ||
                backEntry?.preview ||
                "";
              const backImageExists = Boolean(backEntry);
              const backConfidence =
                backEntry?.confidence ??
                backEntry?.confidenceScore ??
                backEntry?.score ??
                null;
              const showBackConfirmNote =
                backImageExists &&
                typeof backConfidence === "number" &&
                backConfidence < 0.6;
              const isSlabbed =
                identity.isSlabbed === true || item.cardType === "slabbed";
              const frontCorners = isSlabbed ? [] : item.frontCorners || [];
              const backCorners = isSlabbed ? [] : item.backCorners || [];
              const showDetails = openCardId === item.id;
              const showCorners = openCornerId === item.id;
              const readyStatus =
                Boolean(frontSrc) &&
                Boolean(backSrc) &&
                frontCorners.length >= 4;

              return (
                <div
                  key={item.id}
                  className="lux-card border border-white/10 p-5 flex flex-col gap-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex flex-col gap-2">
                      <div className="text-sm uppercase tracking-[0.25em] text-white/50">
                        Card
                      </div>
                      <div className="text-lg text-white">
                        {title || identity.player || "Untitled card"}
                      </div>
                    </div>
                    <div className="text-xs uppercase tracking-[0.25em] text-white/60">
                      {readyStatus ? "✅ Ready" : "⚠ Needs attention"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-6">
                    <div className="flex flex-col gap-2">
                      {renderThumbnail(frontSrc, "Front")}
                    </div>
                    <div className="flex flex-col gap-2">
                      {backImageExists ? (
                        backSrc ? (
                          renderThumbnail(backSrc, "Back")
                        ) : (
                          <div className="h-16 w-16 rounded-lg border border-white/10" />
                        )
                      ) : (
                        <div className="h-16 w-16 rounded-lg border border-dashed border-white/20 flex items-center justify-center text-[10px] uppercase tracking-[0.25em] text-white/50">
                          Back missing
                        </div>
                      )}
                      {showBackConfirmNote && (
                        <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                          Back detected — please confirm
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="text-xs uppercase tracking-[0.25em] text-[#E8DCC0] text-left"
                    onClick={() => handleToggleDetails(item.id)}
                  >
                    {showDetails ? "Hide details" : "Review details"}
                  </button>

                  {showDetails && (
                    <div className="grid gap-3 text-sm text-white/80">
                      {identityRows.map((row) => {
                        const value = identity[row.key];
                        if (!value) return null;
                        return (
                          <div key={row.key} className="flex justify-between">
                            <span className="text-white/50">{row.label}</span>
                            <span>{value}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {!isSlabbed && (
                    <div className="border-t border-white/10 pt-4">
                      <button
                        type="button"
                        className="text-xs uppercase tracking-[0.25em] text-[#E8DCC0] text-left"
                        onClick={() => handleToggleCorners(item.id)}
                      >
                        {showCorners ? "Hide corners" : "Corners (4) ▸"}
                      </button>
                      {showCorners && (
                        <div className="mt-4 grid gap-3">
                          <div className="grid grid-cols-4 gap-3">
                            {frontCorners.slice(0, 4).map((corner, idx) => (
                              <img
                                key={`front-${item.id}-${idx}`}
                                src={corner.url || corner}
                                alt={`Front corner ${idx + 1}`}
                                className="h-16 w-16 rounded-lg border border-white/10 object-cover"
                              />
                            ))}
                          </div>
                          <button
                            type="button"
                            className="text-xs uppercase tracking-[0.25em] text-white/60 text-left"
                            onClick={() => handleRecrop(item)}
                          >
                            Re-crop corners
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <div className="mt-8">
            <button
              type="button"
              className="lux-continue-btn w-full"
              onClick={() => navigate("/sports-batch-launch")}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
