import { useEffect, useState } from "react";
import { parseTitle } from "../engines/titleParser";

export function useTitleParser(title) {
  const [parsed, setParsed] = useState(null);

  useEffect(() => {
    if (!title) {
      setParsed(null);
      return;
    }
    const result = parseTitle(title);
    setParsed(result);
  }, [title]);

  return parsed;
}
