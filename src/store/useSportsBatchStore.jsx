import { createContext, useContext, useMemo, useState } from "react";

const SportsBatchContext = createContext(null);

export function SportsBatchProvider({ children }) {
  const [batchItems, setBatchItems] = useState([]);
  const [preparedPlatforms, setPreparedPlatforms] = useState(["ebay"]);

  const setBatch = (items) => {
    setBatchItems(Array.isArray(items) ? items : []);
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

  const value = useMemo(
    () => ({
      batchItems,
      preparedPlatforms,
      setPreparedPlatforms,
      setBatch,
      setBatchItems,
      updateBatchItem,
    }),
    [batchItems, preparedPlatforms]
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
