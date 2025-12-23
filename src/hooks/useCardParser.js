import { useState } from "react";
import { analyzeImageForCardData } from "../engines/cardVision";

const CARD_VISION_ENABLED =
  typeof import.meta !== "undefined" &&
  import.meta.env &&
  import.meta.env.VITE_CARD_VISION_ENABLED === "true";

export function useCardParser() {
  const [cardData, setCardData] = useState(null);
  const [loading, setLoading] = useState(false);

  const parseCard = async (image) => {
    if (!CARD_VISION_ENABLED) {
      console.log("[cardVision] disabled — skipping parse");
      return null;
    }
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
