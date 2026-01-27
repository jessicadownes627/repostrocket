import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";

export default function SportsBatchReview() {
  const navigate = useNavigate();
  const { cardStates } = useSportsBatchStore();
  const cards = useMemo(
    () =>
      Object.entries(cardStates || {}).map(([cardId, state]) => ({
        id: cardId,
        ...(state || {}),
      })),
    [cardStates]
  );
  const pendingCount = useMemo(
    () => cards.filter((card) => card.cardIntelResolved !== true).length,
    [cards]
  );
  const allResolved = cards.length > 0 && pendingCount === 0;


  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-5xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-batch")}
          className="text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-6"
        >
          ← Back
        </button>

        <h1 className="text-3xl text-center mb-4">Review Uploaded Cards</h1>
        <div className="text-center text-white/60 text-sm mb-6">
          We’ve organized your photos into cards and analyzed the details.
          Confirm everything looks right before creating listings.
        </div>
        {cards.length === 0 && (
          <div className="text-center text-white/60">
            No cards found for this batch.
          </div>
        )}

        {cards.length > 0 && (
          <div className="grid gap-6">
            {cards.map((card, index) => {
              const identity = card.identity || {};
              const isResolved = card.cardIntelResolved === true;
              const title =
                identity.player && identity.year
                  ? `${identity.player} · ${identity.year}`
                  : isResolved
                  ? "Untitled card"
                  : "Analyzing card…";
              const hasPlayer = Boolean(identity.player);
              const hasYear = Boolean(identity.year);
              const isComplete = hasPlayer && hasYear;
              const fieldValue = (value) =>
                value === undefined || value === null || value === "" ? "—" : value;
              const isSlabbed = identity.isSlabbed === true;
              const cardTypeLabel = isSlabbed
                ? `Slabbed${identity.grader ? ` (${identity.grader})` : ""}`
                : "Raw";
              const frontCorners = Array.isArray(card.frontCorners)
                ? card.frontCorners
                : [];
              const backCorners = Array.isArray(card.backCorners)
                ? card.backCorners
                : [];

              return (
                <div
                  key={card.id}
                  className="border border-white/10 rounded-xl p-4 flex flex-col gap-4"
                >
                  <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                    Card {index + 1}
                  </div>
                  <div className="text-base text-white">{title}</div>

                  <div className="flex flex-wrap gap-4">
                    {card.frontImage?.url ? (
                      <img
                        src={card.frontImage.url}
                        alt="Card front"
                        className="h-28 w-20 rounded-lg border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="h-28 w-20 rounded-lg border border-dashed border-white/20" />
                    )}
                    {card.backImage?.url ? (
                      <img
                        src={card.backImage.url}
                        alt="Card back"
                        className="h-28 w-20 rounded-lg border border-white/10 object-cover"
                      />
                    ) : (
                      <div className="h-28 w-20 rounded-lg border border-dashed border-white/20" />
                    )}
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">
                      Card Details
                    </div>
                    <div className="text-sm text-white/70 space-y-1">
                      <div>Player: {fieldValue(identity.player)}</div>
                      <div>Year: {fieldValue(identity.year)}</div>
                      <div>Brand: {fieldValue(identity.brand)}</div>
                      <div>Set: {fieldValue(identity.setName)}</div>
                      <div>Team: {fieldValue(identity.team)}</div>
                      <div>Sport: {fieldValue(identity.sport)}</div>
                      <div>Card Type: {cardTypeLabel}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-white/80">
                      {isComplete ? "✅ Looks good" : "⚠️ Needs attention"}
                    </div>
                    {!isComplete && (
                      <div className="text-xs text-white/50">
                        Some details couldn’t be identified automatically.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-2">
                      Corners
                    </div>
                    {isSlabbed ? (
                      <div className="text-sm text-white/60">
                        Corners not required for slabbed cards.
                      </div>
                    ) : (
                      <div className="text-sm text-white/60">
                        Cropped corner images will be used for listings.
                        <div className="grid grid-cols-4 gap-2 mt-3">
                          {frontCorners.concat(backCorners).slice(0, 8).map((corner, idx) => (
                            <img
                              key={`${card.id}-corner-${idx}`}
                              src={corner.url || corner}
                              alt={`Corner ${idx + 1}`}
                              className="h-12 w-12 rounded-lg border border-white/10 object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-10">
            {!allResolved && (
              <div className="text-center text-white/60 text-sm mb-3">
                Analyzing {pendingCount} card(s)…
              </div>
            )}
            <button
              type="button"
              disabled={!allResolved}
              className={`w-full ${
                allResolved
                  ? "lux-continue-btn"
                  : "px-6 py-3 rounded-full border border-white/15 text-white/40 text-xs uppercase tracking-[0.25em] cursor-not-allowed"
              }`}
              onClick={() => {
                if (!allResolved) return;
                navigate("/sports-batch-launch");
              }}
            >
              {allResolved ? "Continue →" : "Analyzing cards…"}
            </button>
            <div className="text-center text-white/50 text-xs mt-3">
              You can review and adjust details later.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
