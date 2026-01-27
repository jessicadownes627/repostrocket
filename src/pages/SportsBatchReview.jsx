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

        <h1 className="text-3xl text-center mb-4">
          Review Uploaded Photos
        </h1>
        <div className="text-center text-white/60 text-sm mb-6">
          We’ve organized your photos into cards. Review details and fix
          anything that looks off.
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
              return (
            <div
              key={card.id}
              className="border border-white/10 rounded-xl p-4 flex flex-col gap-4"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                Card {index + 1}
              </div>
              {identity.player && (
                <div className="text-base text-white">
                  {identity.player}
                </div>
              )}
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
              {identity && (
                <div className="text-sm text-white/70 space-y-1">
                  {identity.player && <div>Player: {identity.player}</div>}
                  {identity.year && <div>Year: {identity.year}</div>}
                  {identity.brand && <div>Brand: {identity.brand}</div>}
                  {identity.setName && <div>Set: {identity.setName}</div>}
                </div>
              )}
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
          </div>
        )}
      </div>
    </div>
  );
}
