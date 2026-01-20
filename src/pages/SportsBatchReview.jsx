import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";

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
  const { batchItems } = useSportsBatchStore();
  const [openCardId, setOpenCardId] = useState(null);

  const items = useMemo(() => batchItems || [], [batchItems]);

  const handleToggleDetails = (id) => {
    setOpenCardId((prev) => (prev === id ? null : id));
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
              const isSlabbed =
                identity.isSlabbed === true || item.cardType === "slabbed";
              const frontCorners = isSlabbed ? [] : item.frontCorners || [];
              const backCorners = isSlabbed ? [] : item.backCorners || [];
              const showDetails = openCardId === item.id;

              return (
                <div
                  key={item.id}
                  className="lux-card border border-white/10 p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-sm uppercase tracking-[0.25em] text-white/50">
                      Card
                    </div>
                    <div className="text-lg text-white">
                      {title || identity.player || "Untitled card"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {renderThumbnail(frontSrc, "Front")}
                    {renderThumbnail(backSrc, "Back")}
                    {frontCorners.slice(0, 1).map((corner, idx) =>
                      renderThumbnail(corner.url || corner, `Front corner ${idx + 1}`)
                    )}
                    {backCorners.slice(0, 1).map((corner, idx) =>
                      renderThumbnail(corner.url || corner, `Back corner ${idx + 1}`)
                    )}
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
