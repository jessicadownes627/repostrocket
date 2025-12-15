import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  deriveAltTextFromFilename,
  normalizePhotosArray,
} from "../utils/photoHelpers";

const ListingContext = createContext(null);
const STORAGE_KEY = "rr_draft_listing";
const SAVED_KEY = "rr_saved_drafts";
const MAGIC_KEY = "rr_magic_usage";

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
  apparelIntel: null,
  apparelAttributes: null,
};

export function ListingProvider({ children }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [listingData, setListingData] = useState(defaultListing);
  const [savedDrafts, setSavedDrafts] = useState([]);
  const [premiumUsesRemaining, setPremiumUsesRemaining] = useState(1);

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
      });
      localStorage.setItem(STORAGE_KEY, payload);
    } catch (err) {
      console.error("Failed to save draft", err);
    }
  }, [selectedPlatforms, listingData]);

  useEffect(() => {
    try {
      localStorage.setItem(SAVED_KEY, JSON.stringify(savedDrafts));
    } catch (err) {
      console.error("Failed to save drafts", err);
    }
  }, [savedDrafts]);

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
    const setListingField = (key, value) => {
      setListingData((prev) => {
        let nextValue = value;
        if (key === "photos") {
          let normalized = normalizePhotosArray(value, "item photo");
          if (normalized.length > 1) {
            normalized = normalized.slice(0, 1);
          }
          nextValue = normalized;
        } else if (key === "secondaryPhotos") {
          nextValue = normalizePhotosArray(value, "secondary photo");
        } else if (key === "cornerPhotos" && Array.isArray(value)) {
          nextValue = value.filter(Boolean);
        }
        return { ...prev, [key]: nextValue };
      });
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

    const resetListing = () => {
      setSelectedPlatforms([]);
      setListingData(defaultListing);
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
    };
  }, [selectedPlatforms, listingData, savedDrafts, premiumUsesRemaining]);

  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListingStore() {
  const ctx = useContext(ListingContext);
  if (!ctx) {
    throw new Error("useListingStore must be used within a ListingProvider");
  }
  return ctx;
}
