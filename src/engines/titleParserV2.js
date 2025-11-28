// src/engines/titleParserV2.js
// Wrapper around the existing parser; keeps a stable export for Magic Fill.
import { parseTitle } from "./titleParser";

export async function parseTitleSmart(title = "") {
  return parseTitle(title);
}
