import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSportsBatchStore } from "../store/useSportsBatchStore";
import { convertHeicIfNeeded } from "../utils/imageTools";
import { deriveAltTextFromFilename } from "../utils/photoHelpers";
import { db } from "../db/firebase";
import { auth, storage } from "../lib/firebase";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";
import {
  collection,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { v4 as uuidv4 } from "uuid";
import { uploadBatchFile } from "../utils/batchUpload";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { generateCornerEntriesForSide } from "../utils/cardIntelClient";
import { getDownloadURL, ref as storageRef, uploadBytes } from "firebase/storage";

console.log(
  "🔥 FIREBASE PROJECT ID:",
  import.meta.env.VITE_FIREBASE_PROJECT_ID
);

const mergeIdentity = (base, incoming) => {
  const next = { ...(base || {}) };
  Object.entries(incoming || {}).forEach(([key, value]) => {
    if (key === "_sources") return;
    if (value === "" || value === null || value === undefined) return;
    if (next[key] !== undefined && next[key] !== null && next[key] !== "") return;
    next[key] = value;
  });
  next._sources = { ...(next._sources || {}), ...(incoming?._sources || {}) };
  return next;
};

export default function SportsBatchPrep() {
  const fileInputRef = useRef(null);
  const navigate = useNavigate();
  const {
    batchItems,
    batchMeta,
    setBatchMeta,
    addCard,
    updateCard,
    cardStates,
    registerAnalysisController,
    clearAnalysisController,
    abortAnalysis,
  } = useSportsBatchStore();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [unassignedBacks, setUnassignedBacks] = useState({});
  const [hiddenUploadIds, setHiddenUploadIds] = useState([]);
  const [expectedCardCount, setExpectedCardCount] = useState(0);
  const currentCardIdRef = useRef(null);
  const inFlightRef = useRef(new Set());
  const analysisTimeoutsRef = useRef(new Map());
  const cards = useMemo(
    () =>
      Object.entries(cardStates || {}).map(([cardId, state]) => ({
        id: cardId,
        ...(state || {}),
      })),
    [cardStates]
  );
  const hiddenUploadSet = useMemo(
    () => new Set(hiddenUploadIds),
    [hiddenUploadIds]
  );
  const visibleUploadedPhotos = useMemo(
    () => uploadedPhotos.filter((photo) => !hiddenUploadSet.has(photo.id)),
    [uploadedPhotos, hiddenUploadSet]
  );
  const allCardsResolved = useMemo(
    () =>
      cards.length > 0 &&
      cards.every((card) => card?.cardIntelResolved === true),
    [cards]
  );
  const allExpectedCardsReady = useMemo(
    () =>
      allCardsResolved &&
      expectedCardCount > 0 &&
      cards.length === expectedCardCount,
    [allCardsResolved, cards.length, expectedCardCount]
  );

  function normalizeMatchToken(value = "") {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isNameLike(value = "") {
    const normalized = normalizeMatchToken(value);
    if (!normalized) return false;
    if (normalized.includes("unknown player")) return false;
    const parts = normalized.split(" ").filter(Boolean);
    if (parts.length < 2) return false;
    const brandTokens = [
      "upper deck",
      "topps",
      "panini",
      "donruss",
      "fleer",
      "bowman",
      "score",
      "leaf",
    ];
    if (brandTokens.some((brand) => normalized.includes(brand))) return false;
    return true;
  }

  function scoreIdentityMatch(front = {}, back = {}) {
    const frontPlayer = normalizeMatchToken(front.player);
    const backPlayer = normalizeMatchToken(back.player);
    const frontTeam = normalizeMatchToken(front.team);
    const backTeam = normalizeMatchToken(back.team);
    const frontYear = normalizeMatchToken(front.year);
    const backYear = normalizeMatchToken(back.year);
    const frontBrand = normalizeMatchToken(front.brand || front.setName);
    const backBrand = normalizeMatchToken(back.brand || back.setName);

    let score = 0;
    let nonBrandSignals = 0;
    let playerMatch = 0;

    if (frontPlayer && backPlayer && isNameLike(front.player) && isNameLike(back.player)) {
      if (frontPlayer === backPlayer) playerMatch = 5;
      else if (frontPlayer.includes(backPlayer) || backPlayer.includes(frontPlayer)) {
        playerMatch = 3;
      }
    }
    if (playerMatch) {
      score += playerMatch;
      nonBrandSignals += 1;
    }

    if (frontTeam && backTeam) {
      if (frontTeam === backTeam) {
        score += 3;
        nonBrandSignals += 1;
      } else if (frontTeam.includes(backTeam) || backTeam.includes(frontTeam)) {
        score += 2;
        nonBrandSignals += 1;
      }
    }

    if (frontYear && backYear && frontYear === backYear) {
      score += 2;
      nonBrandSignals += 1;
    }

    if (frontBrand && backBrand) {
      if (frontBrand === backBrand) score += 1;
      else if (
        frontBrand.includes(backBrand) ||
        backBrand.includes(frontBrand)
      ) {
        score += 1;
      }
    }

    const hasRequiredSignal = playerMatch > 0 || nonBrandSignals >= 2;
    return { score, hasRequiredSignal };
  }
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch(console.error);
    }
  }, []);

  const waitForAuth = () =>
    new Promise((resolve, reject) => {
      if (auth.currentUser) return resolve(auth.currentUser);
      const unsub = onAuthStateChanged(auth, (user) => {
        if (user) {
          unsub();
          resolve(user);
        }
      });
    });

  const prepareEntry = useCallback(async (file) => {
    const processed = await convertHeicIfNeeded(file);
    const usable = processed instanceof File ? processed : file;
    const url = URL.createObjectURL(usable);
    const altText = deriveAltTextFromFilename(usable?.name) || "card photo";
    return { url, altText, file: usable };
  }, []);


  useEffect(() => {
    const batchId = batchMeta?.id;
    if (!batchId) return;
    console.log("QUERY batchId =", batchId);
    const uploadsQuery = query(
      collection(db, "batchPhotos"),
      where("batchId", "==", batchId),
      orderBy("index")
    );
    const unsubscribe = onSnapshot(
      uploadsQuery,
      (snap) => {
        const resolved = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            url: data.downloadUrl || "",
            side: data.side || "unknown",
          };
        });
        setUploadedPhotos(resolved);
      },
      (err) => {
        console.error("Failed to load batch photos", err);
      }
    );
    return () => unsubscribe();
  }, [batchMeta?.id, db]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleContinue = async () => {
    try {
      const batchId = batchMeta?.id;
      if (!batchId) {
        alert("No batch ID available.");
        return;
      }
      navigate("/sports-batch-review");
    } catch (err) {
      console.error(err);
      alert("Analysis failed. Please try again.");
    }
  };

  
  const handleRemoveImage = (cardId, card, side) => {
    abortAnalysis(cardId);
    if (side === "front") {
      updateCard(cardId, {
        frontImage: null,
        frontCorners: null,
        analysisStatus: "pending",
        analysisStatusFront: "removed",
        cardIntelResolved: false,
      });
      return;
    }
    updateCard(cardId, {
      backImage: null,
      backCorners: null,
      analysisStatusBack: "missing",
    });
  };

  const uploadCornerDataUrl = async ({ dataUrl, batchId, cardId, side, index }) => {
    if (!dataUrl || !batchId || !cardId) return null;
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const path = `batch/${batchId}/corners/${cardId}/${side}-${index}.jpg`;
    const ref = storageRef(storage, path);
    await uploadBytes(ref, blob, { contentType: "image/jpeg" });
    return getDownloadURL(ref);
  };

  const hideUploadId = (uploadId) => {
    if (!uploadId) return;
    setHiddenUploadIds((prev) =>
      prev.includes(uploadId) ? prev : [...prev, uploadId]
    );
  };

  const attachUnassignedBack = async (cardId, card, upload) => {
    if (!upload?.id || !upload?.url || !batchMeta?.id) return;
    await updateDoc(doc(db, "batchPhotos", upload.id), {
      cardIndex: card.cardIndex ?? null,
    });
    updateCard(cardId, {
      backImage: { id: upload.id, url: upload.url },
      analysisStatusBack: "pending",
    });
    hideUploadId(upload.id);
    setUnassignedBacks((prev) => {
      const next = { ...(prev || {}) };
      delete next[upload.id];
      return next;
    });
  };

  const handleReplaceImage = async (cardId, card, side, file) => {
    if (!file) return false;
    const batchId = batchMeta?.id;
    if (!batchId) {
      alert("No batch ID available.");
      return false;
    }
    try {
      abortAnalysis(cardId);
      const processed = await convertHeicIfNeeded(file);
      const uploadFile = processed instanceof File ? processed : file;
      const { uploadId, downloadUrl } = await uploadBatchFile({
        db,
        storage,
        batchId,
        file: uploadFile,
        side,
        cardId,
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
        updateCard(cardId, {
          frontImage: imagePayload,
          frontCorners: null,
          analysisStatus: "pending",
          analysisStatusFront: "pending",
          cardIntelResolved: false,
        });
        await analyzeCard({
          cardId,
          frontImageUrl: downloadUrl,
          backImageUrl: card?.backImage?.url || null,
        });
      } else {
        updateCard(cardId, {
          backImage: imagePayload,
          backCorners: null,
          analysisStatus: "pending",
          analysisStatusBack: "pending",
          cardIntelResolved: false,
        });
        setUnassignedBacks((prev) => {
          const next = { ...(prev || {}) };
          delete next[imagePayload.id];
          return next;
        });
      }
      return true;
    } catch (err) {
      console.error("Failed to replace image", err);
      alert("We couldn’t replace that photo. Please try again.");
      return false;
    }
  };

  const tryAttachBackForCard = useCallback(
    async (cardId, frontIdentity) => {
      const backEntries = Object.values(unassignedBacks || {});
      if (!backEntries.length) return;
      const candidates = backEntries
        .map((back) => {
          const { score, hasRequiredSignal } = scoreIdentityMatch(
            frontIdentity,
            back.identity || {}
          );
          return { back, score, hasRequiredSignal };
        })
        .filter((entry) => entry.hasRequiredSignal);
      if (!candidates.length) return;
      candidates.sort((a, b) => b.score - a.score);
      const best = candidates[0];
      const runnerUp = candidates[1];
      if (best.score < 5) return;
      if (runnerUp && best.score - runnerUp.score < 2) return;
      await attachUnassignedBack(cardId, cardStates?.[cardId], best.back);
      setUnassignedBacks((prev) => {
        const next = { ...(prev || {}) };
        delete next[best.back.id];
        return next;
      });
    },
    [unassignedBacks, cardStates, attachUnassignedBack]
  );

  const analyzeCard = useCallback(
    async ({ cardId, frontImageUrl, backImageUrl }) => {
      if (!cardId || !frontImageUrl) {
        console.warn("Skipping OCR: front image not ready", cardId);
        return;
      }
      if (inFlightRef.current.has(cardId)) return;
      if (cardStates?.[cardId]?.cardIntelResolved === true) return;
      inFlightRef.current.add(cardId);
      const frontCornerEntries = await generateCornerEntriesForSide(
        frontImageUrl,
        "front"
      );
      const frontCorners = await Promise.all(
        frontCornerEntries.slice(0, 4).map(async (entry, idx) => {
          const url = await uploadCornerDataUrl({
            dataUrl: entry.url,
            batchId: batchMeta?.id,
            cardId,
            side: "front",
            index: idx,
          });
          return url ? { ...entry, url } : null;
        })
      );
      const backCornerEntries = backImageUrl
        ? await generateCornerEntriesForSide(backImageUrl, "back")
        : [];
      const backCorners = backImageUrl
        ? await Promise.all(
            backCornerEntries.slice(0, 4).map(async (entry, idx) => {
              const url = await uploadCornerDataUrl({
                dataUrl: entry.url,
                batchId: batchMeta?.id,
                cardId,
                side: "back",
                index: idx,
              });
              return url ? { ...entry, url } : null;
            })
          )
        : [];
      updateCard(cardId, {
        frontCorners: frontCorners.filter(Boolean),
        backCorners: backCorners.filter(Boolean),
      });
      const controller = new AbortController();
      registerAnalysisController(cardId, controller);
      if (!analysisTimeoutsRef.current.has(cardId)) {
        const timeoutId = setTimeout(() => {
          updateCard(cardId, {
            cardIntelResolved: true,
            analysisStatus: "needs-info",
            analysisStatusFront: frontImageUrl ? "needs-info" : "missing",
            analysisStatusBack: backImageUrl ? "needs-info" : "missing",
          });
          analysisTimeoutsRef.current.delete(cardId);
        }, 25000);
        analysisTimeoutsRef.current.set(cardId, timeoutId);
      }
      updateCard(cardId, {
        analysisStatus: "pending",
        cardIntelResolved: false,
        analysisStatusFront: "pending",
        analysisStatusBack: backImageUrl ? "pending" : "missing",
      });
      let resolverSettled = false;
      const resolverTimeoutId = setTimeout(() => {
        if (resolverSettled) return;
        const fallback = cardFactsResolver({
          identity: cardStates?.[cardId]?.identity || {},
        });
        updateCard(cardId, {
          identity: fallback,
          cardIntelResolved: true,
          analysisStatus: "complete",
          analysisStatusFront: frontImageUrl ? "complete" : "missing",
          analysisStatusBack: backImageUrl ? "complete" : "missing",
        });
      }, 5000);
      try {
        const response = await fetch("/.netlify/functions/cardIntel_v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            frontImageUrl,
            backImageUrl,
            requestId: `analysis-${Date.now()}-${cardId}`,
            frontCorners: frontCorners.filter(Boolean).map((entry) => entry.url),
            backCorners: backCorners.filter(Boolean).map((entry) => entry.url),
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          updateCard(cardId, {
            cardIntelResolved: true,
            analysisStatus: "error",
          });
          return;
        }
        const data = await response.json();
        if (!data || data.error || data.status !== "ok") {
          updateCard(cardId, {
            cardIntelResolved: true,
            analysisStatus: "error",
          });
          return;
        }
        const resolved = cardFactsResolver({
          ocrLines: data.ocrLines || [],
          backOcrLines: data.backOcrLines || [],
          slabLabelLines: data.slabLabelLines || [],
        });
        if (!resolved.player) {
          const bestGuess = getLikelyPlayerFromOcr({
            ocrLines: data.ocrLines || [],
          });
          if (bestGuess) {
            resolved.player = bestGuess;
            resolved._sources = { ...(resolved._sources || {}), player: "front" };
          }
        }
        const gradeValue =
          resolved?.grade && typeof resolved.grade === "object"
            ? resolved.grade.value
            : resolved?.grade;
        resolved.isSlabbed = Boolean(resolved?.grader && gradeValue);
        updateCard(cardId, {
          identity: resolved,
          ocrLines: data.ocrLines || [],
          backOcrLines: data.backOcrLines || [],
          slabLabelLines: data.slabLabelLines || [],
          cardIntelResolved: true,
          analysisStatus: "complete",
          analysisStatusFront: "complete",
          analysisStatusBack: backImageUrl ? "complete" : "missing",
        });
        await tryAttachBackForCard(cardId, resolved);
        resolverSettled = true;
      } catch (err) {
        if (err?.name !== "AbortError") {
          console.error("Sports batch analysis failed:", err);
          updateCard(cardId, {
            cardIntelResolved: true,
            analysisStatus: "error",
          });
        }
      } finally {
        resolverSettled = true;
        clearTimeout(resolverTimeoutId);
        const timeoutId = analysisTimeoutsRef.current.get(cardId);
        if (timeoutId) {
          clearTimeout(timeoutId);
          analysisTimeoutsRef.current.delete(cardId);
        }
        inFlightRef.current.delete(cardId);
        clearAnalysisController(cardId);
      }
    },
    [
      batchMeta?.id,
      cardStates,
      clearAnalysisController,
      registerAnalysisController,
      tryAttachBackForCard,
      updateCard,
    ]
  );
  const handleFiles = useCallback(
    async (fileList) => {
      if (!fileList?.length || isUploading) return;
      const selected = Array.from(fileList);
      if (selected.length > 50) {
        alert("Please select 50 photos or fewer.");
        return;
      }
      const entries = [];
      for (const file of selected) {
        try {
          const frontPhoto = await prepareEntry(file);
          entries.push(frontPhoto);
        } catch (err) {
          console.error("Failed to prepare card photo", err);
        }
      }

      if (!entries.length) return;
      const incoming = entries.map((photo) => ({
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        photo,
        removable: true,
      }));

      setUploadError("");
      setIsUploading(true);
      const user = await waitForAuth();
      console.log("Signed in as:", user.uid);

      const currentBatchId = batchMeta?.id || uuidv4();
      const batchRef = doc(db, "batches", currentBatchId);
      if (!batchMeta?.id) {
        await setDoc(batchRef, {
          userId: "anonymous",
          createdAt: serverTimestamp(),
          maxUploads: 50,
          totalUploads: 0,
          processedUploads: 0,
          pairedCards: 0,
          status: "uploading",
        });
        setBatchMeta({ id: currentBatchId, status: "uploading" });
      }

      try {
        const baseIndex = uploadedPhotos.length;
        const currentCardsCount = Object.keys(cardStates || {}).length;
        const incomingFrontCount = incoming.reduce((count, _entry, i) => {
          const overallIndex = baseIndex + i;
          return overallIndex % 2 === 0 ? count + 1 : count;
        }, 0);
        const nextExpectedCount = Math.max(
          expectedCardCount,
          currentCardsCount + incomingFrontCount
        );
        if (nextExpectedCount !== expectedCardCount) {
          setExpectedCardCount(nextExpectedCount);
        }
        const cardIndexById = new Map();
        const unmatchedFrontCardIds = new Set();
        let nextCardIndex = 0;
        Object.entries(cardStates || {}).forEach(([cardId, state]) => {
          if (state?.cardIndex !== undefined && state?.cardIndex !== null) {
            cardIndexById.set(cardId, state.cardIndex);
            if (state.cardIndex >= nextCardIndex) {
              nextCardIndex = state.cardIndex + 1;
            }
          }
          if (state?.frontImage?.url && !state?.backImage?.url) {
            unmatchedFrontCardIds.add(cardId);
          }
        });
        for (let i = 0; i < incoming.length; i += 1) {
          const entry = incoming[i];
          const overallIndex = baseIndex + i;
          const sideCandidate = overallIndex % 2 === 0 ? "front" : "back";
          let side = sideCandidate;
          let cardIndex = null;
          let cardId = null;
          if (sideCandidate === "front") {
            cardIndex = nextCardIndex;
            nextCardIndex += 1;
            const generatedId =
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
            currentCardIdRef.current = generatedId;
            cardId = generatedId;
            cardIndexById.set(cardId, cardIndex);
            unmatchedFrontCardIds.add(cardId);
          } else if (unmatchedFrontCardIds.size === 1) {
            const [unmatchedId] = unmatchedFrontCardIds;
            cardId = unmatchedId;
            cardIndex = cardIndexById.get(cardId) ?? null;
            if (cardId) {
              unmatchedFrontCardIds.delete(cardId);
            }
          } else {
            // ambiguous back image — leave unassigned
            side = "back";
          }
          if (!(entry.photo.file instanceof File)) {
            console.error("Upload file is not a File", entry.photo.file);
          }
          const { uploadId, downloadUrl } = await uploadBatchFile({
            db,
            storage,
            batchId: currentBatchId,
            file: entry.photo.file,
            side,
            cardId: null,
          });
          await setDoc(doc(db, "batchPhotos", uploadId), {
            batchId: currentBatchId,
            downloadUrl,
            side,
            index: overallIndex,
            cardIndex: cardIndex ?? null,
            createdAt: serverTimestamp(),
          });
          const imagePayload = { id: uploadId, url: downloadUrl };
          if (side === "front" && cardId) {
            addCard({
              cardId,
              cardIndex,
              frontImage: imagePayload,
              backImage: null,
              identity: {},
              cardIntelResolved: false,
              analysisStatus: "pending",
              analysisStatusFront: "pending",
              analysisStatusBack: "missing",
            });
            await analyzeCard({
              cardId,
              frontImageUrl: downloadUrl,
              backImageUrl: null,
            });
          } else if (side === "back" && cardId) {
            updateCard(cardId, {
              backImage: imagePayload,
              cardIndex,
              analysisStatusBack: "pending",
            });
          } else if (side === "back") {
            setUnassignedBacks((prev) => ({
              ...prev,
              [uploadId]: {
                id: uploadId,
                url: downloadUrl,
                identity: null,
              },
            }));
            analyzeBackForMatching(uploadId, downloadUrl);
          }
          await updateDoc(batchRef, {
            totalUploads: increment(1),
          });
        }
      } catch (err) {
        console.error("Batch upload failed:", err);
        setUploadError("We couldn’t upload your photos. Please try again.");
      } finally {
        setIsUploading(false);
      }
    },
    [
      analyzeCard,
      batchMeta?.id,
      cardStates,
      db,
      expectedCardCount,
      isUploading,
      prepareEntry,
      setBatchMeta,
      storage,
      uploadedPhotos.length,
    ]
  );

  const runOcr = useCallback(async () => {
    const entries = Object.entries(cardStates || {});
    for (const [cardId, card] of entries) {
      if (inFlightRef.current.has(cardId)) continue;
      if (card?.cardIntelResolved === true) continue;
      const frontImageUrl = card?.frontImage?.url || "";
      const backImageUrl = card?.backImage?.url || null;
      if (!frontImageUrl) continue;
      await analyzeCard({ cardId, frontImageUrl, backImageUrl });
    }
  }, [analyzeCard, cardStates]);

  useEffect(() => {
    if (!cards.length) return;
    runOcr();
  }, [cards, runOcr]);

  const findCardForUpload = (uploadId) => {
    const entries = Object.entries(cardStates || {});
    for (const [cardId, card] of entries) {
      if (card?.frontImage?.id === uploadId) {
        return { cardId, card, side: "front" };
      }
      if (card?.backImage?.id === uploadId) {
        return { cardId, card, side: "back" };
      }
    }
    return null;
  };

  const findUnassignedBack = () =>
    visibleUploadedPhotos.find(
      (photo) =>
        photo.side === "back" &&
        !findCardForUpload(photo.id) &&
        unassignedBacks?.[photo.id]
    );

  const renderPhoto = (item) => {
    const preview = item.url || "";
    if (!preview) return null;
    const match = findCardForUpload(item.id);
    if (!match) {
      return (
        <div key={item.id} className="relative flex flex-col items-center gap-2">
          <img
            src={preview}
            alt="Unassigned card photo"
            className="w-44 aspect-[3/4] object-cover rounded-lg border border-white/10"
          />
          {item.side === "back" && (
            <div className="text-[10px] text-white/50">
              Unassigned back — use Add back
            </div>
          )}
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-[32px] px-3 text-[10px] font-medium rounded-full border border-white/15 text-white/50 hover:border-white/30 hover:text-white"
            onClick={() => hideUploadId(item.id)}
          >
            Remove
          </button>
        </div>
      );
    }
    const inputId = `prep-upload-replace-${item.id}`;
    const addBackInputId = `prep-add-back-${match.cardId}`;
    const isFront = match.side === "front";
    const needsBack = isFront && !match.card.backImage?.url;
    const unassignedBack = needsBack ? findUnassignedBack() : null;
    return (
      <div key={item.id} className="relative flex flex-col items-center gap-2">
        <img
          src={preview}
          alt="Card photo"
          className="w-44 aspect-[3/4] object-cover rounded-lg border border-white/10"
        />
        <div className="flex items-center gap-2 text-white/60">
          <label
            htmlFor={inputId}
            className="cursor-pointer inline-flex items-center justify-center min-h-[32px] px-3 text-[10px] font-medium rounded-full border border-white/20 hover:border-white/40 hover:text-white"
          >
            Edit
          </label>
          <button
            type="button"
            className="inline-flex items-center justify-center min-h-[32px] px-3 text-[10px] font-medium rounded-full border border-red-400/30 text-white/70 hover:border-red-300/60 hover:text-white"
            onClick={() => {
              handleRemoveImage(match.cardId, match.card, match.side);
              hideUploadId(item.id);
            }}
          >
            Remove
          </button>
        </div>
        {needsBack && (
          <div className="flex flex-col items-center gap-2 text-[10px] text-white/50">
            <div>Back photos help improve accuracy (optional)</div>
            <button
              type="button"
              className="inline-flex items-center justify-center min-h-[28px] px-3 text-[10px] font-medium rounded-full border border-white/15 hover:border-white/30 hover:text-white"
              onClick={async () => {
                if (unassignedBack) {
                  await attachUnassignedBack(match.cardId, match.card, unassignedBack);
                  return;
                }
                const input = document.getElementById(addBackInputId);
                if (input) input.click();
              }}
            >
              Add back
            </button>
          </div>
        )}
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            const match = findCardForUpload(item.id);
            if (match && file) {
              await handleReplaceImage(match.cardId, match.card, match.side, file);
            }
          }}
        />
        <input
          id={addBackInputId}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            await handleReplaceImage(match.cardId, match.card, "back", file);
          }}
        />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-4xl mx-auto">
        <button
          type="button"
          onClick={() => navigate("/sports-cards")}
          className="text-left text-xs uppercase tracking-[0.3em] text-[#E8DCC0] mb-4 hover:text-white transition"
        >
          ← Back
        </button>
        <h1 className="sparkly-header text-3xl mb-2 text-center">
          Batch Sports Cards
        </h1>
        {visibleUploadedPhotos.length > 0 ? (
          <div className="text-center text-white/70 text-sm mb-8 space-y-1">
            <div>Analyzing photos as they upload…</div>
            <div>You can keep adding photos — we’ll update results automatically.</div>
          </div>
        ) : (
          <>
            <p className="text-center text-white/70 text-sm mb-2">
              Upload multiple photos — we’ll organize them into cards automatically.
            </p>
            <p className="text-center text-white/55 text-sm mb-8">
              You can review everything before listings are created.
            </p>
          </>
        )}

        {visibleUploadedPhotos.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 justify-items-center">
            {visibleUploadedPhotos.map(renderPhoto)}
          </div>
        ) : (
          <div className="lux-card border border-white/10 p-8 text-center text-white/60">
            {batchItems.length ? "Cards preserved. Add more photos to continue." : "Add your photos to begin."}
          </div>
        )}
        <div className="flex flex-col items-center gap-4 mt-10">
          <button
            type="button"
            onClick={handleUploadClick}
            className="lux-continue-btn"
          >
            Select photos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => handleFiles(event.target.files)}
          />
        </div>
        {isUploading && (
          <div className="mt-6 text-center text-sm text-white/70">
            Uploading photos…
          </div>
        )}
        {uploadError && (
          <div className="mt-4 text-center text-sm text-red-300">
            {uploadError}
          </div>
        )}

        {visibleUploadedPhotos.length > 0 && allExpectedCardsReady && (
          <div className="mt-6 flex items-center justify-center">
            <button
              type="button"
              className="text-xs uppercase tracking-[0.25em] text-[#E8DCC0] border border-[#E8DCC0] rounded-full px-6 py-2 hover:text-white hover:border-white"
              onClick={handleContinue}
            >
              Review results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
