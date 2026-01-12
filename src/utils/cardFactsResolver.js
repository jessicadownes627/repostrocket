const MLB_TEAMS = [
  "angels",
  "astros",
  "athletics",
  "blue jays",
  "braves",
  "brewers",
  "cardinals",
  "cubs",
  "diamondbacks",
  "dodgers",
  "giants",
  "guardians",
  "mariners",
  "marlins",
  "mets",
  "nationals",
  "orioles",
  "padres",
  "phillies",
  "pirates",
  "rangers",
  "rays",
  "red sox",
  "reds",
  "rockies",
  "royals",
  "tigers",
  "twins",
  "white sox",
  "yankees",
];

const NFL_TEAMS = [
  "bears",
  "bengals",
  "bills",
  "broncos",
  "browns",
  "buccaneers",
  "cardinals",
  "chargers",
  "chiefs",
  "colts",
  "cowboys",
  "dolphins",
  "eagles",
  "forty niners",
  "falcons",
  "giants",
  "jaguars",
  "jets",
  "lions",
  "packers",
  "panthers",
  "patriots",
  "raiders",
  "rams",
  "ravens",
  "saints",
  "seahawks",
  "steelers",
  "texans",
  "titans",
  "vikings",
];

const NBA_TEAMS = [
  "celtics",
  "nets",
  "knicks",
  "76ers",
  "raptors",
  "bucks",
  "pistons",
  "bulls",
  "suns",
  "warriors",
  "clippers",
  "lakers",
  "kings",
  "mavericks",
  "rockets",
  "grizzlies",
  "hornets",
  "pelicans",
  "spurs",
  "thunder",
  "timberwolves",
  "jazz",
  "trail blazers",
  "magic",
  "hawks",
  "kings",
  "pacers",
  "pistons",
  "wizards",
];

const NHL_TEAMS = [
  "bruins",
  "sabres",
  "devils",
  "islanders",
  "rangers",
  "flyers",
  "penguins",
  "devils",
  "panthers",
  "lightning",
  "capitals",
  "blackhawks",
  "avalanche",
  "jets",
  "wild",
  "predators",
  "blue jackets",
  "oilers",
  "flames",
  "canucks",
  "kings",
  "sharks",
  "kraken",
  "ducks",
  "stars",
  "coyotes",
  "golden knights",
  "canadiens",
  "maple leafs",
  "senators",
];

const LEAGUE_LOOKUP = [
  { league: "MLB", sport: "Baseball", keywords: MLB_TEAMS },
  { league: "NFL", sport: "Football", keywords: NFL_TEAMS },
  { league: "NBA", sport: "Basketball", keywords: NBA_TEAMS },
  { league: "NHL", sport: "Hockey", keywords: NHL_TEAMS },
];

const POSITION_MAP = {
  "P": "Pitcher",
  "SP": "Starting Pitcher",
  "RP": "Relief Pitcher",
  "C": "Catcher",
  "1B": "First Base",
  "2B": "Second Base",
  "SS": "Shortstop",
  "3B": "Third Base",
  "OF": "Outfielder",
  "DH": "Designated Hitter",
  "INF": "Infielder",
  "UTIL": "Utility",
  "G": "Guard",
  "F": "Forward",
  "CFB": "Center (Basketball)",
};

const VERIFIED_STATES = new Set(["verified", "true", true]);

function matchesLeague(team) {
  if (!team) return null;
  const normalized = team.toLowerCase();
  for (const entry of LEAGUE_LOOKUP) {
    if (entry.keywords.some((keyword) => normalized.includes(keyword))) {
      return { league: entry.league, sport: entry.sport };
    }
  }
  return null;
}

function isVerifiedField(intel, key) {
  return VERIFIED_STATES.has(intel?.isTextVerified?.[key]);
}

function normalizePosition(value = "") {
  const candidate = value?.trim().toUpperCase();
  if (!candidate) return "";
  return POSITION_MAP[candidate] || candidate;
}

function collectOcrLines(intel = {}) {
  const lines = [];
  const pushLines = (source) => {
    if (!Array.isArray(source)) return;
    source.forEach((entry) => {
      if (!entry) return;
      if (typeof entry === "string") {
        lines.push({ text: entry, confidence: 0 });
      } else if (typeof entry?.text === "string") {
        lines.push({ text: entry.text, confidence: Number(entry?.confidence) || 0 });
      }
    });
  };
  if (Array.isArray(intel?.ocrFull?.lines) && intel.ocrFull.lines.length) {
    pushLines(intel.ocrFull.lines);
  } else {
    pushLines(intel?.ocr?.lines);
    pushLines(intel?.ocrBack?.lines);
    pushLines(intel?.ocrZones?.topBanner?.lines);
    pushLines(intel?.ocrZones?.bottomCenter?.lines);
    pushLines(intel?.ocrZones?.bottomLeft?.lines);
  }
  return lines
    .map((line) => ({ ...line, text: line.text.trim() }))
    .filter((line) => line.text);
}

function normalizeOcrLineInput(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((entry) => entry && (typeof entry === "string" || typeof entry.text === "string"))
    .map((entry) => ({
      text: (typeof entry === "string" ? entry : entry.text).trim(),
      confidence: Number(entry?.confidence) || 0,
    }))
    .filter((entry) => entry.text);
}

function titleCase(value = "") {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

function normalizeLine(line = "") {
  return line.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function pickTeamFromOcr(lines) {
  const allTeams = [...MLB_TEAMS, ...NFL_TEAMS, ...NBA_TEAMS, ...NHL_TEAMS];
  let best = null;
  for (const line of lines) {
    const raw = line.text.replace(/\s+/g, " ").trim();
    if (!raw) continue;
    if (/\d/.test(raw)) continue;
    if (!/^[A-Z][A-Z\s.'&-]+$/.test(raw)) continue;
    const words = raw.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const normalized = normalizeLine(raw);
    if (!allTeams.some((team) => normalized.includes(team))) continue;
    const candidate = {
      text: raw,
      confidence: line.confidence,
      length: raw.length,
      wordCount,
    };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.wordCount > best.wordCount) {
      best = candidate;
      continue;
    }
    if (candidate.wordCount === best.wordCount && candidate.confidence > best.confidence) {
      best = candidate;
      continue;
    }
    if (
      candidate.wordCount === best.wordCount &&
      candidate.confidence === best.confidence &&
      candidate.length > best.length
    ) {
      best = candidate;
    }
  }
  return best?.text || "";
}

function pickTeamFromOcrAllCaps(lines) {
  let best = null;
  for (const line of lines) {
    const raw = line.text.replace(/\s+/g, " ").trim();
    if (!raw) continue;
    if (/\d/.test(raw)) continue;
    if (!/^[A-Z][A-Z\s.'&-]+$/.test(raw)) continue;
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    const candidate = { text: raw, wordCount, confidence: line.confidence };
    if (!best) {
      best = candidate;
      continue;
    }
    if (candidate.wordCount > best.wordCount) {
      best = candidate;
      continue;
    }
    if (candidate.wordCount === best.wordCount && candidate.confidence > best.confidence) {
      best = candidate;
    }
  }
  return best?.text || "";
}

function pickBrandFromOcr(lines) {
  const brands = [
    { key: "upper deck", label: "Upper Deck" },
    { key: "topps", label: "Topps" },
    { key: "panini", label: "Panini" },
    { key: "donruss", label: "Donruss" },
    { key: "optic", label: "Optic" },
    { key: "bowman", label: "Bowman" },
    { key: "fleer", label: "Fleer" },
    { key: "score", label: "Score" },
  ];
  let best = null;
  const isAllCapsLine = (text) => /^[A-Z0-9\s.'&-]+$/.test(text);
  const stripYearTokens = (text) =>
    text.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const raw = line.text.replace(/\s+/g, " ").trim();
    if (!raw) continue;
    const normalized = normalizeLine(raw);
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    const isAllCaps = isAllCapsLine(raw);
    if (!isAllCaps) continue;
    const allCapsMultiWord = isAllCaps && wordCount >= 2;

    const nextLine = lines[index + 1];
    let combinedRaw = "";
    let combinedNormalized = "";
    let combinedAllCapsMultiWord = false;
    let combinedWordCount = 0;
    if (nextLine) {
      const nextRaw = nextLine.text.replace(/\s+/g, " ").trim();
      if (nextRaw && isAllCapsLine(nextRaw)) {
        combinedRaw = `${raw} ${nextRaw}`.replace(/\s+/g, " ").trim();
        combinedNormalized = normalizeLine(combinedRaw);
        combinedWordCount = combinedRaw.split(/\s+/).filter(Boolean).length;
        combinedAllCapsMultiWord = combinedWordCount >= 2;
      }
    }

    for (const brand of brands) {
      const matchesSingle =
        normalized && (normalized === brand.key || normalized.includes(brand.key));
      const matchesCombined =
        combinedNormalized &&
        (combinedNormalized === brand.key || combinedNormalized.includes(brand.key));
      if (!matchesSingle && !matchesCombined) continue;
      const useCombined = matchesCombined && combinedAllCapsMultiWord;
      const useRawPhrase = !useCombined && allCapsMultiWord;
      const candidateRaw = useCombined ? combinedRaw : raw;
      const candidatePhrase = stripYearTokens(candidateRaw);
      if (!candidatePhrase) continue;
      const candidateWordCount = useCombined
        ? combinedWordCount
        : candidatePhrase.split(/\s+/).filter(Boolean).length;
      const candidateLabel =
        (useCombined || useRawPhrase) && candidatePhrase
          ? titleCase(candidatePhrase)
          : brand.label;
      const score = candidateWordCount * 10 + (useCombined ? 5 : 0);
      const candidate = {
        label: candidateLabel,
        confidence: line.confidence,
        score,
        wordCount: candidateWordCount,
      };
      if (!best) {
        best = candidate;
        continue;
      }
      if (candidate.score > best.score) {
        best = candidate;
        continue;
      }
      if (candidate.score === best.score && candidate.confidence > best.confidence) {
        best = candidate;
      }
    }
  }
  return best?.label || "";
}

function pickYearFromOcr(lines) {
  let bestYear = null;
  for (const line of lines) {
    const trimmed = line.text.trim();
    const matches = trimmed.match(/\b(19|20)\d{2}\b/g);
    if (!matches) continue;
    matches.forEach((match) => {
      const yearNumber = Number(match);
      if (yearNumber < 1950 || yearNumber > 2026) return;
      if (!bestYear || yearNumber > Number(bestYear)) {
        bestYear = match;
      }
    });
  }
  return bestYear || "";
}

function isAllCapsName(text) {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length < 2) return false;
  if (words.length > 4) return false;
  return words.every((word) => /^[A-Z][A-Z'.-]*$/.test(word));
}

function normalizeAllCapsName(text) {
  const suffixes = new Set(["JR", "SR", "II", "III", "IV", "V"]);
  const words = text.split(/\s+/).filter(Boolean);
  return words
    .map((word) => {
      const cleaned = word.replace(/\./g, "");
      if (suffixes.has(cleaned)) {
        if (cleaned === "JR") return "Jr.";
        if (cleaned === "SR") return "Sr.";
        return cleaned;
      }
      return titleCase(cleaned);
    })
    .join(" ");
}

function pickPlayerFromOcr(lines, teamLine, brandLine) {
  let best = null;
  const normalizedTeam = normalizeLine(teamLine);
  const normalizedBrand = normalizeLine(brandLine);
  const counts = new Map();
  const candidates = [];
  for (const line of lines) {
    const raw = line.text.replace(/\s+/g, " ").trim();
    if (!raw) continue;
    if (/\d/.test(raw)) continue;
    const allCapsName = isAllCapsName(raw);
    if (!allCapsName) continue;
    const normalized = normalizeLine(raw);
    if (normalizedTeam && normalized === normalizedTeam) continue;
    if (normalizedBrand && normalized.includes(normalizedBrand)) continue;
    const displayValue = allCapsName ? normalizeAllCapsName(raw) : raw;
    const key = normalizeLine(displayValue);
    counts.set(key, (counts.get(key) || 0) + 1);
    candidates.push({
      key,
      text: displayValue,
      confidence: line.confidence,
      length: raw.length,
    });
  }
  for (const candidate of candidates) {
    const duplicateCount = counts.get(candidate.key) || 0;
    if (!best) {
      best = { ...candidate, duplicateCount };
      continue;
    }
    if (duplicateCount > best.duplicateCount) {
      best = { ...candidate, duplicateCount };
      continue;
    }
    if (duplicateCount === best.duplicateCount && candidate.length > best.length) {
      best = { ...candidate, duplicateCount };
      continue;
    }
    if (
      duplicateCount === best.duplicateCount &&
      candidate.length === best.length &&
      candidate.confidence > best.confidence
    ) {
      best = { ...candidate, duplicateCount };
    }
  }
  return best?.text || "";
}

export function resolveCardFacts(intel = {}) {
  const promotions = {};
  if (!intel) return promotions;
  const isLineArrayInput = Array.isArray(intel);
  const ocrLines = isLineArrayInput ? normalizeOcrLineInput(intel) : collectOcrLines(intel);
  if (!ocrLines.length) return promotions;
  const lineTexts = ocrLines
    .map((line) => (line?.text ? line.text : ""))
    .map((line) => line.trim())
    .filter(Boolean);
  const player = lineTexts.find((line) => {
    if (line.length <= 3) return false;
    if (/^\d+$/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    if (line === line.toUpperCase()) return false;
    return /[A-Za-z]/.test(line);
  });
  if (player) promotions.player = player;

  const year = lineTexts
    .map((line) => line.match(/\b(19|20)\d{2}\b/))
    .filter(Boolean)
    .map((match) => match[0])
    .find((value) => {
      const yearNumber = Number(value);
      return yearNumber >= 1900 && yearNumber <= 2099;
    });
  if (year) promotions.year = year;

  const teamKeywords = [...MLB_TEAMS, ...NFL_TEAMS, ...NBA_TEAMS, ...NHL_TEAMS];
  const setName = lineTexts.find((line) => {
    if (!/^[A-Z0-9\s.'&-]+$/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2) return false;
    const normalized = normalizeLine(line);
    if (!normalized) return false;
    if (teamKeywords.some((team) => normalized.includes(team))) return false;
    return true;
  });
  if (setName) promotions.setName = titleCase(setName);
  promotions.graded = false;
  return promotions;
}
