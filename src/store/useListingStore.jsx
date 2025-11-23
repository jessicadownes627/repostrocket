import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ListingContext = createContext(null);
const STORAGE_KEY = "rr_draft_listing";
const SAVED_KEY = "rr_saved_drafts";

const defaultListing = {
  title: "",
  description: "",
  price: "",
  category: "",
  condition: "",
  shipping: "buyer pays",
  photos: [],
  resizedPhotos: {
    poshmark: [],
    depop: [],
    ebay: [],
    facebook: [],
    etsy: [],
  },
  tags: {},
};

export function ListingProvider({ children }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);
  const [listingData, setListingData] = useState(defaultListing);
  const [savedDrafts, setSavedDrafts] = useState([]);

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
          setListingData({ ...defaultListing, ...parsed.listingData });
        }
      }
    } catch (err) {
      console.error("Failed to restore draft", err);
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

  const value = useMemo(() => {
    const setListingField = (key, value) => {
      setListingData((prev) => ({ ...prev, [key]: value }));
    };

    const addPhotos = (originals, variants = {}) => {
      const incoming = Array.from(originals || []);
      setListingData((prev) => {
        const available = Math.max(0, 4 - prev.photos.length);
        const accepted = incoming.slice(0, available);
        const nextPhotos = [...prev.photos, ...accepted];

        const nextResized = { ...prev.resizedPhotos };
        Object.entries(variants || {}).forEach(([variantKey, arr]) => {
          const current = nextResized[variantKey] || [];
          nextResized[variantKey] = [...current, ...Array.from(arr || []).slice(0, available)].slice(0, 4);
        });

        return { ...prev, photos: nextPhotos, resizedPhotos: nextResized };
      });
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
        setListingData({ ...defaultListing, ...draft });
      }
      return draft;
    };

    return {
      selectedPlatforms,
      listingData,
      savedDrafts,
      setSelectedPlatforms,
      setListingField,
      addPhotos,
      removePhoto,
      resetListing,
      addDraft,
      deleteDraft,
      loadDraft,
    };
  }, [selectedPlatforms, listingData, savedDrafts]);

  return <ListingContext.Provider value={value}>{children}</ListingContext.Provider>;
}

export function useListingStore() {
  const ctx = useContext(ListingContext);
  if (!ctx) {
    throw new Error("useListingStore must be used within a ListingProvider");
  }
  return ctx;
}
