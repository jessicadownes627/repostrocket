import { createContext, useContext, useMemo, useState } from "react";

const SportsBatchContext = createContext(null);
const analysisControllers = new Map();

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
      [cardId]: (() => {
        const next = { ...(prev[cardId] || {}), ...(partial || {}) };
        if (
          process.env.NODE_ENV === "development" &&
          partial &&
          Object.prototype.hasOwnProperty.call(partial, "identity")
        ) {
          const prevIdentity = prev?.[cardId]?.identity;
          const nextIdentity = next?.identity;
          if (
            prevIdentity &&
            Object.keys(prevIdentity).length > 0 &&
            (!nextIdentity || Object.keys(nextIdentity).length === 0)
          ) {
            throw new Error(
              "Invariant violation: card.identity was cleared after being populated"
            );
          }
        }
        return next;
      })(),
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

  const removeCard = (cardId) => {
    if (!cardId) return;
    setCardStates((prev) => {
      const next = { ...prev };
      delete next[cardId];
      return next;
    });
  };

  const registerAnalysisController = (cardId, controller) => {
    if (!cardId || !controller) return;
    analysisControllers.set(cardId, controller);
  };

  const clearAnalysisController = (cardId) => {
    if (!cardId) return;
    analysisControllers.delete(cardId);
  };

  const abortAnalysis = (cardId) => {
    if (!cardId) return;
    const controller = analysisControllers.get(cardId);
    if (controller) {
      controller.abort();
      analysisControllers.delete(cardId);
    }
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
      removeCard,
      registerAnalysisController,
      clearAnalysisController,
      abortAnalysis,
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
