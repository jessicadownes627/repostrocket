const BRAND_TOKENS = [
  "topps",
  "bowman",
  "donruss",
  "upper deck",
  "panini",
  "fleer",
  "score",
  "leaf",
  "prizm",
  "optic",
  "select",
];

const TEAM_TOKENS = [
  "chiefs",
  "red sox",
  "yankees",
  "dodgers",
  "giants",
  "packers",
  "cowboys",
  "eagles",
  "titans",
  "orioles",
  "lakers",
  "celtics",
  "warriors",
];

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const titleCase = (value = "") =>
  String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim();

const extractLines = (lines = []) =>
  (Array.isArray(lines) ? lines : [])
    .map((entry) => (typeof entry === "string" ? entry : entry?.text || ""))
    .map((text) => String(text || "").trim())
    .filter(Boolean);

const isNameLikeLine = (line) => {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (/[0-9]/.test(trimmed)) return false;
  if (trimmed !== trimmed.toUpperCase()) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 4) return false;
  const normalized = normalize(trimmed);
  if (BRAND_TOKENS.some((token) => normalized.includes(token))) return false;
  if (TEAM_TOKENS.some((token) => normalized.includes(token))) return false;
  return true;
};

export const getLikelyPlayerFromOcr = ({ ocrLines }) => {
  const frontLines = extractLines(ocrLines);
  if (!frontLines.length) return "";
  const candidates = frontLines.filter(isNameLikeLine);
  if (candidates.length !== 1) return "";
  return titleCase(candidates[0]);
};
