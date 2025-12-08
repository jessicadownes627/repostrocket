import { createContext, useContext, useState, useMemo } from "react";

const BatchContext = createContext(null);

export function BatchProvider({ children }) {
  const [batchItems, setBatchItems] = useState([]);

  const value = useMemo(() => {
    const setBatch = (items) => {
      setBatchItems(Array.isArray(items) ? items : []);
    };

    const updateBatchItem = (id, fields) => {
      if (!id || !fields) return;
      setBatchItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, ...fields } : item
        )
      );
    };

    return {
      batchItems,
      setBatch,
      updateBatchItem,
    };
  }, [batchItems]);

  return (
    <BatchContext.Provider value={value}>{children}</BatchContext.Provider>
  );
}

export function useBatchStore() {
  const ctx = useContext(BatchContext);
  if (!ctx) {
    throw new Error("useBatchStore must be used within a BatchProvider");
  }
  return ctx;
}

