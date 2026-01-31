import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { composeCardTitle } from "../utils/composeCardTitle";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";
import { db } from "../db/firebase";
import { storage } from "../lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { uploadBatchFile } from "../utils/batchUpload";
import { convertHeicIfNeeded } from "../utils/imageTools";

export default function SportsBatchReview() {
  const navigate = useNavigate();
  const { cardStates, updateCard, removeCard, batchMeta, abortAnalysis } =
    useSportsBatchStore();
  const [editModeCardId, setEditModeCardId] = useState(null);
  const [editBuffers, setEditBuffers] = useState({});
  const cards = useMemo(
    () =>
      Object.entries(cardStates || {}).map(([cardId, state]) => ({
        id: cardId,
        ...(state || {}),
      })),
    [cardStates]
  );
  const singlePassRef = useRef(new Set());

  useEffect(() => {
    cards.forEach((card) => {
      if (!card?.id) return;
      if (!card.cardIntelResolved) return;
      if (singlePassRef.current.has(card.id)) return;
      const hasLines =
        (Array.isArray(card.ocrLines) && card.ocrLines.length > 0) ||
        (Array.isArray(card.backOcrLines) && card.backOcrLines.length > 0) ||
        (Array.isArray(card.slabLabelLines) && card.slabLabelLines.length > 0);
      if (!hasLines) return;
      const resolved = cardFactsResolver({
        identity: card.identity || {},
        ocrLines: card.ocrLines || [],
        backOcrLines: card.backOcrLines || [],
        slabLabelLines: card.slabLabelLines || [],
      });
      singlePassRef.current.add(card.id);
      updateCard(card.id, { identity: resolved });
    });
  }, [cards, updateCard]);
  const readyCards = useMemo(
    () => cards.filter((card) => card.cardIntelResolved === true),
    [cards]
  );
  const readyCount = readyCards.length;
  const canContinue = readyCount > 0;

  const renderDetecting = (label) => (
    <span className="text-white/35">
      {label}
      <span className="lux-ellipsis" />
    </span>
  );

  const renderUnknown = (label) => (
    <span className="text-white/70 flex items-center gap-2">
      {label}
      <span className="px-2 py-0.5 rounded-full border border-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40">
        Reviewed
      </span>
    </span>
  );

  const normalizeEditValue = (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return "";
    const normalized = raw.toLowerCase();
    if (normalized.startsWith("unknown")) return "";
    if (normalized === "base" || normalized === "base set") return "";
    if (normalized === "year unknown") return "";
    return raw;
  };

  const saveAllDetails = (cardId) => {
    const card = cardStates?.[cardId];
    if (!card) return;
    const buffer = editBuffers?.[cardId] || {};
    const identity = { ...(card.identity || {}) };
    const sources = { ...(identity._sources || {}) };
    const commitField = (key, value) => {
      identity[key] = value;
      sources[key] = "manual";
    };
    const normalize = (value) => String(value ?? "").trim();
    commitField("title", normalize(buffer.title));
    commitField("player", normalize(buffer.player));
    commitField("brand", normalize(buffer.brand));
    commitField("setName", normalize(buffer.setName));
    commitField("year", normalize(buffer.year));
    commitField("sport", normalize(buffer.sport));
    commitField("team", normalize(buffer.team));
    identity._sources = sources;
    updateCard(cardId, { identity });
    setEditModeCardId(null);
  };

  const toggleEditMode = (cardId) => {
    setEditModeCardId((prev) => {
      const next = prev === cardId ? null : cardId;
      return next;
    });
    setEditBuffers((prev) => {
      if (editModeCardId === cardId) return prev;
      const card = cardStates?.[cardId];
      const identity = card?.identity || {};
      return {
        ...prev,
        [cardId]: {
          title: normalizeEditValue(identity.title || ""),
          player: normalizeEditValue(identity.player || ""),
          brand: normalizeEditValue(identity.brand || ""),
          setName: normalizeEditValue(identity.setName || ""),
          year: normalizeEditValue(identity.year || ""),
          sport: normalizeEditValue(identity.sport || ""),
          team: normalizeEditValue(identity.team || ""),
        },
      };
    });
  };

  const cancelEditDetails = (cardId) => {
    setEditModeCardId(null);
    const card = cardStates?.[cardId];
    const identity = card?.identity || {};
    setEditBuffers((prev) => ({
      ...prev,
      [cardId]: {
        title: normalizeEditValue(identity.title || ""),
        player: normalizeEditValue(identity.player || ""),
        brand: normalizeEditValue(identity.brand || ""),
        setName: normalizeEditValue(identity.setName || ""),
        year: normalizeEditValue(identity.year || ""),
        sport: normalizeEditValue(identity.sport || ""),
        team: normalizeEditValue(identity.team || ""),
      },
    }));
  };

  const handleReplaceImage = async (card, side, file) => {
    if (!file) return;
    const batchId = batchMeta?.id;
    if (!batchId) {
      alert("No batch ID available.");
      return;
    }
    try {
      abortAnalysis(card.id);
      const processed = await convertHeicIfNeeded(file);
      const uploadFile = processed instanceof File ? processed : file;
      const { uploadId, downloadUrl } = await uploadBatchFile({
        db,
        storage,
        batchId,
        file: uploadFile,
        side,
        cardId: card.id,
      });
      const index =
        card.cardIndex !== undefined && card.cardIndex !== null
          ? card.cardIndex * 2 + (side === "back" ? 1 : 0)
          : null;
      await setDoc(doc(db, "batchPhotos", uploadId), {
        batchId,
        downloadUrl,
        side,
        index,
        cardIndex: card.cardIndex ?? null,
        createdAt: serverTimestamp(),
      });
      const imagePayload = { id: uploadId, url: downloadUrl };
      if (side === "front") {
        updateCard(card.id, {
          frontImage: imagePayload,
          frontCorners: null,
          analysisStatus: "pending",
          analysisStatusFront: "pending",
          cardIntelResolved: false,
        });
      } else {
        updateCard(card.id, {
          backImage: imagePayload,
          backCorners: null,
          analysisStatus: "pending",
          analysisStatusBack: "pending",
          cardIntelResolved: false,
        });
      }
    } catch (err) {
      console.error("Failed to replace image", err);
      alert("We couldn’t replace that photo. Please try again.");
    }
  };

  const handleRemoveImage = (card, side) => {
    abortAnalysis(card.id);
    if (side === "front") {
      updateCard(card.id, {
        frontImage: null,
        frontCorners: null,
        analysisStatus: "pending",
        analysisStatusFront: "removed",
        cardIntelResolved: false,
      });
      return;
    }
    updateCard(card.id, {
      backImage: null,
      backCorners: null,
      analysisStatusBack: "missing",
    });
  };

  const handleRemoveCard = (cardId) => {
    abortAnalysis(cardId);
    removeCard(cardId);
  };


  const sourceBadge = (source) => {
    if (!source) return null;
    const map = {
      front: "Front",
      back: "Back",
      slab: "Slab",
      inferred: "Inferred",
      estimated: "Estimated",
      manual: "Manual",
    };
    return map[source] || null;
  };

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

        <h1 className="text-3xl text-center mb-4">Review your cards</h1>
        {cards.length === 0 && (
          <div className="text-center text-white/60">
            No cards found for this batch.
          </div>
        )}

        {cards.length > 0 && (
          <div className="grid gap-4">
            {cards.map((card, index) => {
              const identity = card.identity || {};
              const isSlabbed = identity.isSlabbed === true;
              const frontCorners = Array.isArray(card.frontCorners)
                ? card.frontCorners
                : [];
              const cornerSlots = 4;

              const hasFrontImage = Boolean(card.frontImage?.url);
              const hasBackImage = Boolean(card.backImage?.url);
              const status = card.cardIntelResolved ? "Ready" : "Editable";
              const isResolved = card.cardIntelResolved === true;
              const isEditMode = editModeCardId === card.id;
              const buffer = editBuffers?.[card.id] || {};
              const titleValue =
                identity.title ||
                composeCardTitle({
                  year: identity.year,
                  setName: identity.setName,
                  player: identity.player,
                  brand: identity.brand,
                }) ||
                "Untitled";
              return (
                <details
                  key={card.id}
                  className="border border-white/10 rounded-xl p-3"
                >
                  <summary className="cursor-pointer list-none">
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-[0.25em] text-white/50">
                        Card {index + 1}
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="flex items-center gap-2 shrink-0">
                          {hasFrontImage ? (
                            <img
                              src={card.frontImage.url}
                              alt="Card front"
                              className="w-16 h-auto rounded border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="w-16 aspect-[3/4] rounded border border-dashed border-white/20" />
                          )}
                          {hasBackImage ? (
                            <img
                              src={card.backImage.url}
                              alt="Card back"
                              className="w-16 h-auto rounded border border-white/10 object-cover"
                            />
                          ) : (
                            <div className="w-16 aspect-[3/4] rounded border border-dashed border-white/20 flex items-center justify-center text-[9px] text-white/40">
                              Back optional
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="text-base text-white">
                            {identity.player ||
                              (isResolved
                                ? renderUnknown("Unknown player")
                                : renderDetecting("Detecting player"))}
                          </div>
                          <div className="text-sm text-white/70">
                            {identity.team || identity.sport
                              ? [identity.team, identity.sport].filter(Boolean).join(" • ")
                              : isResolved
                              ? renderUnknown("Unknown team · sport")
                              : renderDetecting("Detecting team · sport")}
                          </div>
                          <div className="text-sm text-white/60">
                            {identity.setName || identity.year ? (
                              <>
                                {identity.setName || "Unknown set"} ·{" "}
                                {identity.year || "Unknown year"}
                              </>
                            ) : isResolved ? (
                              renderUnknown("Unknown set · year")
                            ) : (
                              renderDetecting("Detecting set · year")
                            )}
                          </div>
                          {!isSlabbed && frontCorners.length > 0 && (
                            <div className="flex gap-2 pt-1">
                              {frontCorners.slice(0, cornerSlots).map((corner, idx) => (
                                <img
                                  key={`${card.id}-corner-summary-${idx}`}
                                  src={corner.url || corner}
                                  alt={`Front corner ${idx + 1}`}
                                  className="h-10 w-10 rounded-md border border-white/10 object-cover"
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                          Details ▸
                        </div>
                      </div>
                    </div>
                  </summary>
                  <div className="mt-4 space-y-4 text-sm">
                    <button
                      type="button"
                      className="inline-flex items-center px-4 py-2 rounded-full border border-white/15 text-xs uppercase tracking-[0.25em] text-white/70 hover:text-white"
                      onClick={() => toggleEditMode(card.id)}
                    >
                      {isEditMode ? "Done" : "Edit card details"}
                    </button>
                    {isEditMode && (
                      <h3 className="text-sm uppercase tracking-[0.25em] text-white/70">
                        Edit card details
                      </h3>
                    )}
                    <div className="grid gap-3">
                      {[
                        { key: "title", label: "Title", value: titleValue },
                        { key: "player", label: "Player", value: identity.player },
                        {
                          key: "brandSet",
                          label: "Brand / Set",
                          value: `${identity.brand || ""}${identity.brand && identity.setName ? " / " : ""}${identity.setName || ""}`,
                        },
                        { key: "year", label: "Year", value: identity.year },
                        { key: "sport", label: "Sport", value: identity.sport },
                        { key: "team", label: "Team", value: identity.team },
                      ].map((field) => {
                        const displayValue =
                          field.value === undefined || field.value === null || field.value === ""
                            ? "—"
                            : field.value;
                        const source = identity?._sources?.[field.key];
                        return (
                          <div
                            key={`${card.id}-${field.key}`}
                            className="border border-white/10 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="text-xs uppercase tracking-[0.2em] text-white/50">
                                {field.label}
                              </div>
                              {!isEditMode && sourceBadge(source) && (
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                                  {sourceBadge(source)}
                                </span>
                              )}
                            </div>
                            {isEditMode ? (
                              field.key === "brandSet" ? (
                                <div className="flex gap-2 mt-2">
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    placeholder="Brand"
                                    value={buffer.brand || ""}
                                    onChange={(event) =>
                                      setEditBuffers((prev) => ({
                                        ...prev,
                                        [card.id]: {
                                          ...(prev?.[card.id] || {}),
                                          brand: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    placeholder="Set"
                                    value={buffer.setName || ""}
                                    onChange={(event) =>
                                      setEditBuffers((prev) => ({
                                        ...prev,
                                        [card.id]: {
                                          ...(prev?.[card.id] || {}),
                                          setName: event.target.value,
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    value={buffer[field.key] || ""}
                                    onChange={(event) =>
                                      setEditBuffers((prev) => ({
                                        ...prev,
                                        [card.id]: {
                                          ...(prev?.[card.id] || {}),
                                          [field.key]: event.target.value,
                                        },
                                      }))
                                    }
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        saveAllDetails(card.id);
                                      }
                                    }}
                                  />
                                </div>
                              )
                            ) : (
                              <div className="text-white text-sm mt-2">{displayValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isEditMode && (
                      <div className="flex justify-end gap-3">
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full border border-white/10 text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white"
                          onClick={() => cancelEditDetails(card.id)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 rounded-full border border-white/20 text-xs uppercase tracking-[0.2em] text-white/70 hover:text-white"
                          onClick={() => saveAllDetails(card.id)}
                        >
                          Save details
                        </button>
                      </div>
                    )}

                  </div>
                </details>
              );
            })}
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-10">
            <button
              type="button"
              disabled={!canContinue}
              className={`w-full ${
                canContinue
                  ? "lux-continue-btn"
                  : "px-6 py-3 rounded-full border border-white/15 text-white/40 text-xs uppercase tracking-[0.25em] cursor-not-allowed"
              }`}
              onClick={() => {
                if (!canContinue) return;
                navigate("/sports-batch-launch", {
                  state: { includeCardIds: readyCards.map((card) => card.id) },
                });
              }}
            >
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
