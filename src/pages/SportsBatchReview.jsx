import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../db/firebase";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";
import { composeCardTitle } from "../utils/composeCardTitle";

export default function SportsBatchReview() {
  const navigate = useNavigate();
  const { batchMeta } = useSportsBatchStore();

  const [uploads, setUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysisResults, setAnalysisResults] = useState({});
  const [analysisErrors, setAnalysisErrors] = useState({});
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [activeAnalysisId, setActiveAnalysisId] = useState(null);
  const [uploadsReady, setUploadsReady] = useState(false);

  useEffect(() => {
    const batchId = batchMeta?.id;
    if (!batchId) return;

    let alive = true;
    setIsLoading(true);
    setError("");

    const uploadsQuery = query(
      collection(db, "batchPhotos"),
      where("batchId", "==", batchId),
      orderBy("index")
    );

    const unsubscribe = onSnapshot(
      uploadsQuery,
      (snap) => {
        if (!alive) return;
        const resolved = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: data.downloadUrl || "",
            side: data.side || "unknown",
            index: data.index ?? null,
            filename: data.filename || docSnap.id,
            cardId: data.cardId || null,
            cardIndex: data.cardIndex ?? null,
          };
        });
        setUploads(resolved);
        setUploadsReady(false);
        setIsLoading(false);
        setError("");
      },
      (err) => {
        console.error("Failed to load uploads", err);
        if (alive) {
          setError("Could not load uploads.");
          setIsLoading(false);
        }
      }
    );

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [batchMeta?.id]);

  useEffect(() => {
    if (!uploads.length) {
      setUploadsReady(false);
      return;
    }
    const snapshot = uploads.map((upload) => upload.id).join(",");
    const timer = setTimeout(() => {
      setUploadsReady(true);
    }, 400);
    return () => {
      clearTimeout(timer);
    };
  }, [uploads]);

  const grouped = useMemo(() => {
    if (!uploadsReady) {
      return { cards: [], unpairedBacks: [] };
    }
    const groupedCards = new Map();
    const unpairedBacks = [];

    uploads.forEach((upload) => {
      const key = upload.cardIndex ?? null;
      if (key === null || key === undefined) {
        if (upload.side === "back") unpairedBacks.push(upload);
        return;
      }
      const entry = groupedCards.get(key) || {
        id: String(key),
        front: null,
        back: null,
        index: null,
        cardIndex: key,
      };
      if (upload.side === "front") entry.front = upload;
      if (upload.side === "back") entry.back = upload;
      if (entry.index === null || entry.index === undefined) {
        entry.index = upload.index ?? null;
      }
      groupedCards.set(key, entry);
    });

    const cards = Array.from(groupedCards.values()).sort(
      (a, b) => (a.cardIndex ?? 0) - (b.cardIndex ?? 0)
    );

    return { cards, unpairedBacks };
  }, [uploads]);

  useEffect(() => {
    if (!uploadsReady) return;
    if (analysisInFlight) return;
    const nextCard = grouped.cards.find(
      (card) =>
        card.front?.url &&
        !analysisResults[card.id] &&
        !analysisErrors[card.id]
    );
    if (!nextCard) return;

    let cancelled = false;
    const run = async () => {
      setAnalysisInFlight(true);
      setActiveAnalysisId(nextCard.id);
      const nextResults = { ...analysisResults };
      const nextErrors = { ...analysisErrors };

      try {
        const response = await fetch("/.netlify/functions/cardIntel_v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontImageUrl: nextCard.front.url,
            backImageUrl: nextCard.back?.url || null,
            requestId: `analysis-${Date.now()}-${nextCard.id}`,
          }),
        });
        if (!response.ok) {
          nextErrors[nextCard.id] = "Analysis failed.";
        } else {
          const data = await response.json();
          if (!data || data.error) {
            nextErrors[nextCard.id] = "Analysis failed.";
          } else {
            const resolved = cardFactsResolver({
              ocrLines: data.ocrLines || [],
              backOcrLines: data.backOcrLines || [],
              slabLabelLines: data.slabLabelLines || [],
            });
            const gradeValue =
              resolved?.grade && typeof resolved.grade === "object"
                ? resolved.grade.value
                : resolved?.grade;
            const isSlabbed = Boolean(
              resolved?.isSlabbed || (resolved?.grader && gradeValue)
            );
            const reviewIdentity = { ...resolved, isSlabbed };
            nextResults[nextCard.id] = {
              reviewIdentity,
              title: composeCardTitle(reviewIdentity),
            };
            delete nextErrors[nextCard.id];
          }
        }
      } catch (err) {
        nextErrors[nextCard.id] = "Analysis failed.";
      }

      if (!cancelled) {
        setAnalysisResults(nextResults);
        setAnalysisErrors(nextErrors);
        setAnalysisInFlight(false);
        setActiveAnalysisId(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [analysisErrors, analysisInFlight, analysisResults, grouped.cards, uploadsReady]);


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
        {isLoading && (
          <div className="text-center text-white/60">
            Loading uploads…
          </div>
        )}

        {error && (
          <div className="text-center text-red-300">
            {error}
          </div>
        )}

        {!isLoading && !uploadsReady && uploads.length > 0 && (
          <div className="text-center text-white/60">
            Preparing your cards…
          </div>
        )}

        {!isLoading && uploadsReady && uploads.length === 0 && (
          <div className="text-center text-white/60">
            No uploads found for this batch.
          </div>
        )}

        {uploadsReady && (
          <div className="grid gap-6">
            {grouped.cards.map((card, index) => (
            <div
              key={card.id}
              className="border border-white/10 rounded-xl p-4 flex flex-col gap-4"
            >
              <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                Card {index + 1}
              </div>
              {analysisResults[card.id]?.title && (
                <div className="text-base text-white">
                  {analysisResults[card.id].title}
                </div>
              )}
              <div className="flex flex-wrap gap-4">
                {card.front?.url ? (
                  <img
                    src={card.front.url}
                    alt={card.front.filename || "Card front"}
                    className="h-28 w-20 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="h-28 w-20 rounded-lg border border-dashed border-white/20" />
                )}
                {card.back?.url ? (
                  <img
                    src={card.back.url}
                    alt={card.back.filename || "Card back"}
                    className="h-28 w-20 rounded-lg border border-white/10 object-cover"
                  />
                ) : (
                  <div className="h-28 w-20 rounded-lg border border-dashed border-white/20" />
                )}
              </div>
              {activeAnalysisId === card.id && (
                <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                  Analyzing…
                </div>
              )}
              {analysisResults[card.id]?.reviewIdentity && (
                <div className="text-sm text-white/70 space-y-1">
                  {analysisResults[card.id].reviewIdentity.player && (
                    <div>Player: {analysisResults[card.id].reviewIdentity.player}</div>
                  )}
                  {analysisResults[card.id].reviewIdentity.year && (
                    <div>Year: {analysisResults[card.id].reviewIdentity.year}</div>
                  )}
                  {analysisResults[card.id].reviewIdentity.brand && (
                    <div>Brand: {analysisResults[card.id].reviewIdentity.brand}</div>
                  )}
                  {analysisResults[card.id].reviewIdentity.setName && (
                    <div>Set: {analysisResults[card.id].reviewIdentity.setName}</div>
                  )}
                  {analysisResults[card.id].reviewIdentity.team && (
                    <div>Team: {analysisResults[card.id].reviewIdentity.team}</div>
                  )}
                  {analysisResults[card.id].reviewIdentity.sport && (
                    <div>Sport: {analysisResults[card.id].reviewIdentity.sport}</div>
                  )}
                  <div>
                    {analysisResults[card.id].reviewIdentity.isSlabbed
                      ? "Graded"
                      : "Raw"}
                  </div>
                </div>
              )}
              {analysisResults[card.id] && (
                <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                  Analyzed
                </div>
              )}
              {analysisErrors[card.id] && (
                <div className="text-xs uppercase tracking-[0.25em] text-red-300">
                  {analysisErrors[card.id]}
                </div>
              )}
            </div>
            ))}
          </div>
        )}

        {uploadsReady && grouped.unpairedBacks.length > 0 && (
          <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50 mb-3">
              Unpaired backs
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {grouped.unpairedBacks.map((upload) => (
                <div
                  key={upload.id}
                  className="border border-white/10 rounded-xl p-3"
                >
                  {upload.url ? (
                    <img
                      src={upload.url}
                      alt={upload.filename || "Card back"}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="h-40 bg-white/5 rounded-lg" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {uploads.length > 0 && (
          <div className="mt-10">
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
