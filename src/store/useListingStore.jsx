import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  deriveAltTextFromFilename,
  normalizePhotosArray,
} from "../utils/photoHelpers";
import {
  buildCardAttributesFromIntel,
  extractCornerPhotoEntries,
  prepareCardIntelPayload,
  finalizeCardIntelResponse,
} from "../utils/cardIntelClient";
import { saveListingToLibrary } from "../utils/savedListings";
import { resolveCardFacts as cardFactsResolver } from "../utils/cardFactsResolver";
import { getLikelyPlayerFromOcr } from "../utils/confidentGuess";

const ListingContext = createContext(null);
const STORAGE_KEY = "rr_draft_listing";
const SAVED_KEY = "rr_saved_drafts";
const MAGIC_KEY = "rr_magic_usage";

const SPORTS_ANALYSIS_ERROR_MESSAGE =
  "Unable to analyze card details right now. Please retake the photos.";

const defaultListing = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
  shipping: "buyer pays",
  batchItems: [],
  photos: [],
  secondaryPhotos: [],
  cornerPhotos: [],
  frontCorners: [],
  backCorners: [],
  editedPhoto: null,
  editHistory: [],
  resizedPhotos: {
    poshmark: [],
    depop: [],
    ebay: [],
    facebook: [],
    etsy: [],
  },
  tags: {},
  cardIntel: null,
  cardAttributes: null,
  cardIntelHash: null,
  apparelIntel: null,
  apparelAttributes: null,
};

export function ListingProvider({ children }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [listingData, setListingData] = useState(defaultListing);
  const [reviewIdentity, setReviewIdentity] = useState(null);
  const [analysisState, setAnalysisState] = useState("idle");
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [premiumUsesRemaining, setPremiumUsesRemaining] = useState(1);
  const [batchMode, setBatchMode] = useState("general");
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [analysisSessionId, setAnalysisSessionId] = useState(null);
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState(null);
  const [sportsAnalysisError, setSportsAnalysisError] = useState("");
  const isNetlifyDevRuntime =
    typeof process !== "undefined" && process.env?.NETLIFY_DEV === "true";

  const commitIdentity = (listing, nextIdentity) => {
    const hasFields =
      nextIdentity &&
      (nextIdentity.player ||
        nextIdentity.team ||
        nextIdentity.year ||
        nextIdentity.setName ||
        nextIdentity.brand ||
        nextIdentity.sport);
    if (!hasFields) return listing?.identity ?? null;
    if (listing?.identity && Object.keys(listing.identity).length > 0) {
      return listing.identity;
    }
    return nextIdentity;
  };

  const resetCardIntelState = () => {
    setListingData((prev) => ({
      ...prev,
      cardIntel: null,
      cardAttributes: null,
      cardIntelHash: null,
      cornerPhotos: [],
      frontCorners: [],
      backCorners: [],
    }));
    setLastAnalyzedHash(null);
  };

  const setReviewIdentityField = (key, value, options = {}) => {
    if (!key) return;
    setReviewIdentity((prev) => {
      if (value === undefined || value === null || value === "") return prev;
      const next = prev ? { ...prev } : {};
      if (!options.force && prev[key]) return prev;
      next[key] = value;
      if (options.source) {
        next._sources = { ...(next._sources || {}), [key]: options.source };
      }
      if (options.userVerified) {
        next.userVerified = { ...(next.userVerified || {}), [key]: true };
      }
      return next;
    });
  };

  const replaceReviewIdentity = (nextIdentity) => {
    setReviewIdentity(nextIdentity || null);
  };


  const splitCornerEntries = (entries = []) => {
    const frontCorners = [];
    const backCorners = [];
    entries.forEach((entry) => {
      const side = (entry?.side || "").toLowerCase();
      if (side.includes("front")) {
        frontCorners.push(entry);
      } else if (side.includes("back")) {
        backCorners.push(entry);
      }
    });
    return { frontCorners, backCorners };
  };

  // Restore from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved = localStorage.getItem(SAVED_KEY);
      if (saved) {
        const parsedSaved = JSON.parse(saved);
        if (Array.isArray(parsedSaved)) {
          setSavedDrafts(parsedSaved);
        }
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.selectedPlatforms) {
          setSelectedPlatforms(parsed.selectedPlatforms);
        }
        if (parsed.batchMode) {
          setBatchMode(parsed.batchMode);
        }
        if (parsed.listingData) {
          const normalizedPhotos = normalizePhotosArray(
            parsed.listingData.photos,
            "item photo"
          );
          setListingData({
            ...defaultListing,
            ...parsed.listingData,
            photos: normalizedPhotos,
          });
        }
      }
    } catch (err) {
      console.error("Failed to restore draft", err);
    } finally {
      setStoreHydrated(true);
    }
  }, []);

  // Restore daily Magic Fill usage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(MAGIC_KEY);
      const today = new Date().toDateString();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.date === today && typeof parsed.remaining === "number") {
          setPremiumUsesRemaining(parsed.remaining);
          return;
        }
      }
      // default once per day
      setPremiumUsesRemaining(1);
    } catch (err) {
      console.error("Failed to restore magic usage", err);
      setPremiumUsesRemaining(1);
    }
  }, []);

  // Persist to localStorage when state changes
  useEffect(() => {
      if (analysisInFlight || import.meta.env.DEV || isNetlifyDevRuntime) {
        return;
      }
    try {
      const payload = JSON.stringify({
        selectedPlatforms,
        listingData,
        batchMode,
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.error("Failed to save draft", err);
    }
  }, [selectedPlatforms, listingData, batchMode, analysisInFlight, isNetlifyDevRuntime]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedDrafts));
    } catch (err) {
      console.error("Failed to save drafts", err);
    }
  }, [savedDrafts]);

  useEffect(() => {
    setLastAnalyzedHash((listingData?.cardIntelHash) || null);
  }, [listingData?.cardIntelHash]);

  // Persist Magic Fill usage with daily reset
  useEffect(() => {
    try {
      const today = new Date().toDateString();
      localStorage.setItem(
        MAGIC_KEY,
        JSON.stringify({ date: today, remaining: premiumUsesRemaining })
      );
    } catch (err) {
      console.error("Failed to save magic usage", err);
    }
  }, [premiumUsesRemaining]);

    const value = useMemo(() => {
      const persistSportsCardDraft = (entry) => {
        if (!entry) return;
        const shouldSkipPersistence =
          analysisInFlight || import.meta.env.DEV || isNetlifyDevRuntime;
        if (shouldSkipPersistence) return;
        const normalizedId =
          entry?.libraryId ||
          entry?.id ||
          `sports-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const payload = {
          ...entry,
          id: normalizedId,
          libraryId: normalizedId,
          type: "sports-card",
          status: "draft",
          createdAt: entry.createdAt || Date.now(),
          incomplete: true,
        };
        try {
          saveListingToLibrary(payload);
        } catch (err) {
          console.warn(
            "[persistSportsCardDraft] unable to save listing due to storage limits",
            err
          );
        }
      };

      const applyCardIntelResult = (intel) => {
        if (!intel) return;
        if (intel?.status === "timeout" || !Array.isArray(intel?.ocrLines) || !intel.ocrLines.length) {
          setAnalysisState("needsRetry");
          return;
        }
        if (intel?.status && intel.status !== "complete") return;
        const attrs = buildCardAttributesFromIntel(intel);
        const ocrLines = Array.isArray(intel?.ocrLines)
          ? intel.ocrLines
          : Array.isArray(intel?.ocrFull?.lines)
          ? intel.ocrFull.lines
          : [];
        const promotions = cardFactsResolver(ocrLines);
        console.log("[listingStore] resolver output", promotions);
        const resolvedFacts = {
          player: promotions.player || "",
          team: promotions.team || "",
          year: promotions.year || "",
          setName: promotions.setName || "",
          brand: promotions.brand || "",
          sport: promotions.sport || "",
          graded: typeof promotions.graded === "boolean" ? promotions.graded : null,
          isSlabbed: promotions.isSlabbed === true,
          grade: promotions.grade || "",
          grader: promotions.grader || "",
          condition: promotions.condition || "",
          cardTitle: promotions.cardTitle || "",
        };
        const isTitleLocked = reviewIdentity?.titleLocked === true;
        const composedTitle = isTitleLocked
          ? reviewIdentity?.cardTitle || ""
          : resolvedFacts.cardTitle || "";
        const composedGradeStatus = resolvedFacts.isSlabbed
          ? "Graded"
          : resolvedFacts.graded === false
          ? "Raw"
          : "";
        const composedIsGraded = resolvedFacts.graded;
        setListingData((prev) => {
          const existingIdentity = prev.identity ?? null;
          const nextIdentity = existingIdentity ? { ...existingIdentity } : {};
          const assignIdentity = (key, value) => {
            if (value === undefined || value === null || value === "") return;
            if (nextIdentity[key] !== undefined && nextIdentity[key] !== null && nextIdentity[key] !== "") {
              return;
            }
            nextIdentity[key] = value;
          };
          assignIdentity("player", resolvedFacts.player);
          assignIdentity("year", resolvedFacts.year);
          assignIdentity("setName", resolvedFacts.setName);
          assignIdentity("brand", resolvedFacts.brand);
          assignIdentity("team", resolvedFacts.team);
          assignIdentity("sport", resolvedFacts.sport);
          assignIdentity("isSlabbed", resolvedFacts.isSlabbed);
          assignIdentity("grade", resolvedFacts.grade);
          assignIdentity("grader", resolvedFacts.grader);
          assignIdentity("condition", resolvedFacts.condition);
          if (!isTitleLocked) {
            assignIdentity("cardTitle", composedTitle);
            assignIdentity("title", composedTitle);
          }
          assignIdentity("gradeStatus", composedGradeStatus);
          assignIdentity("isGraded", composedIsGraded);

          const committedIdentity = commitIdentity(prev, nextIdentity);
          const mergedUpdates = {
            ...prev,
            ...attrs,
            cardIntel: intel,
            cardIntelHash: intel?.imageHash || null,
            cardAttributes: attrs || prev.cardAttributes,
            identity: committedIdentity,
          };
          const cornerAssets = extractCornerPhotoEntries(intel);
          if (cornerAssets.length) {
            const existingFront = Array.isArray(prev.frontCorners) ? prev.frontCorners : [];
            const existingBack = Array.isArray(prev.backCorners) ? prev.backCorners : [];
            const { frontCorners, backCorners } = splitCornerEntries(cornerAssets);
            mergedUpdates.cornerPhotos = cornerAssets;
            mergedUpdates.frontCorners = frontCorners.length ? frontCorners : existingFront;
            mergedUpdates.backCorners = backCorners.length ? backCorners : existingBack;
          }
          const assignListingField = (key, value) => {
            if (!value) return;
            if (mergedUpdates[key]) return;
            mergedUpdates[key] = value;
          };
          assignListingField("player", resolvedFacts.player);
          assignListingField("team", resolvedFacts.team);
          assignListingField("year", resolvedFacts.year);
          assignListingField("setName", resolvedFacts.setName);
          assignListingField("brand", resolvedFacts.brand);
          assignListingField("sport", resolvedFacts.sport);
          assignListingField("isSlabbed", resolvedFacts.isSlabbed);
          assignListingField("grade", resolvedFacts.grade);
          assignListingField("grader", resolvedFacts.grader);
          assignListingField("condition", resolvedFacts.condition);
          if (!isTitleLocked) {
            assignListingField("cardTitle", composedTitle);
            assignListingField("title", composedTitle);
          }
          if (composedGradeStatus && !mergedUpdates.gradeStatus) {
            mergedUpdates.gradeStatus = composedGradeStatus;
          }
          if (typeof composedIsGraded === "boolean" && mergedUpdates.isGraded === undefined) {
            mergedUpdates.isGraded = composedIsGraded;
          }
          if (
            process.env.NODE_ENV === "development" &&
            prev.identity &&
            Object.keys(prev.identity).length > 0 &&
            (!mergedUpdates.identity || Object.keys(mergedUpdates.identity).length === 0)
          ) {
            throw new Error(
              "Invariant violation: card.identity was cleared after being populated"
            );
          }
          persistSportsCardDraft(mergedUpdates);
          return mergedUpdates;
        });
        setReviewIdentity({
          requestId: intel?.requestId || null,
          imageHash: intel?.imageHash || null,
          cardTitle: composedTitle || null,
          player: resolvedFacts.player || "",
          team: resolvedFacts.team || "",
          year: resolvedFacts.year || "",
          setName: resolvedFacts.setName || "",
          brand: resolvedFacts.brand || "",
          sport: resolvedFacts.sport || "",
          isSlabbed: resolvedFacts.isSlabbed,
          grade: resolvedFacts.grade || "",
          grader: resolvedFacts.grader || "",
          condition: resolvedFacts.condition || "",
          graded: resolvedFacts.graded,
          gradeStatus: composedGradeStatus,
          titleLocked: isTitleLocked,
        });
        setAnalysisState("complete");
        setLastAnalyzedHash(intel?.imageHash || null);
      };

    const setListingField = (key, value) => {
      setListingData((prev) => {
        let nextValue = value;
        if (key === "photos") {
          let normalized = normalizePhotosArray(value, "item photo");
          if (normalized.length > 1) {
            normalized = normalized.slice(0, 1);
          }
          nextValue = normalized;
          setSportsAnalysisError("");
          setAnalysisSessionId(null);
          setAnalysisInFlight(false);
          setLastAnalyzedHash(null);
          return {
            ...prev,
            [key]: nextValue,
            cardIntel: null,
            cardAttributes: null,
            cardIntelHash: null,
            cornerPhotos: [],
            frontCorners: [],
            backCorners: [],
          };
        }
        if (key === "secondaryPhotos") {
          nextValue = normalizePhotosArray(value, "secondary photo");
          setSportsAnalysisError("");
          setAnalysisSessionId(null);
          setAnalysisInFlight(false);
          setLastAnalyzedHash(null);
          return {
            ...prev,
            [key]: nextValue,
            cardIntel: null,
            cardAttributes: null,
            cardIntelHash: null,
            cornerPhotos: [],
            frontCorners: [],
            backCorners: [],
          };
        }
        if (key === "cornerPhotos" && Array.isArray(value)) {
          nextValue = value.filter(Boolean);
          const { frontCorners, backCorners } = splitCornerEntries(nextValue);
          return {
            ...prev,
            [key]: nextValue,
            frontCorners,
            backCorners,
          };
        }
        return { ...prev, [key]: nextValue };
      });
    };

    const clearSportsAnalysisError = () => {
      setSportsAnalysisError("");
    };

    const requestSportsAnalysisImpl = async (params) => {
      const incomingForce = params?.force;
      const incomingBypass = params?.bypassAllGuards;
      console.assert(incomingForce === true, "FORCE FLAG LOST BEFORE STORE");
      console.log("[listingStore] requestSportsAnalysis entered");
      console.log("[listingStore] flags received (raw):", {
        force: incomingForce,
        bypassAllGuards: incomingBypass,
      });
      const forceFlag = true;
      const bypassFlag = true;
      console.log("[listingStore] flags applied (forced):", {
        force: forceFlag,
        bypassAllGuards: bypassFlag,
      });
      if (!forceFlag && (analysisInFlight || analysisSessionId)) {
        console.log("[listingStore] sports analysis already running");
        return { skipped: true, reason: "in_flight" };
      }
      if (!forceFlag && !storeHydrated) {
        console.log("[listingStore] sports analysis waiting for hydration");
        return { skipped: true, reason: "not_hydrated" };
      }
      const front = Array.isArray(listingData?.photos) ? listingData.photos : [];
      const back = Array.isArray(listingData?.secondaryPhotos)
        ? listingData.secondaryPhotos
        : [];
      if (!forceFlag && !front.length) {
        console.log("[listingStore] sports analysis missing photos", {
          frontCount: front.length,
          backCount: back.length,
        });
        return { skipped: true, reason: "missing_photos" };
      }
      const sessionId = `analysis-${Date.now()}`;
      setAnalysisSessionId(sessionId);
      setAnalysisInFlight(true);
      setSportsAnalysisError("");
      setAnalysisState("analyzing");
      let resolverTimeoutId = setTimeout(() => {
        setReviewIdentity((prev) =>
          cardFactsResolver({ identity: prev ?? null })
        );
        setAnalysisState("complete");
      }, 5000);
      console.log("[listingStore] step: preparing listing payload");
      const payload = {
        ...listingData,
        category: "Sports Cards",
        photos: front,
        secondaryPhotos: back,
        frontCorners: Array.isArray(listingData?.frontCorners)
          ? listingData.frontCorners
          : [],
        backCorners: Array.isArray(listingData?.backCorners)
          ? listingData.backCorners
          : [],
      };
      const photoBundle = [...front, ...back];
      const onHashDecision = (hash) => {
        const existingHash = listingData?.cardIntelHash || lastAnalyzedHash;
        if (!forceFlag && listingData?.cardIntel && existingHash && existingHash === hash) {
          console.log("[listingStore] hash unchanged — skipping request");
          return false;
        }
        if (existingHash && existingHash !== hash) {
          console.log("[listingStore] hash mismatch — preserving prior intel until new result");
        }
        return true;
      };
      try {
        console.log("[listingStore] step: building Netlify payload");
        const prep = await prepareCardIntelPayload(payload, {
          photos: photoBundle,
          onHash: onHashDecision,
          requestId: sessionId,
          includeBackImage: Boolean(back.length),
          disableCrops: true,
          includeNameZones: true,
        });
        if (!prep || prep.error) {
          console.error("[listingStore] failed to prepare payload", prep?.error);
          setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
          return { error: prep?.error || SPORTS_ANALYSIS_ERROR_MESSAGE };
        }
        if (prep.cancelled) {
          console.log("[listingStore] sports analysis cancelled before request", {
            sessionId,
          });
          return { cancelled: true };
        }

        console.log("[client] calling /.netlify/functions/cardIntel_front", {
          requestId: prep.requestId,
          imageHash: prep.imageHash,
        });
        const minimalPayload = {
          frontImage: prep.payload?.frontImage || null,
          backImage: prep.payload?.backImage || null,
          nameZoneCrops: prep.payload?.nameZoneCrops || null,
          backNameZoneCrops: prep.payload?.backNameZoneCrops || null,
          frontCorners: Array.isArray(payload?.frontCorners) ? payload.frontCorners : [],
          backCorners: Array.isArray(payload?.backCorners) ? payload.backCorners : [],
          altText: {
            front: prep.payload?.altText?.front || "",
            back: prep.payload?.altText?.back || "",
          },
          hints: prep.payload?.hints || {},
          requestId: prep.payload?.requestId,
          imageHash: prep.payload?.imageHash,
        };
        if (!minimalPayload.frontImage) {
          console.warn("Skipping OCR: front image not ready");
          setAnalysisState("idle");
          return { cancelled: true };
        }
        console.log("[listingStore] payload sizes (bytes)", {
          frontImage: minimalPayload.frontImage ? minimalPayload.frontImage.length : 0,
        });
        let data = null;
        const response = await fetch("/.netlify/functions/cardIntel_front", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(minimalPayload),
        });
        if (!response.ok) {
          let text = "";
          try {
            text = await response.text();
          } catch (err) {
            text = err?.message || "";
          }
          console.error("[listingStore] cardIntel function error:", text);
          setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
          return { error: SPORTS_ANALYSIS_ERROR_MESSAGE };
        }
        try {
          data = await response.json();
          console.log("[CLIENT] FULL cardIntel_v2 response", data);
          console.log("[CLIENT] ocrLines value", data?.ocrLines);
        } catch (err) {
          console.error("[listingStore] failed to parse cardIntel response", err);
          setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
          return { error: SPORTS_ANALYSIS_ERROR_MESSAGE };
        }
        const ocrLines = Array.isArray(data?.ocrLines) ? data.ocrLines : [];
        const slabLabelLines = Array.isArray(data?.slabLabelLines)
          ? data.slabLabelLines
          : [];
        const resolved = cardFactsResolver({ ocrLines, slabLabelLines });
        if (!resolved.player) {
          const bestGuess = getLikelyPlayerFromOcr({ ocrLines });
          if (bestGuess) {
            resolved.player = bestGuess;
            resolved._sources = { ...(resolved._sources || {}), player: "front" };
          }
        }
        console.log("[CLIENT] resolver output", resolved);
        const hasPositionSignal = ocrLines.some((line) => {
          const text = typeof line === "string" ? line : line?.text || "";
          return /\b(RUNNING BACK|QUARTERBACK|WIDE RECEIVER|LINEBACKER|TIGHT END|QB|WR|RB|TE|LB)\b/i.test(
            text
          );
        });
        const hasPartialMetadata =
          resolved?.player &&
          (resolved?.team || hasPositionSignal) &&
          !resolved?.setName &&
          !resolved?.year;
        const metadataCompleteness = hasPartialMetadata ? "partial" : "complete";
        let committedIdentity = null;
        setReviewIdentity((prev) => {
          const preserveUserVerified = (next) => {
            if (!prev?.userVerified) return next;
            const verifiedKeys = Object.keys(prev.userVerified).filter(
              (key) => prev.userVerified[key]
            );
            if (!verifiedKeys.length) return next;
            const merged = { ...next, userVerified: { ...prev.userVerified } };
            merged._sources = { ...(merged._sources || {}) };
            verifiedKeys.forEach((key) => {
              if (prev[key]) {
                merged[key] = prev[key];
                merged._sources[key] = "manual";
              }
            });
            return merged;
          };
          const next = preserveUserVerified({
            ...resolved,
            cardType: resolved?.cardType || prev?.cardType || "",
            metadataCompleteness,
            yearAttemptedSides: Array.from(
              new Set(
                [
                  ...(prev?.yearAttemptedSides || []),
                  null,
                ].filter(Boolean)
              )
            ),
          });
          next.frontOcrLines = ocrLines;
          next.backOcrStatus =
            minimalPayload.backImage || minimalPayload.nameZoneCrops?.slabLabel
              ? "pending"
              : "complete";
          committedIdentity = next;
          return next;
        });
        setAnalysisState("complete");
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
            .then((backResponse) => {
              if (!backResponse.ok) return null;
              return backResponse.json().catch(() => null);
            })
            .then((backData) => {
              if (!backData || backData.status !== "ok") return;
              const backOcrLines = Array.isArray(backData?.backOcrLines)
                ? backData.backOcrLines
                : [];
              const slabLabelLines = Array.isArray(backData?.slabLabelLines)
                ? backData.slabLabelLines
                : [];
              console.log("[CLIENT] back OCR lines", {
                backCount: backOcrLines.length,
                slabCount: slabLabelLines.length,
              });
              if (!backOcrLines.length && !slabLabelLines.length) return;
              setReviewIdentity((prev) => {
                if (!prev) return prev;
              const resolvedBack = cardFactsResolver({
                ocrLines: prev.frontOcrLines || [],
                backOcrLines,
                slabLabelLines,
              });
              if (!resolvedBack.player) {
                const bestGuess = getLikelyPlayerFromOcr({
                  ocrLines: prev.frontOcrLines || [],
                });
                if (bestGuess) {
                  resolvedBack.player = bestGuess;
                  resolvedBack._sources = {
                    ...(resolvedBack._sources || {}),
                    player: "front",
                  };
                }
              }
                const merged = { ...prev };
                Object.entries(resolvedBack).forEach(([key, value]) => {
                  if (key === "_sources") return;
                  if (value === "" || value === null || value === undefined) return;
                  if (key === "isSlabbed" && value === true) {
                    merged.isSlabbed = true;
                    return;
                  }
                  if (merged[key] !== undefined && merged[key] !== null && merged[key] !== "") return;
                  merged[key] = value;
                });
                merged.backOcrLines = backOcrLines;
                merged.backOcrStatus = "complete";
                merged._sources = { ...(merged._sources || {}), ...(resolvedBack._sources || {}) };
                return merged;
              });
            })
            .catch(() => {});
        }
        return { success: true, intel: data, resolved };
      } catch (err) {
        console.error("Sports card analysis failed:", err);
        setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
        return { error: SPORTS_ANALYSIS_ERROR_MESSAGE };
      } finally {
        clearTimeout(resolverTimeoutId);
        setAnalysisInFlight(false);
        setAnalysisSessionId((current) => (current === sessionId ? null : current));
      }
    };

    const setBatchItems = (items) => {
      setListingData((prev) => ({ ...prev, batchItems: items || [] }));
    };

    const addBatchItem = (item) => {
      if (!item) return;
      setListingData((prev) => ({
        ...prev,
        batchItems: [...(prev.batchItems || []), item],
      }));
    };

    const addPhotos = (files) => {
      const incoming = Array.from(files || []);
      if (!incoming.length) return;

      const first = incoming[0];
      const url = URL.createObjectURL(first);
      const fallbackAlt = deriveAltTextFromFilename(first?.name);
      const entry = { url, altText: fallbackAlt, file: first };

      setListingData((prev) => ({
        ...prev,
        photos: [entry],
      }));
    };

    const removePhoto = (index) => {
      setListingData((prev) => ({
        ...prev,
        photos: prev.photos.filter((_, i) => i !== index),
        resizedPhotos: Object.fromEntries(
          Object.entries(prev.resizedPhotos || {}).map(([key, arr]) => [
            key,
            (arr || []).filter((_, i) => i !== index),
          ])
        ),
      }));
    };

    const resetListing = (mode = "general") => {
      setSelectedPlatforms([]);
      setListingData(defaultListing);
      setReviewIdentity(null);
      setBatchMode(mode);
      localStorage.removeItem(STORAGE_KEY);
    };

    const addDraft = (draft) => {
      if (!draft) return;
      const id = draft.id || `draft-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const entry = {
        ...draft,
        id,
        type: "sports-card",
        status: "draft",
        createdAt: draft.createdAt || Date.now(),
        incomplete: true,
      };
      saveListingToLibrary(entry);
      setSavedDrafts((prev) => [{ ...draft, lastEdited: Date.now(), id }, ...prev]);
    };

    const deleteDraft = (id) => {
      setSavedDrafts((prev) => prev.filter((d) => d.id !== id));
    };

    const loadDraft = (id) => {
      const draft = savedDrafts.find((d) => d.id === id);
      if (draft) {
        setSelectedPlatforms(draft.selectedPlatforms || []);
        setListingData({
          ...defaultListing,
          ...draft,
          photos: normalizePhotosArray(draft.photos, "item photo"),
        });
        saveListingToLibrary({
          ...draft,
          id: draft.id,
          type: "sports-card",
          status: "draft",
          createdAt: draft.createdAt || Date.now(),
          incomplete: true,
        });
      }
      return draft;
    };

    const setListing = (data) => {
      if (!data) {
        setListingData(defaultListing);
        return;
      }
      setListingData({
        ...defaultListing,
        ...data,
        photos: normalizePhotosArray(data.photos, "item photo"),
      });
    };

    const consumeMagicUse = () => {
      setPremiumUsesRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    };

    return {
      selectedPlatforms,
      listingData,
      reviewIdentity,
      analysisState,
      savedDrafts,
      premiumUsesRemaining,
      batchMode,
      storeHydrated,
      setSelectedPlatforms,
      setListingField,
      setBatchItems,
      addBatchItem,
      setListing,
      addPhotos,
      removePhoto,
      resetListing,
      addDraft,
      deleteDraft,
      loadDraft,
      consumeMagicUse,
      setReviewIdentityField,
      replaceReviewIdentity,
      setBatchMode,
      analysisSessionId,
      analysisInFlight,
      lastAnalyzedHash,
      sportsAnalysisError,
      requestSportsAnalysis: async (params) => requestSportsAnalysisImpl(params),
      clearSportsAnalysisError,
    };
  }, [
    selectedPlatforms,
    listingData,
    reviewIdentity,
    analysisState,
    savedDrafts,
    premiumUsesRemaining,
    batchMode,
    storeHydrated,
    analysisSessionId,
    analysisInFlight,
    lastAnalyzedHash,
    sportsAnalysisError,
  ]);

  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListingStore() {
  const ctx = useContext(ListingContext);
  if (!ctx) {
    throw new Error("useListingStore must be used within a ListingProvider");
  }
  return ctx;
}
