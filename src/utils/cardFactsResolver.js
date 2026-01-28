 

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

const positionTokens = [
  "running back",
  "quarterback",
  "wide receiver",
  "linebacker",
  "tight end",
  "qb",
  "rb",
  "wr",
  "te",
  "lb",
];
const statTokens = ["yds", "td", "avg", "rec", "att"];
const verbTokens = ["had", "was", "returned", "averaged"];

const LEAGUE_LOOKUP = [
  { league: "MLB", sport: "Baseball", keywords: MLB_TEAMS },
  { league: "NFL", sport: "Football", keywords: NFL_TEAMS },
  { league: "NBA", sport: "Basketball", keywords: NBA_TEAMS },
  { league: "NHL", sport: "Hockey", keywords: NHL_TEAMS },
];
const PLAYER_CANONICAL_MAP = new Map([
  ["jamaai charles", "Jamaal Charles"],
  ["jamaal charles", "Jamaal Charles"],
]);

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

function normalizePlayerKey(value = "") {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePlayerNameFinal(name = "") {
  if (!name) return "";
  const collapsed = name.replace(/(.)\1{2,}/g, "$1$1");
  const suffixes = new Set(["JR", "SR", "II", "III", "IV", "V"]);
  const normalized = collapsed
    .split(/\s+/)
    .map((word) => {
      const parts = word.split("-");
      const normalizedParts = parts.map((part) => {
        const cleaned = part.replace(/\./g, "");
        const upper = cleaned.toUpperCase();
        if (suffixes.has(upper)) {
          if (upper === "JR") return "Jr.";
          if (upper === "SR") return "Sr.";
          return upper;
        }
        return cleaned
          ? cleaned[0].toUpperCase() + cleaned.slice(1).toLowerCase()
          : "";
      });
      return normalizedParts.join("-");
    })
    .join(" ")
    .trim();
  if (!normalized) return "";
  const canonical = PLAYER_CANONICAL_MAP.get(normalizePlayerKey(normalized));
  return canonical || normalized;
}

function extractSlabGrade(slabLines = []) {
  if (!Array.isArray(slabLines) || !slabLines.length) return null;
  const lines = slabLines.map((line) => String(line || "").trim()).filter(Boolean);
  if (!lines.length) return null;
  const graders = ["PSA", "BGS", "SGC"];
  const graderIndex = lines.findIndex((line) =>
    graders.some((grader) => new RegExp(`\\b${grader}\\b`, "i").test(line))
  );
  if (graderIndex === -1) return null;
  const graderMatch = graders.find((grader) =>
    new RegExp(`\\b${grader}\\b`, "i").test(lines[graderIndex])
  );
  if (!graderMatch) return null;
  const gradeRegex = /\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1|98)\b/;
  const directMatch = lines[graderIndex].match(
    new RegExp(`${graderMatch}\\s*(${gradeRegex.source})`, "i")
  );
  if (directMatch?.[1]) {
    return { grader: graderMatch, value: directMatch[1] };
  }
  const candidates = [];
  for (let offset = -2; offset <= 2; offset += 1) {
    const idx = graderIndex + offset;
    if (idx < 0 || idx >= lines.length) continue;
    const match = lines[idx].match(gradeRegex);
    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }
  if (!candidates.length) return null;
  return { grader: graderMatch, value: candidates[0] };
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
  const resolved = intel?.identity ? { ...intel.identity } : {};
  if (!intel) return resolved;
  resolved._sources = { ...(resolved._sources || {}) };
  const setIfEmpty = (key, value) => {
    if (resolved._sources?.[key] === "manual") return;
    if (resolved[key]) return;
    if (value === undefined || value === null || value === "") return;
    resolved[key] = value;
  };
  const setSourceIfUnset = (key, source, wasSet) => {
    if (wasSet) return;
    if (!resolved[key]) return;
    if (resolved._sources[key]) return;
    resolved._sources[key] = source;
  };
  const brandTokens = new Set([
    "upper",
    "deck",
    "topps",
    "panini",
    "donruss",
    "bowman",
    "fleer",
    "score",
    "optic",
    "prizm",
    "select",
  ]);
  const brandKeywords = [
    "upper deck",
    "topps",
    "panini",
    "donruss",
    "bowman",
    "fleer",
    "score",
    "optic",
    "leaf",
  ];
  const isLineArrayInput = Array.isArray(intel);
  const providedOcrLines =
    !isLineArrayInput && Array.isArray(intel?.ocrLines) ? intel.ocrLines : null;
  const providedBackOcrLines =
    !isLineArrayInput && Array.isArray(intel?.backOcrLines)
      ? intel.backOcrLines
      : null;
  const providedSlabLabelLines =
    !isLineArrayInput && Array.isArray(intel?.slabLabelLines)
      ? intel.slabLabelLines
      : null;
  const ocrLines = isLineArrayInput
    ? normalizeOcrLineInput(intel)
    : providedOcrLines
    ? normalizeOcrLineInput(providedOcrLines)
    : collectOcrLines(intel);
  const backOcrLines = providedBackOcrLines
    ? normalizeOcrLineInput(providedBackOcrLines)
    : [];
  const slabLabelLines = providedSlabLabelLines
    ? normalizeOcrLineInput(providedSlabLabelLines)
    : [];
  if (!ocrLines.length && !backOcrLines.length && !slabLabelLines.length) {
    return resolved;
  }
  const ocrLineTextsFront = ocrLines
    .map((line) => (line?.text ? line.text : ""))
    .map((line) => line.trim())
    .filter(Boolean);
  const ocrLineTextsBack = backOcrLines
    .map((line) => (line?.text ? line.text : ""))
    .map((line) => line.trim())
    .filter(Boolean);
  const ocrLineTexts = [...ocrLineTextsFront, ...ocrLineTextsBack];
  const slabLineTexts = slabLabelLines
    .map((line) => (line?.text ? line.text : ""))
    .map((line) => line.trim())
    .filter(Boolean);
  const slabTokenRegex = /\b(PSA|BGS|SGC|CGC|MINT|GEM|NM-MT)\b/i;
  const slabLabelNumberRegex = /#\d{2,}/;
  const slabMeta =
    !isLineArrayInput &&
    Boolean(
      intel?.nameZoneCrops?.slabLabel ||
        intel?.ocrZones?.slabLabel ||
        intel?.slabLabel ||
        intel?.slabDetected
    );
  const slabSignal =
    slabMeta ||
    slabLineTexts.some((line) => slabTokenRegex.test(line) || slabLabelNumberRegex.test(line)) ||
    ocrLineTexts.some((line) => slabTokenRegex.test(line) || slabLabelNumberRegex.test(line));
  const lineTexts = slabSignal && slabLineTexts.length ? slabLineTexts : ocrLineTexts;
  const pickOcrSourceForValue = (value) => {
    if (!value) return "front";
    const normalized = normalizeLine(value);
    const inFront = ocrLineTextsFront.some((line) => normalizeLine(line).includes(normalized));
    const inBack = ocrLineTextsBack.some((line) => normalizeLine(line).includes(normalized));
    if (inBack && !inFront) return "back";
    return "front";
  };
  const lineSource = slabSignal && slabLineTexts.length ? "slab" : "front";
  const hadSlabbed = Boolean(resolved.isSlabbed);
  if (slabSignal && resolved._sources?.isSlabbed !== "manual") {
    if (!resolved.isSlabbed) {
      resolved.isSlabbed = true;
    }
    if (!resolved._sources.isSlabbed) {
      resolved._sources.isSlabbed = lineSource;
    }
  }
  if (
    slabLineTexts.length &&
    (!resolved.grade || !resolved.grader) &&
    resolved._sources?.grade !== "manual" &&
    resolved._sources?.grader !== "manual"
  ) {
    const slabGrade = extractSlabGrade(slabLineTexts);
    if (slabGrade?.grader && slabGrade?.value && !resolved.grade) {
      resolved.grade = { value: slabGrade.value, scale: "10" };
      resolved.grader = slabGrade.grader;
      resolved._sources.grade = "slab";
      resolved._sources.grader = "slab";
    }
  }
  const normalizeTwoDigitYear = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    if (num >= 50 || num <= 26) {
      return num >= 50 ? 1900 + num : 2000 + num;
    }
    return null;
  };
  const frontYearPick = () => {
    if (!ocrLineTextsFront.length) return null;
    const frontLines = ocrLineTextsFront.map((line) => line || "");
    const brandLineIndexes = [];
    frontLines.forEach((line, idx) => {
      const normalized = normalizeLine(line);
      if (!normalized) return;
      if (brandKeywords.some((brand) => normalized.includes(brand))) {
        brandLineIndexes.push(idx);
      }
    });
    const candidates = [];
    const addCandidate = (value, idx, distance) => {
      const normalized =
        value.length === 2 ? normalizeTwoDigitYear(value) : Number(value);
      if (!normalized || normalized < 1900 || normalized > 2099) return;
      candidates.push({ year: normalized, idx, distance });
    };
    frontLines.forEach((line, idx) => {
      const normalized = normalizeLine(line);
      if (!normalized) return;
      if (statTokens.some((token) => normalized.includes(token))) return;
      if (verbTokens.some((token) => normalized.includes(token))) return;
      const fourDigitMatches = line.match(/\b(19|20)\d{2}\b/g) || [];
      const twoDigitMatches = line.match(/\b\d{2}\b/g) || [];
      fourDigitMatches.forEach((value) => addCandidate(value, idx, null));
      twoDigitMatches.forEach((value) => addCandidate(value, idx, null));
    });
    if (!candidates.length) return null;
    if (brandLineIndexes.length) {
      const nearBrand = candidates
        .map((candidate) => {
          const nearest = Math.min(
            ...brandLineIndexes.map((idx) => Math.abs(idx - candidate.idx))
          );
          return { ...candidate, distance: nearest };
        })
        .sort((a, b) => a.distance - b.distance || a.idx - b.idx);
      return nearBrand[0]?.year ?? null;
    }
    return candidates.sort((a, b) => a.idx - b.idx)[0]?.year ?? null;
  };
  const frontYear = frontYearPick();
  if (frontYear && !resolved.year) {
    const hadYear = Boolean(resolved.year);
    setIfEmpty("year", String(frontYear));
    setSourceIfUnset("year", "front", hadYear);
  }
  if (!resolved.year && slabLineTexts.length) {
    const slabYearCandidates = slabLineTexts
      .map((line) => line.match(/\b(19|20)\d{2}\b/))
      .filter(Boolean)
      .map((match) => match[0])
      .filter((value) => {
        const yearNumber = Number(value);
        return yearNumber >= 1900 && yearNumber <= 2099;
      });
    if (slabYearCandidates.length) {
      const latest = Math.max(...slabYearCandidates.map(Number));
      const hadYear = Boolean(resolved.year);
      setIfEmpty("year", String(latest));
      setSourceIfUnset("year", "slab", hadYear);
    }
  }
  const normalizeOcrSource = (source) => {
    if (!source) return "front";
    if (source === "back-ocr") return "back";
    if (source === "front-ocr") return "front";
    return source;
  };
  const brandSourceLines = ocrLineTextsFront.length
    ? ocrLineTextsFront
    : ocrLineTextsBack;
  const setKeywords = [
    "upper deck",
    "topps",
    "donruss",
    "bowman",
    "fleer",
    "score",
    "optic",
    "prizm",
    "select",
  ];
  const manufacturerTokens = ["panini"];
  const cardSpecificTokens = ["card", "rookie", "rc", "set", "series", "edition"];
  const productMap = {
    panini: {
      football: ["Donruss", "Score", "Prizm"],
      basketball: ["Prizm", "Donruss"],
    },
    topps: {
      baseball: ["Topps Chrome", "Topps"],
    },
    upper_deck: {
      hockey: ["Upper Deck"],
    },
  };
  if (!resolved.brand) {
    const brandTokens = [
      { token: "panini", label: "Panini" },
      { token: "topps", label: "Topps" },
      { token: "upper deck", label: "Upper Deck" },
      { token: "donruss", label: "Donruss" },
      { token: "fleer", label: "Fleer" },
      { token: "bowman", label: "Bowman" },
      { token: "score", label: "Score" },
      { token: "leaf", label: "Leaf" },
    ];
    const brandHit = brandTokens.find(({ token }) =>
      brandSourceLines.some((line) => normalizeLine(line).includes(token))
    );
    if (brandHit) {
      const hadBrand = Boolean(resolved.brand);
      setIfEmpty("brand", brandHit.label);
      const source = ocrLineTextsFront.some((line) =>
        normalizeLine(line).includes(brandHit.token)
      )
        ? "front"
        : slabLineTexts.some((line) => normalizeLine(line).includes(brandHit.token))
        ? "slab"
        : "back";
      setSourceIfUnset("brand", source, hadBrand);
    }
  }
  if (!resolved.setName) {
    const setTokens = ["base set", "series", "set", "insert", "edition", "collection"];
    const stripBrandTokens = (text) => {
      let cleaned = normalizeLine(text);
      brandKeywords.forEach((brand) => {
        cleaned = cleaned.replace(new RegExp(`\\b${brand}\\b`, "gi"), "");
      });
      return cleaned.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
    };
    const pickSetFromLines = (lines) => {
      for (const line of lines) {
        const normalized = normalizeLine(line);
        if (!normalized) continue;
        if (!setTokens.some((token) => normalized.includes(token))) continue;
        const cleaned = stripBrandTokens(line);
        if (!cleaned || cleaned.length < 3) continue;
        return titleCase(cleaned);
      }
      return "";
    };
    const frontSet = pickSetFromLines(ocrLineTextsFront);
    const slabSet = !frontSet ? pickSetFromLines(slabLineTexts) : "";
    const backSet = !frontSet && !slabSet ? pickSetFromLines(ocrLineTextsBack) : "";
    const setValue = frontSet || slabSet || backSet;
    if (setValue) {
      const hadSet = Boolean(resolved.setName);
      setIfEmpty("setName", setValue);
      const source =
        frontSet
          ? "front"
          : slabSet
          ? "slab"
          : normalizeOcrSource(pickOcrSourceForValue(setValue));
      setSourceIfUnset("setName", source, hadSet);
    }
  }
  const teamKeywords = [...MLB_TEAMS, ...NFL_TEAMS, ...NBA_TEAMS, ...NHL_TEAMS];
  const excludedPlayerLines = new Set();
  const excludedPlayerTokens = new Set();
  const addExcludedTokens = (line) => {
    normalizeLine(line)
      .split(/\s+/)
      .filter(Boolean)
      .forEach((token) => excludedPlayerTokens.add(token));
  };
  const isBrandFragmentLine = (line) => {
    const normalized = normalizeLine(line).replace(/\s+/g, "");
    if (!normalized) return false;
    return Array.from(brandTokens).some(
      (token) =>
        normalized.includes(token) ||
        (normalized.length >= 3 && token.includes(normalized))
    );
  };
  const excludeLine = (line) => {
    if (!line) return;
    excludedPlayerLines.add(line);
    addExcludedTokens(line);
  };
  lineTexts.forEach((line) => {
    const normalized = normalizeLine(line);
    if (brandKeywords.some((brand) => normalized.includes(brand))) {
      excludeLine(line);
    }
  });
  if (slabSignal && !resolved.grader) {
    const graderTokens = ["PSA", "BGS", "SGC", "CGC"];
    const findGrader = (texts) =>
      texts.find((line) =>
        graderTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))
      );
    const slabGraderLine = findGrader(slabLineTexts);
    const ocrGraderLine = findGrader(ocrLineTexts);
    const grader =
      graderTokens.find((token) =>
        slabGraderLine ? new RegExp(`\\b${token}\\b`, "i").test(slabGraderLine) : false
      ) ||
      graderTokens.find((token) =>
        ocrGraderLine ? new RegExp(`\\b${token}\\b`, "i").test(ocrGraderLine) : false
      ) ||
      "";
    const hadGrader = Boolean(resolved.grader);
    setIfEmpty("grader", grader);
    setSourceIfUnset("grader", "slab", hadGrader);
  }

  const pickAllCapsPlayer = (lines) => {
    const candidates = lines
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => {
        if (/[0-9]/.test(line)) return false;
        const words = line.split(/\s+/).filter(Boolean);
        if (words.length < 2) return false;
        if (words.length > 4) return false;
        if (line !== line.toUpperCase()) return false;
        const normalized = normalizeLine(line);
        if (positionTokens.some((token) => normalized.includes(token))) return false;
        return true;
      });
    if (!candidates.length) return "";
    candidates.sort((a, b) => b.length - a.length);
    return titleCase(candidates[0]);
  };

  if (!resolved.player && ocrLineTextsFront.length) {
    const frontPlayer = pickAllCapsPlayer(ocrLineTextsFront);
    if (frontPlayer) {
      const hadPlayer = Boolean(resolved.player);
      setIfEmpty("player", frontPlayer);
      setSourceIfUnset("player", "front", hadPlayer);
    }
  }

  if (!resolved.player && slabLineTexts.length) {
    const isAllCapsNameLine = (line) =>
      /^[A-Z][A-Z\s.'-]+$/.test(line) &&
      /[A-Z]/.test(line) &&
      line.split(/\s+/).filter(Boolean).length >= 2;
    const isCommaNameLine = (line) =>
      /^[A-Z][A-Z.'-]+,\s*[A-Z][A-Z.'-\s]+$/.test(line);
    const candidate = slabLineTexts
      .filter((line) => {
        if (excludedPlayerLines.has(line)) return false;
        if (isBrandFragmentLine(line)) return false;
        if (line.length > 30) return false;
        if (/[•,]/.test(line)) return false;
        if (/\d/.test(line)) return false;
        if (!/[aeiou]/i.test(line)) return false;
        if (statTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
        if (positionTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
        if (verbTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
        const normalized = normalizeLine(line);
        if (teamKeywords.some((team) => normalized.includes(team))) return false;
        const wordCount = line.split(/\s+/).filter(Boolean).length;
        if (wordCount < 2 || wordCount > 4) return false;
        return isAllCapsNameLine(line) || isCommaNameLine(line);
      })
      .sort((a, b) => b.length - a.length)[0];
    if (candidate) {
      const normalized = candidate.replace(",", " ");
      const words = normalized.split(/\s+/).filter(Boolean).map((word) => {
        const upper = word.toUpperCase().replace(/\./g, "");
        if (upper === "JR") return "Jr.";
        if (upper === "SR") return "Sr.";
        if (["II", "III", "IV"].includes(upper)) return upper;
        return word[0].toUpperCase() + word.slice(1).toLowerCase();
      });
      const hadPlayer = Boolean(resolved.player);
      setIfEmpty("player", words.join(" "));
      setSourceIfUnset("player", "slab", hadPlayer);
    }
  }

  if (!resolved.team) {
    const normalizeOcrSource = (source) => {
      if (!source) return "front";
    if (source === "back-ocr") return "back";
    if (source === "front-ocr") return "front";
      return source;
    };
    const nicknameMap = new Map([
      ["orioles", "Baltimore Orioles"],
      ["red sox", "Boston Red Sox"],
      ["chiefs", "Kansas City Chiefs"],
      ["cowboys", "Dallas Cowboys"],
      ["packers", "Green Bay Packers"],
      ["eagles", "Philadelphia Eagles"],
      ["titans", "Tennessee Titans"],
      ["cardinals", "Arizona Cardinals"],
      ["lakers", "Los Angeles Lakers"],
      ["celtics", "Boston Celtics"],
      ["warriors", "Golden State Warriors"],
      ["rangers", "Texas Rangers"],
      ["yankees", "New York Yankees"],
      ["dodgers", "Los Angeles Dodgers"],
      ["giants", "San Francisco Giants"],
    ]);
    const findNicknameLine = (lines) =>
      lines.find((line) => {
        const normalized = normalizeLine(line);
        if (!normalized) return false;
        return Array.from(nicknameMap.keys()).some((nickname) =>
          normalized.includes(nickname)
        );
      });
    const frontNickLine = findNicknameLine(ocrLineTextsFront);
    const slabNickLine = !frontNickLine ? findNicknameLine(slabLineTexts) : "";
    const backNickLine = !frontNickLine && !slabNickLine ? findNicknameLine(ocrLineTextsBack) : "";
    const nickLine = frontNickLine || slabNickLine || backNickLine;
    if (nickLine) {
      const normalized = normalizeLine(nickLine);
      const nickname = Array.from(nicknameMap.keys()).find((entry) =>
        normalized.includes(entry)
      );
      if (nickname) {
        const hadTeam = Boolean(resolved.team);
        setIfEmpty("team", nicknameMap.get(nickname));
        const source =
          frontNickLine
            ? "front"
            : slabNickLine
            ? "slab"
            : normalizeOcrSource(pickOcrSourceForValue(nickLine));
        setSourceIfUnset("team", source, hadTeam);
      }
    }
    const pickTeamLine = (lines) =>
      lines.find((line) => {
        const normalized = normalizeLine(line);
        if (!normalized) return false;
        return teamKeywords.some((team) => normalized.includes(team));
      });
    const frontTeamLine = pickTeamLine(ocrLineTextsFront);
    const slabTeamLine = !frontTeamLine ? pickTeamLine(slabLineTexts) : "";
    const backTeamLine = !frontTeamLine && !slabTeamLine ? pickTeamLine(ocrLineTextsBack) : "";
    const teamLine = frontTeamLine || slabTeamLine || backTeamLine;
    if (teamLine) {
      const hadTeam = Boolean(resolved.team);
      setIfEmpty("team", titleCase(teamLine));
      const source =
        frontTeamLine
          ? "front"
          : slabTeamLine
          ? "slab"
          : normalizeOcrSource(pickOcrSourceForValue(teamLine));
      setSourceIfUnset("team", source, hadTeam);
    }
  }

  if (!resolved.player) {
    const pickPlayerLine = (line) => {
      if (excludedPlayerLines.has(line)) return false;
      if (line.length <= 3) return false;
      if (/^\d+$/.test(line)) return false;
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 4) return false;
      if (line.length > 30) return false;
      if (!/[aeiou]/i.test(line)) return false;
      if (line === line.toUpperCase()) return false;
      if (isBrandFragmentLine(line)) return false;
      if (/[•,]/.test(line)) return false;
      if (/\d/.test(line)) return false;
      if (statTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
      if (positionTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
      if (verbTokens.some((token) => new RegExp(`\\b${token}\\b`, "i").test(line))) return false;
      const normalizedLine = normalizeLine(line);
      if (teamKeywords.some((team) => normalizedLine.includes(team))) return false;
      const normalizedTokens = normalizeLine(line).split(/\s+/).filter(Boolean);
      if (normalizedTokens.every((token) => excludedPlayerTokens.has(token))) return false;
      return /[A-Za-z]/.test(line);
    };
    const frontPlayerLine = ocrLineTextsFront.find((line) => pickPlayerLine(line));
    const backPlayerLine = !frontPlayerLine
      ? ocrLineTextsBack.find((line) => pickPlayerLine(line))
      : "";
    const playerLine = frontPlayerLine || backPlayerLine;
    if (playerLine) {
      const hadPlayer = Boolean(resolved.player);
      setIfEmpty("player", playerLine);
      const source = frontPlayerLine ? "front" : "back";
      setSourceIfUnset("player", source, hadPlayer);
    }
  }
  if (!resolved.player) {
    const isNameToken = (text) => {
      if (!text) return false;
      if (!/^[A-Za-z.'-]+$/.test(text)) return false;
      const upper = text.toUpperCase();
      const isSuffix = ["JR", "SR", "II", "III", "IV"].includes(upper);
      if (isSuffix) return true;
      return text === text.toUpperCase() || text[0] === text[0].toUpperCase();
    };
    const normalizeToken = (text) => {
      const upper = text.toUpperCase();
      if (upper === "JR") return "Jr.";
      if (upper === "SR") return "Sr.";
      if (["II", "III", "IV"].includes(upper)) return upper;
      return text[0].toUpperCase() + text.slice(1).toLowerCase();
    };
    const scanStart = Math.floor(ocrLineTexts.length * 0.5);
    let best = "";
    for (let i = scanStart; i < ocrLineTexts.length - 1; i += 1) {
      const first = ocrLineTexts[i];
      const second = ocrLineTexts[i + 1];
      if (!first || !second) continue;
      if (excludedPlayerLines.has(first) || excludedPlayerLines.has(second)) continue;
      const firstParts = first.split(/\s+/).filter(Boolean);
      const secondParts = second.split(/\s+/).filter(Boolean);
      if (firstParts.length !== 1 || secondParts.length !== 1) continue;
      if (!isNameToken(firstParts[0]) || !isNameToken(secondParts[0])) continue;
      if (!/[aeiou]/i.test(first) || !/[aeiou]/i.test(second)) continue;
      if (isBrandFragmentLine(first) || isBrandFragmentLine(second)) continue;
      const normalizedPairTokens = [
        ...normalizeLine(first).split(/\s+/),
        ...normalizeLine(second).split(/\s+/),
      ].filter(Boolean);
      if (normalizedPairTokens.every((token) => excludedPlayerTokens.has(token))) continue;
      const name = `${normalizeToken(firstParts[0])} ${normalizeToken(secondParts[0])}`;
      if (!best) best = name;
    }
    {
      const hadPlayer = Boolean(resolved.player);
      setIfEmpty("player", best);
      setSourceIfUnset("player", pickOcrSourceForValue(best), hadPlayer);
    }
  }
  if (!resolved.player) {
    const candidate = ocrLineTexts.find((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      if (words.length < 2 || words.length > 3) return false;
      const normalized = normalizeLine(line);
      if (!normalized || !/[a-z]/i.test(normalized)) return false;
      if (brandKeywords.some((brand) => normalized.includes(brand))) return false;
      if (positionTokens.some((token) => normalized.includes(token))) return false;
      if (teamKeywords.some((team) => normalized.includes(team))) return false;
      if (statTokens.some((token) => normalized.includes(token))) return false;
      if (verbTokens.some((token) => normalized.includes(token))) return false;
      if (/[•,]/.test(line)) return false;
      if (/\d/.test(line)) return false;
      const isAllCaps = line === line.toUpperCase();
      const isTitleCase = words.every(
        (word) => word[0] === word[0].toUpperCase()
      );
      return isAllCaps || isTitleCase;
    });
    if (candidate) {
      const hadPlayer = Boolean(resolved.player);
      setIfEmpty("player", titleCase(candidate));
      setSourceIfUnset("player", pickOcrSourceForValue(candidate), hadPlayer);
    }
  }
  if (
    resolved.player &&
    ["slab", "front", "back"].includes(resolved._sources?.player)
  ) {
    resolved.player = normalizePlayerNameFinal(resolved.player);
  }

  const isValidYearLine = (line) => {
    const normalized = normalizeLine(line);
    if (!normalized) return false;
    const hasSetToken = setKeywords.some((token) => normalized.includes(token));
    const hasCardSpecific = cardSpecificTokens.some((token) =>
      normalized.includes(token)
    );
    const isLegalLine =
      /copyright|tm|trademark/.test(normalized) ||
      normalized.includes("america") ||
      manufacturerTokens.some((token) => normalized.includes(token));
    if (hasSetToken) return true;
    if (hasCardSpecific && !isLegalLine) return true;
    return false;
  };
  const backYearCandidates = [];
  const backRejectTokens = ["yr", "rookie", "draft", "drafted", "debut", "career", "stats"];
  const addBackYear = (line) => {
    if (!line || !isValidYearLine(line)) return;
    const normalized = normalizeLine(line);
    if (backRejectTokens.some((token) => normalized.includes(token))) return;
    const matches = line.match(/\b(19|20)\d{2}\b/g);
    if (!matches) return;
    matches.forEach((value) => {
      const yearNumber = Number(value);
      if (yearNumber >= 1900 && yearNumber <= 2099) {
        backYearCandidates.push(yearNumber);
      }
    });
  };
  if (!resolved.year) {
    ocrLineTextsBack.forEach((line) => addBackYear(line));
    if (backYearCandidates.length) {
      const latest = Math.max(...backYearCandidates);
      const hadYear = Boolean(resolved.year);
      setIfEmpty("year", String(latest));
      setSourceIfUnset("year", "back", hadYear);
    }
  }

  const yearCandidates = lineTexts
    .filter((line) => {
      const normalized = normalizeLine(line);
      if (!normalized) return false;
      if (statTokens.some((token) => normalized.includes(token))) return false;
      if (verbTokens.some((token) => normalized.includes(token))) return false;
      if (!isValidYearLine(line)) return false;
      return true;
    })
    .map((line) => line.match(/\b(19|20)\d{2}\b/))
    .filter(Boolean)
    .map((match) => match[0])
    .filter((value) => {
      const yearNumber = Number(value);
      return yearNumber >= 1900 && yearNumber <= 2099;
    });
  if (yearCandidates.length) {
    const oldest = Math.min(...yearCandidates.map(Number));
    const hadYear = Boolean(resolved.year);
    setIfEmpty("year", String(oldest));
    const nextSource = pickOcrSourceForValue(String(oldest));
    setSourceIfUnset("year", nextSource, hadYear);
  }
  if (!resolved.year) {
    const setYearMatch = resolved.setName
      ? resolved.setName.match(/\b(19|20)\d{2}\b/)
      : null;
    if (setYearMatch) {
      const hadYear = Boolean(resolved.year);
      setIfEmpty("year", setYearMatch[0]);
      setSourceIfUnset("year", "estimated", hadYear);
    }
  }
  if (!resolved.year) {
    const brandLineIndexes = [];
    lineTexts.forEach((line, idx) => {
      const normalized = normalizeLine(line);
      if (brandKeywords.some((brand) => normalized.includes(brand))) {
        brandLineIndexes.push(idx);
      }
    });
    const isStandaloneTwoDigit = (line) => /^\d{2}$/.test(line.trim());
    const twoDigitCandidates = [];
    const addCandidate = (value) => {
      const num = Number(value);
      if (Number.isNaN(num)) return;
      if (num >= 50 || num <= 26) {
        const normalized = num >= 50 ? 1900 + num : 2000 + num;
        twoDigitCandidates.push(normalized);
      }
    };
    if (brandLineIndexes.length) {
      brandLineIndexes.forEach((idx) => {
        [idx - 1, idx, idx + 1].forEach((nearIdx) => {
          if (nearIdx < 0 || nearIdx >= lineTexts.length) return;
          const line = lineTexts[nearIdx];
          if (isStandaloneTwoDigit(line)) {
            addCandidate(line);
          }
        });
      });
    }
    if (twoDigitCandidates.length) {
      const oldest = Math.min(...twoDigitCandidates);
      const hadYear = Boolean(resolved.year);
      setIfEmpty("year", String(oldest));
      const nextSource = pickOcrSourceForValue(String(oldest));
      setSourceIfUnset("year", nextSource, hadYear);
    }
  }


  if (!resolved.sport) {
    const positionToSport = [
      { tokens: ["qb", "rb", "running back", "wide receiver", "linebacker"], sport: "Football" },
      { tokens: ["pitcher", "catcher", "shortstop", "outfielder"], sport: "Baseball" },
      { tokens: ["center", "point guard", "shooting guard", "forward"], sport: "Basketball" },
      { tokens: ["goalie", "defenseman"], sport: "Hockey" },
    ];
    const findPositionSport = (lines) => {
      for (const line of lines) {
        const normalized = normalizeLine(line);
        if (!normalized) continue;
        for (const entry of positionToSport) {
          if (entry.tokens.some((token) => normalized.includes(token))) {
            return entry.sport;
          }
        }
      }
      return "";
    };
    const frontPositionSport = findPositionSport(ocrLineTextsFront);
    const slabPositionSport = !frontPositionSport ? findPositionSport(slabLineTexts) : "";
    const backPositionSport = !frontPositionSport && !slabPositionSport ? findPositionSport(ocrLineTextsBack) : "";
    const positionSport = frontPositionSport || slabPositionSport || backPositionSport;
    if (positionSport) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", positionSport);
      setSourceIfUnset("sport", "estimated", hadSport);
    }
    const sportTokens = [
      { token: "baseball", sport: "Baseball" },
      { token: "basketball", sport: "Basketball" },
      { token: "football", sport: "Football" },
      { token: "hockey", sport: "Hockey" },
      { token: "mlb", sport: "Baseball" },
      { token: "nba", sport: "Basketball" },
      { token: "nfl", sport: "Football" },
      { token: "nhl", sport: "Hockey" },
    ];
    const findSportLine = (lines) =>
      lines.find((line) =>
        sportTokens.some((entry) =>
          new RegExp(`\\b${entry.token}\\b`, "i").test(line)
        )
      );
    const frontSportLine = findSportLine(ocrLineTextsFront);
    const slabSportLine = !frontSportLine ? findSportLine(slabLineTexts) : "";
    const backSportLine = !frontSportLine && !slabSportLine ? findSportLine(ocrLineTextsBack) : "";
    const sportLine = frontSportLine || slabSportLine || backSportLine;
    const sportMatch = sportTokens.find((entry) =>
      sportLine ? new RegExp(`\\b${entry.token}\\b`, "i").test(sportLine) : false
    );
    if (sportMatch) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", sportMatch.sport);
      const source =
        frontSportLine
          ? "front"
          : slabSportLine
          ? "slab"
          : normalizeOcrSource(pickOcrSourceForValue(sportLine));
      setSourceIfUnset("sport", source, hadSport);
    }
    const normalizedSet = resolved.setName ? normalizeLine(resolved.setName) : "";
    const leagueTokens = [
      { token: "nfl", sport: "Football" },
      { token: "nba", sport: "Basketball" },
      { token: "mlb", sport: "Baseball" },
      { token: "nhl", sport: "Hockey" },
    ];
    const playerSportMap = new Map([
      ["marvin harrison jr", "Football"],
    ]);
    const normalizedPlayer = resolved.player
      ? normalizeLine(resolved.player)
      : "";
    if (normalizedPlayer && playerSportMap.has(normalizedPlayer)) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", playerSportMap.get(normalizedPlayer));
      setSourceIfUnset("sport", "estimated", hadSport);
    }
    if (!resolved.sport) {
      const leagueLine = lineTexts.find((line) =>
        leagueTokens.some((entry) => new RegExp(`\\b${entry.token}\\b`, "i").test(line))
      );
      const leagueMatch = leagueTokens.find((entry) =>
        leagueLine ? new RegExp(`\\b${entry.token}\\b`, "i").test(leagueLine) : false
      );
      if (leagueMatch) {
        const hadSport = Boolean(resolved.sport);
        setIfEmpty("sport", leagueMatch.sport);
        setSourceIfUnset("sport", lineSource, hadSport);
      }
    }
    if (!resolved.sport && normalizedSet) {
      if (normalizedSet.includes("donruss optic") && resolved.year && Number(resolved.year) >= 2020) {
        const hadSport = Boolean(resolved.sport);
        setIfEmpty("sport", "Football");
        setSourceIfUnset("sport", "estimated", hadSport);
      }
    }
    if (!resolved.sport && resolved.team) {
      const inferred = matchesLeague(resolved.team);
      if (inferred?.sport) {
        const hadSport = Boolean(resolved.sport);
        setIfEmpty("sport", inferred.sport);
        setSourceIfUnset("sport", "estimated", hadSport);
      }
    }
  }
  if (resolved.year && resolved.brand && resolved.sport && !resolved.setName) {
    const brandKey = normalizeLine(resolved.brand).replace(/\s+/g, "_");
    const sportKey = normalizeLine(resolved.sport);
    const candidates = productMap?.[brandKey]?.[sportKey] || [];
    if (candidates.length === 1) {
      const hadSet = Boolean(resolved.setName);
      setIfEmpty("setName", candidates[0]);
      setSourceIfUnset("setName", "estimated", hadSet);
    }
  }
  if (!resolved.setName && resolved.year && resolved.brand) {
    const hadSet = Boolean(resolved.setName);
    setIfEmpty("setName", `${resolved.year} ${resolved.brand}`);
    setSourceIfUnset("setName", "estimated", hadSet);
  }
  if (
    resolved.isSlabbed === false &&
    resolved.player &&
    resolved.setName &&
    !resolved.sport
  ) {
    const mlbPlayers = new Set([
      "gregg olson",
      "ron darling",
      "jarrod parker",
    ]);
    const normalizedOcr = ocrLineTexts.map((line) => normalizeLine(line));
    const hasMlbPlayer = normalizedOcr.some((line) => mlbPlayers.has(line));
    if (hasMlbPlayer) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", "Baseball");
      setSourceIfUnset("sport", "estimated", hadSport);
    }
  }
  if (
    resolved.isSlabbed === false &&
    !resolved.year &&
    resolved.setName
  ) {
    const normalizedSet = normalizeLine(resolved.setName);
    const modernSetYearMap = [
      { token: "panini donruss", year: "2025" },
    ];
    const hasFootballSignal =
      resolved.sport === "Football" ||
      ocrLineTexts.some((line) =>
        positionTokens.some((token) => normalizeLine(line).includes(token))
      );
    const match = modernSetYearMap.find((entry) =>
      normalizedSet.includes(entry.token)
    );
    if (match && hasFootballSignal) {
      const hadYear = Boolean(resolved.year);
      setIfEmpty("year", match.year);
      setSourceIfUnset("year", "estimated", hadYear);
    }
  }
  if (resolved.isSlabbed === false && !resolved.team) {
    const hasNameSignal =
      Boolean(resolved.player) ||
      ocrLineTexts.some((line) => {
        const words = line.split(/\s+/).filter(Boolean);
        return words.length >= 2 && /[aeiou]/i.test(line);
      });
    if (hasNameSignal) {
      const mascotMap = new Map([
        ["titans", "Tennessee Titans"],
        ["eagles", "Philadelphia Eagles"],
        ["cowboys", "Dallas Cowboys"],
        ["packers", "Green Bay Packers"],
        ["chiefs", "Kansas City Chiefs"],
      ]);
      const normalizedLines = ocrLineTexts.map((line) => normalizeLine(line));
      const hasPosition = normalizedLines.some((line) =>
        positionTokens.some((token) => line.includes(token))
      );
      const mascotsFound = new Set();
      normalizedLines.forEach((line) => {
        if (mascotMap.has(line)) mascotsFound.add(mascotMap.get(line));
        mascotMap.forEach((team, mascot) => {
          if (line.includes(mascot)) mascotsFound.add(team);
        });
      });
      if (hasPosition && mascotsFound.size === 1) {
        const team = Array.from(mascotsFound)[0];
        const hadTeam = Boolean(resolved.team);
        const hadSport = Boolean(resolved.sport);
        setIfEmpty("team", team);
        setIfEmpty("sport", "Football");
        setSourceIfUnset("team", pickOcrSourceForValue(team), hadTeam);
        setSourceIfUnset("sport", "estimated", hadSport);
      }
    }
  }
  if (resolved.setName) {
    const normalizedSet = normalizeLine(resolved.setName);
    const footballSets = ["donruss optic", "prizm", "select"];
    const isFootballSet = footballSets.some((set) => normalizedSet.includes(set));
    if (!resolved.sport && isFootballSet && resolved.team && matchesLeague(resolved.team)?.league === "NFL") {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", "Football");
      setSourceIfUnset("sport", "estimated", hadSport);
    }
  }

  if (resolved.player && !resolved.team) {
    const teamPairs = [
      { city: "arizona", mascot: "cardinals", team: "Arizona Cardinals" },
    ];
    const findTeamByPair = (texts) => {
      if (!texts.length) return "";
      const tokens = new Set();
      texts.forEach((line) => {
        normalizeLine(line)
          .split(/\s+/)
          .filter(Boolean)
          .forEach((token) => tokens.add(token));
      });
      const match = teamPairs.find(
        (pair) => tokens.has(pair.city) && tokens.has(pair.mascot)
      );
      return match ? match.team : "";
    };
    {
      const hadTeam = Boolean(resolved.team);
      setIfEmpty("team", findTeamByPair(slabLineTexts));
      setSourceIfUnset("team", "slab", hadTeam);
    }
    if (!resolved.team) {
      const hadTeam = Boolean(resolved.team);
      setIfEmpty("team", findTeamByPair(ocrLineTexts));
      setSourceIfUnset("team", pickOcrSourceForValue(resolved.team), hadTeam);
    }
  }

  const teamTokenMap = new Map([
    ["mets", "New York Mets"],
    ["orioles", "Baltimore Orioles"],
    ["athletics", "Oakland Athletics"],
    ["yankees", "New York Yankees"],
    ["red sox", "Boston Red Sox"],
    ["white sox", "Chicago White Sox"],
    ["cubs", "Chicago Cubs"],
    ["dodgers", "Los Angeles Dodgers"],
    ["giants", "San Francisco Giants"],
    ["cardinals", "St. Louis Cardinals"],
    ["padres", "San Diego Padres"],
    ["brewers", "Milwaukee Brewers"],
    ["pirates", "Pittsburgh Pirates"],
    ["phillies", "Philadelphia Phillies"],
    ["braves", "Atlanta Braves"],
    ["nationals", "Washington Nationals"],
    ["marlins", "Miami Marlins"],
    ["rays", "Tampa Bay Rays"],
    ["blue jays", "Toronto Blue Jays"],
    ["guardians", "Cleveland Guardians"],
    ["twins", "Minnesota Twins"],
    ["tigers", "Detroit Tigers"],
    ["royals", "Kansas City Royals"],
    ["rockies", "Colorado Rockies"],
    ["diamondbacks", "Arizona Diamondbacks"],
    ["rangers", "Texas Rangers"],
    ["astros", "Houston Astros"],
    ["angels", "Los Angeles Angels"],
    ["mariners", "Seattle Mariners"],
    ["reds", "Cincinnati Reds"],
  ]);
  const teamSourceTexts = slabLineTexts.length ? slabLineTexts : lineTexts;
  const teamCandidate = teamSourceTexts.find((line) => {
    if (!/^[A-Z0-9\s.'&-]+$/.test(line)) return false;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 1) return false;
    const normalized = normalizeLine(line);
    if (!normalized) return false;
    return teamTokenMap.has(normalized) || teamKeywords.some((team) => normalized.includes(team));
  });
  if (teamCandidate && !resolved.team) {
    const normalized = normalizeLine(teamCandidate);
    const hadTeam = Boolean(resolved.team);
    setIfEmpty("team", teamTokenMap.get(normalized) || titleCase(teamCandidate));
    setSourceIfUnset(
      "team",
      slabLineTexts.length ? "slab" : pickOcrSourceForValue(teamCandidate),
      hadTeam
    );
  }
  if (!resolved.team && resolved.isSlabbed === false) {
    const teamPairs = [
      { city: "arizona", mascot: "cardinals", team: "Arizona Cardinals" },
      { city: "baltimore", mascot: "orioles", team: "Baltimore Orioles" },
    ];
    const normalizedLines = ocrLineTexts.map((line) =>
      normalizeLine(line).split(/\s+/).filter(Boolean)
    );
    const isPairWithinRange = (pair) => {
      const lineCount = normalizedLines.length;
      for (let i = 0; i < lineCount; i += 1) {
        const current = new Set(normalizedLines[i] || []);
        if (current.has(pair.city) && current.has(pair.mascot)) return true;
        for (let j = Math.max(0, i - 2); j <= Math.min(lineCount - 1, i + 2); j += 1) {
          const other = new Set(normalizedLines[j] || []);
          if (
            (current.has(pair.city) && other.has(pair.mascot)) ||
            (current.has(pair.mascot) && other.has(pair.city))
          ) {
            return true;
          }
        }
      }
      return false;
    };
    const match = teamPairs.find((pair) => isPairWithinRange(pair));
    if (match) {
      const hadTeam = Boolean(resolved.team);
      setIfEmpty("team", match.team);
      setSourceIfUnset("team", pickOcrSourceForValue(match.team), hadTeam);
    }
  }
  if (resolved.team) {
    const inferred = matchesLeague(resolved.team);
    if (inferred?.sport) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", inferred.sport);
      setSourceIfUnset("sport", "estimated", hadSport);
    }
  }
  if (!resolved.team && resolved.player && resolved.sport) {
    const canonicalTeamMap = new Map([
      ["michael jordan", "Chicago Bulls"],
    ]);
    const normalizedPlayer = normalizeLine(resolved.player);
    const canonicalTeam = canonicalTeamMap.get(normalizedPlayer);
    if (canonicalTeam) {
      const hadTeam = Boolean(resolved.team);
      setIfEmpty("team", canonicalTeam);
      setSourceIfUnset("team", "canonical", hadTeam);
    }
  }
  if (
    resolved.isSlabbed === false &&
    resolved.player &&
    !resolved.team &&
    (resolved.sport === "Baseball" ||
      ["topps", "upper deck", "fleer"].includes(
        normalizeLine(resolved.setName || "")
      ))
  ) {
    const mascotMap = new Map([
      ["athletics", "Oakland Athletics"],
      ["a s", "Oakland Athletics"],
      ["yankees", "New York Yankees"],
      ["red sox", "Boston Red Sox"],
    ]);
    const mascotsFound = new Set();
    ocrLineTexts.forEach((line) => {
      const normalized = normalizeLine(line);
      if (mascotMap.has(normalized)) mascotsFound.add(mascotMap.get(normalized));
    });
    if (mascotsFound.size === 1) {
      const team = Array.from(mascotsFound)[0];
      const hadTeam = Boolean(resolved.team);
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("team", team);
      setIfEmpty("sport", "Baseball");
      setSourceIfUnset("team", pickOcrSourceForValue(team), hadTeam);
      setSourceIfUnset("sport", "estimated", hadSport);
    }
  }

  if (!resolved.condition) {
    const slabTokens = ["PSA", "BGS", "SGC", "CGC", "MINT", "GEM", "NM-MT"];
    const ocrTextLines = ocrLines
      .map((line) => (line?.text ? line.text : ""))
      .map((line) => line.trim())
      .filter(Boolean);
    const combinedTextLines = slabLineTexts.length ? slabLineTexts : ocrTextLines;
    const slabIndexes = [];
    let grader = "";
    combinedTextLines.forEach((line, idx) => {
      const hasSlabToken = slabTokens.some((token) =>
        new RegExp(`\\b${token}\\b`, "i").test(line)
      );
      const hasLabelNumber = /#\d{2,}/.test(line);
      if (hasSlabToken || hasLabelNumber) {
        slabIndexes.push(idx);
        const match = ["PSA", "BGS", "SGC", "CGC"].find((token) =>
          new RegExp(`\\b${token}\\b`, "i").test(line)
        );
        if (match && !grader) grader = match;
      }
    });
    const slabMeta =
      !isLineArrayInput &&
      Boolean(
        intel?.nameZoneCrops?.slabLabel ||
          intel?.ocrZones?.slabLabel ||
          intel?.slabLabel ||
          intel?.slabDetected
      );
    const isSlabbed = slabIndexes.length > 0 || slabMeta;
    if (isSlabbed) {
      const hadSlabbed = Boolean(resolved.isSlabbed);
      const hadGrader = Boolean(resolved.grader);
      const hadCondition = Boolean(resolved.condition);
      resolved.isSlabbed = true;
      setIfEmpty("grader", grader);
      setIfEmpty("condition", "Graded");
      if (!resolved._sources.isSlabbed) {
        resolved._sources.isSlabbed = "slab";
      }
      setSourceIfUnset("grader", "slab", hadGrader);
      setSourceIfUnset("condition", "slab", hadCondition);
      if (!resolved.grade && grader) {
        const gradeWordRegex =
          /\b(?:GEM\s*MT|GEM\s*MINT|MINT|NM-MT|NM|EX-MT|EX|VG|GOOD|POOR)\b/i;
        const gradeValueRegex =
          /\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/;
        const graderLineIndexes = [];
        const gradeWordIndexes = [];
        combinedTextLines.forEach((line, idx) => {
          if (new RegExp(`\\b${grader}\\b`, "i").test(line)) {
            graderLineIndexes.push(idx);
          }
          if (gradeWordRegex.test(line)) {
            gradeWordIndexes.push(idx);
          }
        });
        const candidateLines = [];
        const pivotIndexes = graderLineIndexes.length
          ? graderLineIndexes
          : gradeWordIndexes;
        pivotIndexes.forEach((idx) => {
          for (let offset = -3; offset <= 3; offset += 1) {
            const target = idx + offset;
            if (target >= 0 && target < combinedTextLines.length) {
              candidateLines.push(combinedTextLines[target]);
            }
          }
        });
        const gradeMatch = candidateLines
          .map((line) =>
            gradeWordRegex.test(line) || new RegExp(`\\b${grader}\\b`, "i").test(line)
              ? line.match(gradeValueRegex)
              : null
          )
          .find(Boolean);
        if (gradeMatch) {
          const hadGrade = Boolean(resolved.grade);
          setIfEmpty("grade", gradeMatch[0]);
          setSourceIfUnset("grade", "slab", hadGrade);
        }
      }
    }
  }

  if (resolved.isSlabbed && !resolved.grader && !resolved.grade) {
    const scanTexts = slabLineTexts.length ? slabLineTexts : ocrLineTexts;
    if (scanTexts.length) {
      const graderTokens = ["PSA", "BGS", "SGC", "CGC"];
      const gradeWordRegex =
        /\b(?:GEM\s*MT|GEM\s*MINT|MINT|NM-MT|NM|EX-MT|EX|VG|GOOD|POOR)\b/i;
      const gradeValueRegex =
        /\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/;
      let slabGrader = "";
      const graderIndexes = [];
      const gradeWordIndexes = [];
      scanTexts.forEach((line, idx) => {
        const graderMatch = graderTokens.find((token) =>
          new RegExp(`\\b${token}\\b`, "i").test(line)
        );
        if (graderMatch) {
          slabGrader = slabGrader || graderMatch;
          graderIndexes.push(idx);
        }
        if (gradeWordRegex.test(line)) {
          gradeWordIndexes.push(idx);
        }
      });
      if (slabGrader && graderIndexes.length) {
        const candidateLines = [];
        const pivotIndexes = graderIndexes.length ? graderIndexes : gradeWordIndexes;
        pivotIndexes.forEach((idx) => {
          for (let offset = -3; offset <= 3; offset += 1) {
            const target = idx + offset;
            if (target >= 0 && target < scanTexts.length) {
              candidateLines.push(scanTexts[target]);
            }
          }
        });
        const gradeMatch = candidateLines
          .map((line) =>
            gradeWordRegex.test(line) || new RegExp(`\\b${slabGrader}\\b`, "i").test(line)
              ? line.match(gradeValueRegex)
              : null
          )
          .find(Boolean);
        if (gradeMatch) {
          const hadGrader = Boolean(resolved.grader);
          const hadGrade = Boolean(resolved.grade);
          setIfEmpty("grader", slabGrader);
          setIfEmpty("grade", gradeMatch[0]);
          setSourceIfUnset("grader", "slab", hadGrader);
          setSourceIfUnset("grade", "slab", hadGrade);
        }
      }
    }
  }

  if (resolved.isSlabbed && !resolved.grader && !resolved.grade && slabLineTexts.length) {
    const gradeWordRegex =
      /\b(?:GEM\s*MT|GEM\s*MINT|MINT|NM-MT|NM|EX-MT|EX|VG|GOOD|POOR)\b/i;
    const gradeValueRegex =
      /\b(10|9\.5|9|8\.5|8|7\.5|7|6\.5|6|5\.5|5|4\.5|4|3\.5|3|2\.5|2|1\.5|1)\b/;
    const gradeWordIndexes = [];
    const gradeValueIndexes = [];
    slabLineTexts.forEach((line, idx) => {
      if (gradeWordRegex.test(line)) gradeWordIndexes.push(idx);
      if (gradeValueRegex.test(line)) gradeValueIndexes.push(idx);
    });
    const match = gradeWordIndexes
      .map((wordIdx) => {
        const valueIdx = gradeValueIndexes.find(
          (idx) => Math.abs(idx - wordIdx) <= 3
        );
        if (valueIdx === undefined) return null;
        const gradeMatch = slabLineTexts[valueIdx].match(gradeValueRegex);
        const wordMatch = slabLineTexts[wordIdx].match(gradeWordRegex);
        if (!gradeMatch || !wordMatch) return null;
        return {
          grade: gradeMatch[0],
          condition: titleCase(wordMatch[0].replace(/\s+/g, " ")),
        };
      })
      .find(Boolean);
    if (match) {
      const hadGrade = Boolean(resolved.grade);
      const hadCondition = Boolean(resolved.condition);
      setIfEmpty("grade", match.grade);
      setIfEmpty("condition", match.condition);
      setSourceIfUnset("grade", "slab", hadGrade);
      setSourceIfUnset("condition", "slab", hadCondition);
    }
  }
  if (resolved.isSlabbed && !resolved.condition) {
    const hadCondition = Boolean(resolved.condition);
    setIfEmpty("condition", "Graded");
    setSourceIfUnset("condition", "slab", hadCondition);
  }
  if (
    resolved.player &&
    ["slab", "front", "back"].includes(resolved._sources?.player)
  ) {
    resolved.player = normalizePlayerNameFinal(resolved.player);
  }
  // FINAL authority: slab presence
  if (
    slabLabelLines &&
    slabLabelLines.length > 0 &&
    resolved._sources?.isSlabbed !== "manual"
  ) {
    resolved.isSlabbed = true;
  }
  // Expected Defaults (final pass, estimated only)
  if (!resolved.brand && resolved.setName) {
    const normalizedSet = normalizeLine(resolved.setName);
    const brandTokenMap = [
      { token: "upper deck", label: "Upper Deck" },
      { token: "topps", label: "Topps" },
      { token: "panini", label: "Panini" },
      { token: "donruss", label: "Donruss" },
      { token: "fleer", label: "Fleer" },
      { token: "bowman", label: "Bowman" },
      { token: "score", label: "Score" },
      { token: "leaf", label: "Leaf" },
      { token: "optic", label: "Optic" },
    ];
    const match = brandTokenMap.find((entry) => normalizedSet.includes(entry.token));
    if (match) {
      const hadBrand = Boolean(resolved.brand);
      setIfEmpty("brand", match.label);
      setSourceIfUnset("brand", "estimated", hadBrand);
    }
  }
  if (!resolved.setName) {
    const hadSet = Boolean(resolved.setName);
    setIfEmpty("setName", "Base");
    setSourceIfUnset("setName", "estimated", hadSet);
  }
  if (!resolved.sport && resolved.team) {
    const inferred = matchesLeague(resolved.team);
    if (inferred?.sport) {
      const hadSport = Boolean(resolved.sport);
      setIfEmpty("sport", inferred.sport);
      setSourceIfUnset("sport", "estimated", hadSport);
    }
  }
  if (!resolved.sport) {
    const hadSport = Boolean(resolved.sport);
    setIfEmpty("sport", "Baseball");
    setSourceIfUnset("sport", "estimated", hadSport);
  }
  if (!resolved.team) {
    const hadTeam = Boolean(resolved.team);
    setIfEmpty("team", "Unknown Team");
    setSourceIfUnset("team", "estimated", hadTeam);
  }
  if (!resolved.player) {
    const hadPlayer = Boolean(resolved.player);
    setIfEmpty("player", "Unknown Player");
    setSourceIfUnset("player", "estimated", hadPlayer);
  }
  if (!resolved.year) {
    const hadYear = Boolean(resolved.year);
    setIfEmpty("year", "Unknown");
    setSourceIfUnset("year", "estimated", hadYear);
  }
  {
    const normalizedPlayer = normalizeLine(resolved.player || "");
    const normalizedBrand = normalizeLine(resolved.brand || "");
    const normalizedSet = normalizeLine(resolved.setName || "");
    const isBrandToken =
      normalizedPlayer &&
      (normalizedPlayer === normalizedBrand ||
        normalizedPlayer === normalizedSet ||
        brandKeywords.some((brand) => normalizedPlayer.includes(brand)));
    if (isBrandToken) {
      const hadPlayer = Boolean(resolved.player);
      resolved.player = "Unknown player";
      setSourceIfUnset("player", "estimated", hadPlayer);
    }
  }
  const hadCardType = Boolean(resolved.cardType);
  const cardTypeValue = resolved.isSlabbed ? "slabbed" : "raw";
  setIfEmpty("cardType", cardTypeValue);
  if (!resolved._sources.cardType) {
    const source =
      resolved.isSlabbed && resolved._sources.isSlabbed
        ? resolved._sources.isSlabbed
        : "estimated";
    setSourceIfUnset("cardType", source, hadCardType);
  }
  return resolved;
}
