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
  const [editing, setEditing] = useState({ cardId: null, field: null });
  const [editValue, setEditValue] = useState("");
  const [editSetValue, setEditSetValue] = useState("");
  const [editModeCardId, setEditModeCardId] = useState(null);
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

  const startEdit = (cardId, field, value, setValue = "") => {
    setEditing({ cardId, field });
    setEditValue(value ?? "");
    setEditSetValue(setValue ?? "");
  };

  const saveField = (cardId, field, value) => {
    const card = cardStates?.[cardId];
    if (!card) return;
    const identity = { ...(card.identity || {}) };
    const sources = { ...(identity._sources || {}) };
    identity[field] = value;
    sources[field] = "manual";
    identity._sources = sources;
    updateCard(cardId, { identity });
    setEditing({ cardId: null, field: null });
    setEditValue("");
    setEditSetValue("");
  };

  const saveBrandSet = (cardId, brandValue, setValue) => {
    const card = cardStates?.[cardId];
    if (!card) return;
    const identity = { ...(card.identity || {}) };
    const sources = { ...(identity._sources || {}) };
    identity.brand = brandValue;
    identity.setName = setValue;
    sources.brand = "manual";
    sources.setName = "manual";
    identity._sources = sources;
    updateCard(cardId, { identity });
    setEditing({ cardId: null, field: null });
    setEditValue("");
    setEditSetValue("");
  };

  const toggleEditMode = (cardId) => {
    setEditModeCardId((prev) => {
      const next = prev === cardId ? null : cardId;
      if (next === null) {
        setEditing({ cardId: null, field: null });
        setEditValue("");
        setEditSetValue("");
      }
      return next;
    });
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
              const isEditMode = editModeCardId === card.id;
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
                            {identity.player || (
                              <span className="text-white/50">Unknown player</span>
                            )}
                          </div>
                          <div className="text-sm text-white/70">
                            {identity.team || identity.sport ? (
                              [identity.team, identity.sport].filter(Boolean).join(" • ")
                            ) : (
                              <span className="text-white/40">Team · Sport unknown</span>
                            )}
                          </div>
                          <div className="text-sm text-white/60">
                            {identity.setName || "Base"} ·{" "}
                            {identity.year || (
                              <span className="text-white/40">Year unknown</span>
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
                      className="text-xs uppercase tracking-[0.25em] text-white/60 hover:text-white"
                      onClick={() => toggleEditMode(card.id)}
                    >
                      {isEditMode ? "Done" : "Edit card details"}
                    </button>
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
                        const isEditing =
                          editing.cardId === card.id &&
                          editing.field === field.key;
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
                              {sourceBadge(source) && (
                                <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">
                                  {sourceBadge(source)}
                                </span>
                              )}
                            </div>
                            {isEditMode && isEditing ? (
                              field.key === "brandSet" ? (
                                <div className="flex gap-2 mt-2">
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    placeholder="Brand"
                                    value={editValue}
                                    onChange={(event) => setEditValue(event.target.value)}
                                  />
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    placeholder="Set"
                                    value={editSetValue}
                                    onChange={(event) =>
                                      setEditSetValue(event.target.value)
                                    }
                                  />
                                  <button
                                    type="button"
                                    className="px-3 py-2 rounded-full border border-white/20 text-xs uppercase tracking-[0.2em] text-white/70"
                                    onClick={() =>
                                      saveBrandSet(
                                        card.id,
                                        editValue.trim(),
                                        editSetValue.trim()
                                      )
                                    }
                                  >
                                    Save
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-2">
                                  <input
                                    className="flex-1 bg-black/40 border border-white/15 rounded-lg px-3 py-2 text-sm text-white"
                                    value={editValue}
                                    onChange={(event) => setEditValue(event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") {
                                        saveField(card.id, field.key, editValue.trim());
                                      }
                                    }}
                                  />
                                  <button
                                    type="button"
                                    className="px-3 py-2 rounded-full border border-white/20 text-xs uppercase tracking-[0.2em] text-white/70"
                                    onClick={() =>
                                      saveField(card.id, field.key, editValue.trim())
                                    }
                                  >
                                    Save
                                  </button>
                                </div>
                              )
                            ) : isEditMode ? (
                              <button
                                type="button"
                                className="text-left text-white text-sm hover:text-white/80 mt-2"
                                onClick={() => {
                                  if (field.key === "brandSet") {
                                    startEdit(
                                      card.id,
                                      "brandSet",
                                      identity.brand || "",
                                      identity.setName || ""
                                    );
                                    return;
                                  }
                                  startEdit(card.id, field.key, field.value || "");
                                }}
                              >
                                {displayValue}
                              </button>
                            ) : (
                              <div className="text-white text-sm mt-2">{displayValue}</div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {isEditMode && (
                      <div className="flex flex-wrap gap-3 text-xs text-white/60">
                        <label
                          htmlFor={`front-replace-${card.id}`}
                          className="cursor-pointer hover:text-white"
                        >
                          Replace front
                        </label>
                        <button
                          type="button"
                          className="hover:text-white"
                          onClick={() => handleRemoveImage(card, "front")}
                        >
                          Remove front
                        </button>
                        <label
                          htmlFor={`back-replace-${card.id}`}
                          className="cursor-pointer hover:text-white"
                        >
                          Replace back
                        </label>
                        <button
                          type="button"
                          className="hover:text-white"
                          onClick={() => handleRemoveImage(card, "back")}
                        >
                          Remove back
                        </button>
                        <button
                          type="button"
                          className="hover:text-white"
                          onClick={() => handleRemoveCard(card.id)}
                        >
                          Remove card
                        </button>
                        <input
                          id={`front-replace-${card.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            await handleReplaceImage(card, "front", file);
                          }}
                        />
                        <input
                          id={`back-replace-${card.id}`}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];
                            event.target.value = "";
                            await handleReplaceImage(card, "back", file);
                          }}
                        />
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
