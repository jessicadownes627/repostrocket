import { createContext, useContext, useMemo, useState } from "react";

const SportsBatchContext = createContext(null);

export function SportsBatchProvider({ children }) {
  const [batchItems, setBatchItems] = useState([]);
  const [draftPhotos, setDraftPhotos] = useState([]);
  const [preparedPlatforms, setPreparedPlatforms] = useState(["ebay"]);
  const [batchMeta, setBatchMeta] = useState(null);
  const [cardStates, setCardStates] = useState({});

  const setBatch = (items) => {
    setBatchItems(Array.isArray(items) ? items : []);
  };

  const setDraft = (items) => {
    setDraftPhotos(Array.isArray(items) ? items : []);
  };

  const updateBatchItem = (id, fields) => {
    if (!id) return;
    setBatchItems((prev) =>
      prev.map((item) => {
        if (item?.id !== id) return item;
        const nextFields = typeof fields === "function" ? fields(item) : fields;
        return { ...item, ...(nextFields || {}) };
      })
    );
  };

  const updateCardState = (cardId, fields) => {
    if (!cardId) return;
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...(prev[cardId] || {}), ...(fields || {}) },
    }));
  };

  const addCard = (card) => {
    const cardId = card?.cardId || card?.id;
    if (!cardId) return;
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...(prev[cardId] || {}), ...(card || {}) },
    }));
  };

  const updateCard = (cardId, partial) => {
    if (!cardId) return;
    setCardStates((prev) => ({
      ...prev,
      [cardId]: { ...(prev[cardId] || {}), ...(partial || {}) },
    }));
  };

  const initializeCards = (cards) => {
    if (!Array.isArray(cards) || !cards.length) return;
    setCardStates((prev) => {
      const next = { ...prev };
      cards.forEach((card) => {
        const cardId = card?.cardId || card?.id;
        if (!cardId) return;
        next[cardId] = { ...(next[cardId] || {}), ...(card || {}) };
      });
      return next;
    });
  };

  const value = useMemo(
    () => ({
      batchItems,
      draftPhotos,
      preparedPlatforms,
      batchMeta,
      cardStates,
      setPreparedPlatforms,
      setBatch,
      setBatchItems,
      setDraftPhotos: setDraft,
      setBatchMeta,
      setCardStates,
      updateBatchItem,
      updateCardState,
      addCard,
      updateCard,
      initializeCards,
    }),
    [batchItems, draftPhotos, preparedPlatforms, batchMeta, cardStates]
  );

  return (
    <SportsBatchContext.Provider value={value}>
      {children}
    </SportsBatchContext.Provider>
  );
}

export function useSportsBatchStore() {
  const ctx = useContext(SportsBatchContext);
  if (!ctx) {
    throw new Error("useSportsBatchStore must be used within a SportsBatchProvider");
  }
  return ctx;
}
