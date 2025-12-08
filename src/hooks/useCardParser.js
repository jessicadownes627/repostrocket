import { useState } from "react";
import { analyzeImageForCardData } from "../engines/cardVision";

export function useCardParser() {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseCard = async (image) => {
    setLoading(true);
    try {
      const result = await analyzeImageForCardData(image);
      setCardData(result);
      return result;
    } catch (err) {
      console.error("Card parser failed:", err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { cardData, parseCard, loading };
}

