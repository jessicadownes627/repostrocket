import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { buildCornerPreviewFromEntries } from "../utils/cardIntelClient";

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
              const backSrc =
                item.backImage?.url || item.secondaryPhotos?.[0]?.url || "";
              const backConfidence =
                item.backImage?.confidence ??
                item.backImage?.confidenceScore ??
                item.backImage?.score ??
                null;
              const showBackConfirmNote =
                Boolean(backSrc) &&
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
                      {backSrc ? (
                        renderThumbnail(backSrc, "Back")
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
