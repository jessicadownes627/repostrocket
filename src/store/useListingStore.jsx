import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  deriveAltTextFromFilename,
  normalizePhotosArray,
} from "../utils/photoHelpers";
import {
  analyzeCardImages,
  buildCardAttributesFromIntel,
  extractCornerPhotoEntries,
} from "../utils/cardIntel";

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
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [premiumUsesRemaining, setPremiumUsesRemaining] = useState(1);
  const [batchMode, setBatchMode] = useState("general");
  const [storeHydrated, setStoreHydrated] = useState(false);
  const [analysisSessionId, setAnalysisSessionId] = useState(null);
  const [analysisInFlight, setAnalysisInFlight] = useState(false);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState(null);
  const [sportsAnalysisError, setSportsAnalysisError] = useState("");

  const resetCardIntelState = () => {
    setListingData((prev) => ({
      ...prev,
      cardIntel: null,
      cardAttributes: null,
      cardIntelHash: null,
      cornerPhotos: [],
    }));
    setLastAnalyzedHash(null);
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
  }, [selectedPlatforms, listingData, batchMode]);

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
    const applyCardIntelResult = (intel) => {
      if (!intel) return;
      setListingData((prev) => {
        const updates = {
          ...prev,
          cardIntel: intel,
          cardIntelHash: intel?.imageHash || null,
        };
        const attrs = buildCardAttributesFromIntel(intel);
        if (attrs) {
          updates.cardAttributes = attrs;
        }
        const cornerAssets = extractCornerPhotoEntries(intel);
        if (cornerAssets.length) {
          updates.cornerPhotos = cornerAssets;
        }
        return updates;
      });
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
          };
        }
        if (key === "cornerPhotos" && Array.isArray(value)) {
          nextValue = value.filter(Boolean);
        }
        return { ...prev, [key]: nextValue };
      });
    };

    const clearSportsAnalysisError = () => {
      setSportsAnalysisError("");
    };

    const requestSportsAnalysis = async ({ force = false } = {}) => {
      if (analysisInFlight || analysisSessionId) {
        console.log("[listingStore] sports analysis already running");
        return { skipped: true, reason: "in_flight" };
      }
      if (!storeHydrated) {
        console.log("[listingStore] sports analysis waiting for hydration");
        return { skipped: true, reason: "not_hydrated" };
      }
      const front = Array.isArray(listingData?.photos) ? listingData.photos : [];
      const back = Array.isArray(listingData?.secondaryPhotos)
        ? listingData.secondaryPhotos
        : [];
      if (!front.length || !back.length) {
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
      const payload = {
        ...listingData,
        category: "Sports Cards",
        photos: front,
        secondaryPhotos: back,
      };
      const photoBundle = [...front, ...back];
      const onHashDecision = (hash) => {
        const existingHash = listingData?.cardIntelHash || lastAnalyzedHash;
        if (!force && listingData?.cardIntel && existingHash && existingHash === hash) {
          console.log("[listingStore] hash unchanged — skipping request");
          return false;
        }
        if (existingHash && existingHash !== hash) {
          console.log("[listingStore] clearing intel after hash mismatch");
          resetCardIntelState();
        }
        return true;
      };
      try {
        const intel = await analyzeCardImages(payload, {
          photos: photoBundle,
          onHash: onHashDecision,
          requestId: sessionId,
        });
        if (!intel) {
          setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
          return { error: SPORTS_ANALYSIS_ERROR_MESSAGE };
        }
        if (intel.cancelled) {
          console.log("[listingStore] sports analysis cancelled before request", {
            sessionId,
          });
          return { cancelled: true };
        }
        if (intel.error) {
          setSportsAnalysisError(intel.error);
          return { error: intel.error };
        }
        applyCardIntelResult(intel);
        return { success: true, intel };
      } catch (err) {
        console.error("Sports card analysis failed:", err);
        setSportsAnalysisError(SPORTS_ANALYSIS_ERROR_MESSAGE);
        return { error: SPORTS_ANALYSIS_ERROR_MESSAGE };
      } finally {
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
      setBatchMode(mode);
      localStorage.removeItem(STORAGE_KEY);
    };

    const addDraft = (draft) => {
      if (!draft) return;
      setSavedDrafts((prev) => [{ ...draft, lastEdited: Date.now() }, ...prev]);
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
        setBatchMode,
      analysisSessionId,
      analysisInFlight,
      lastAnalyzedHash,
      sportsAnalysisError,
      requestSportsAnalysis,
      clearSportsAnalysisError,
    };
  }, [
    selectedPlatforms,
    listingData,
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
