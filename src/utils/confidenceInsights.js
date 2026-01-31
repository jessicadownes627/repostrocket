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

const LEAGUE_TOKENS = [
  { token: "nfl", label: "NFL" },
  { token: "nba", label: "NBA" },
  { token: "mlb", label: "MLB" },
  { token: "nhl", label: "NHL" },
];

const POSITION_TOKENS = [
  "qb",
  "rb",
  "wr",
  "te",
  "running back",
  "quarterback",
  "wide receiver",
  "linebacker",
  "pitcher",
  "shortstop",
  "outfielder",
  "guard",
  "forward",
  "center",
];

const TEAM_NICKNAMES = [
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

const SET_TOKENS = ["base set", "series", "set", "insert", "edition", "collection"];

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

const findBrandTokens = (lines) => {
  const normalizedLines = lines.map(normalize);
  const hits = [];
  BRAND_TOKENS.forEach((token) => {
    if (normalizedLines.some((line) => line.includes(token))) {
      hits.push(token);
    }
  });
  return Array.from(new Set(hits));
};

const findLeagueTokens = (lines) => {
  const normalizedLines = lines.map(normalize);
  const hits = [];
  LEAGUE_TOKENS.forEach((entry) => {
    if (normalizedLines.some((line) => line.includes(entry.token))) {
      hits.push(entry.label);
    }
  });
  return Array.from(new Set(hits));
};

const findPositionTokens = (lines) => {
  const normalizedLines = lines.map(normalize);
  const hits = [];
  POSITION_TOKENS.forEach((token) => {
    if (normalizedLines.some((line) => line.includes(token))) {
      hits.push(token.toUpperCase());
    }
  });
  return Array.from(new Set(hits));
};

const findTeamNicknames = (lines) => {
  const normalizedLines = lines.map(normalize);
  const hits = [];
  TEAM_NICKNAMES.forEach((token) => {
    if (normalizedLines.some((line) => line.includes(token))) {
      hits.push(token);
    }
  });
  return Array.from(new Set(hits));
};

const findSetSignals = (lines) =>
  lines.some((line) => SET_TOKENS.some((token) => normalize(line).includes(token)));

const findYearTokens = (lines) => {
  const fourDigit = [];
  const twoDigit = [];
  lines.forEach((line) => {
    const four = line.match(/\b(19|20)\d{2}\b/g) || [];
    fourDigit.push(...four);
    const two = line.match(/\b\d{2}\b/g) || [];
    twoDigit.push(...two);
  });
  return {
    fourDigit: Array.from(new Set(fourDigit)),
    twoDigit: Array.from(new Set(twoDigit)),
  };
};

const hasNameLikeLine = (lines) =>
  lines.some((line) => {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/[0-9]/.test(trimmed)) return false;
    if (trimmed !== trimmed.toUpperCase()) return false;
    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 4) return false;
    const normalized = normalize(trimmed);
    if (BRAND_TOKENS.some((token) => normalized.includes(token))) return false;
    if (TEAM_NICKNAMES.some((token) => normalized.includes(token))) return false;
    return true;
  });

export const getConfidenceInsight = (field, context = {}) => {
  const frontLines = extractLines(context.ocrLines);
  const backLines = extractLines(context.backOcrLines);
  const slabLines = extractLines(context.slabLabelLines);
  const allLines = [...frontLines, ...backLines, ...slabLines];
  const hasFrontCorner = (context.frontCornersCount || 0) > 0;

  if (!allLines.length && !hasFrontCorner) return "";

  if (field === "player") {
    if (hasNameLikeLine(frontLines)) {
      return "Based on what I can see, name-like text appears on the front.";
    }
    const jerseyHint = frontLines.find((line) =>
      /\b(#|NO\.?|NUMBER)\s*\d{1,2}\b/i.test(line)
    );
    if (jerseyHint) {
      return "Based on what I can see, a jersey number is visible.";
    }
    const leagues = findLeagueTokens(allLines);
    if (leagues.length) {
      return `Based on what I can see, league text appears (${leagues[0]}).`;
    }
    if (hasFrontCorner) {
      return "Based on what I can see, card corners were captured for review.";
    }
  }

  if (field === "year") {
    const years = findYearTokens(allLines);
    if (years.fourDigit.length) {
      return `Based on what I can see, a year-like number appears (${years.fourDigit[0]}).`;
    }
    if (years.twoDigit.length) {
      return `Based on what I can see, a two-digit year appears (${years.twoDigit[0]}).`;
    }
  }

  if (field === "brand") {
    const brands = findBrandTokens(frontLines);
    if (brands.length > 1) {
      return `Based on what I can see, multiple brand marks appear (${brands
        .slice(0, 2)
        .join(", ")}).`;
    }
    if (brands.length === 1) {
      return `Based on what I can see, a brand mark appears (${brands[0]}).`;
    }
    if (findSetSignals(frontLines)) {
      return "Based on what I can see, set/series text appears on the front.";
    }
  }

  if (field === "setName") {
    if (findSetSignals(frontLines)) {
      return "Based on what I can see, set/series text appears on the front.";
    }
    const brands = findBrandTokens(frontLines);
    if (brands.length === 1) {
      return `Based on what I can see, a brand mark appears (${brands[0]}).`;
    }
  }

  if (field === "team") {
    const teams = findTeamNicknames(allLines);
    if (teams.length) {
      return `Based on what I can see, team text appears (${teams[0]}).`;
    }
    const leagues = findLeagueTokens(allLines);
    if (leagues.length) {
      return `Based on what I can see, league text appears (${leagues[0]}).`;
    }
  }

  if (field === "sport") {
    const leagues = findLeagueTokens(allLines);
    if (leagues.length) {
      return `Based on what I can see, league text appears (${leagues[0]}).`;
    }
    const positions = findPositionTokens(allLines);
    if (positions.length) {
      return `Based on what I can see, position text appears (${positions[0]}).`;
    }
  }

  return "";
};

export const getConfidenceSuggestions = (field, context = {}) => {
  const frontLines = extractLines(context.ocrLines);
  const backLines = extractLines(context.backOcrLines);
  const slabLines = extractLines(context.slabLabelLines);
  const allLines = [...frontLines, ...backLines, ...slabLines];
  const suggestions = new Set();

  if (!allLines.length) return [];

  if (field === "player") {
    frontLines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (/[0-9]/.test(trimmed)) return;
      if (trimmed !== trimmed.toUpperCase()) return;
      const words = trimmed.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) return;
      const normalized = normalize(trimmed);
      if (BRAND_TOKENS.some((token) => normalized.includes(token))) return;
      if (TEAM_NICKNAMES.some((token) => normalized.includes(token))) return;
      suggestions.add(titleCase(trimmed));
    });
  }

  if (field === "year") {
    const years = findYearTokens(allLines);
    years.fourDigit.forEach((year) => suggestions.add(year));
  }

  if (field === "brand") {
    findBrandTokens(frontLines).forEach((token) => suggestions.add(titleCase(token)));
  }

  if (field === "setName") {
    frontLines.forEach((line) => {
      const normalized = normalize(line);
      if (!normalized) return;
      if (!SET_TOKENS.some((token) => normalized.includes(token))) return;
      suggestions.add(titleCase(line));
    });
  }

  if (field === "team") {
    findTeamNicknames(allLines).forEach((token) => suggestions.add(titleCase(token)));
  }

  if (field === "sport") {
    const normalizedLines = allLines.map(normalize);
    if (normalizedLines.some((line) => line.includes("baseball"))) {
      suggestions.add("Baseball");
    }
    if (normalizedLines.some((line) => line.includes("football"))) {
      suggestions.add("Football");
    }
    if (normalizedLines.some((line) => line.includes("basketball"))) {
      suggestions.add("Basketball");
    }
    if (normalizedLines.some((line) => line.includes("hockey"))) {
      suggestions.add("Hockey");
    }
  }

  return Array.from(suggestions).slice(0, 4);
};
