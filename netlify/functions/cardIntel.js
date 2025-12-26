import OpenAI from "openai";

const SYSTEM_PROMPT = `
You are an OCR engine for sports cards.
Rules:
- Return ONLY raw text you can clearly read. No interpretation, no player names, no inference.
- Output JSON exactly like: { "ocr": { "lines": [ { "text": "...", "confidence": 0.0 } ] } }
- Each line represents a contiguous snippet of readable text from either image.
- If you cannot read any text, return { "ocr": { "lines": [] } }.
- Do NOT add player/team/year/set fields. Your job is OCR only.
`;

const MLB_TEAMS = [
  "Arizona Diamondbacks",
  "Atlanta Braves",
  "Baltimore Orioles",
  "Boston Red Sox",
  "Chicago Cubs",
  "Chicago White Sox",
  "Cincinnati Reds",
  "Cleveland Guardians",
  "Cleveland Indians",
  "Colorado Rockies",
  "Detroit Tigers",
  "Houston Astros",
  "Kansas City Royals",
  "Los Angeles Angels",
  "Los Angeles Dodgers",
  "Miami Marlins",
  "Milwaukee Brewers",
  "Minnesota Twins",
  "New York Mets",
  "New York Yankees",
  "Oakland Athletics",
  "Philadelphia Phillies",
  "Pittsburgh Pirates",
  "San Diego Padres",
  "San Francisco Giants",
  "Seattle Mariners",
  "St. Louis Cardinals",
  "Tampa Bay Rays",
  "Texas Rangers",
  "Toronto Blue Jays",
  "Washington Nationals",
  "Montreal Expos",
  "Brooklyn Dodgers",
  "New York Giants",
];

const CARD_BRANDS = [
  "Topps",
  "Donruss",
  "Fleer",
  "Upper Deck",
  "Bowman",
  "Score",
  "Panini",
  "Leaf",
  "O-Pee-Chee",
  "Stadium Club",
  "SkyBox",
];
const CARD_BRAND_SET = new Set(CARD_BRANDS.map((brand) => brand.toLowerCase()));
const KNOWN_PLAYER_NAMES = [
  "Ron Darling",
  "Mike Trout",
  "Shohei Ohtani",
  "Derek Jeter",
  "Barry Bonds",
  "Ken Griffey Jr",
  "Cal Ripken Jr",
  "Willie Mays",
  "Hank Aaron",
  "Nolan Ryan",
  "Rickey Henderson",
  "Ichiro Suzuki",
  "Chipper Jones",
  "David Ortiz",
  "Clayton Kershaw",
  "Mookie Betts",
  "Aaron Judge",
  "Vladimir Guerrero Jr",
  "Jose Altuve",
  "Freddie Freeman",
  "Fernando Tatis Jr",
  "Yadier Molina",
  "Bryce Harper",
  "Juan Soto",
];
const KNOWN_PLAYER_SET = new Set(
  KNOWN_PLAYER_NAMES.map((name) => name.toLowerCase())
);
const MLB_TEAM_SET = new Set(MLB_TEAMS.map((team) => team.toLowerCase()));
const POSITION_KEYWORDS = [
  "Pitcher",
  "Catcher",
  "Infielder",
  "Shortstop",
  "First Baseman",
  "Second Baseman",
  "Third Baseman",
  "Outfielder",
  "Left Fielder",
  "Right Fielder",
  "Center Fielder",
  "Designated Hitter",
  "Quarterback",
  "Running Back",
  "Wide Receiver",
  "Linebacker",
  "Center",
  "Guard",
  "Forward",
  "Goalie",
  "Defenseman",
];

const REQUIRED_IDENTITY_FIELDS = ["player", "team", "year", "setName"];
const DISABLE_OCR_FILTERING =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";
const PLAYER_OCR_CONFIDENCE_THRESHOLD = 0.85;
const YEAR_OCR_CONFIDENCE_THRESHOLD = 0.85;
const MIN_YEAR = 1970;
const TEAM_OCR_CONFIDENCE_THRESHOLD = 0.85;
const CARD_NUMBER_OCR_CONFIDENCE_THRESHOLD = 0.85;

const EMPTY_RESPONSE = {
  player: "",
  team: "",
  sport: "",
  year: "",
  setName: "",
  cardNumber: "",
  brand: "",
  notes: "",
  confidence: {
    player: "low",
    team: "low",
    year: "low",
    setName: "low",
    cardNumber: "low",
    brand: "low",
  },
  sources: {
    player: "infer",
    team: "infer",
    year: "infer",
    setName: "infer",
    cardNumber: "infer",
    brand: "infer",
  },
  sourceEvidence: [],
  isTextVerified: {
    player: false,
    team: false,
    year: false,
    setName: false,
    cardNumber: false,
  },
  needsUserConfirmation: true,
  ocr: {
    lines: [],
  },
  ocrBack: {
    lines: [],
  },
  manualSuggestions: {
    player: "",
    team: "",
    year: "",
    setName: "",
    cardNumber: "",
  },
  cardBackDetails: null,
};

export async function handler(event) {
  console.log("[cardIntel] handler entered");
  console.log("[cardIntel] function invoked");
  let currentRequestId = `cardIntel-${Date.now()}`;
  try {
    const hasKey = Boolean(process.env.OPENAI_API_KEY);
    console.log("[cardIntel] OPENAI key present:", hasKey);
    if (!hasKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing OPENAI_API_KEY" }),
      };
    }

    const {
      frontImage,
      backImage,
      hints = {},
      altText = {},
      imageHash = null,
      requestId = currentRequestId,
      nameZoneCrops = null,
    } = JSON.parse(event.body || "{}");
    currentRequestId = requestId;
    console.log("[cardIntel] payload received", {
      requestId,
      imageHash,
      hasFront: Boolean(frontImage),
      hasBack: Boolean(backImage),
      frontImageBytes: frontImage ? frontImage.length : 0,
      backImageBytes: backImage ? backImage.length : 0,
    });
    if (nameZoneCrops && typeof nameZoneCrops === "object") {
      Object.entries(nameZoneCrops).forEach(([zoneKey, zoneValue]) => {
        if (!zoneValue || typeof zoneValue !== "object") return;
        const rect = zoneValue.rect || {};
        const meta = zoneValue.meta || {};
        console.log("[cardIntel][CROP] zone=%s rect=%o image=%o", zoneKey, rect, {
          width: meta.imageWidth,
          height: meta.imageHeight,
          cardBounds: meta.cardBounds,
        });
      });
    }
    if (!frontImage && !backImage) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Card images required" }),
      };
    }

    // if (process.env.NODE_ENV === "development") {
    //   const mockPayload = {
    //     player: "Mock Player",
    //     team: "Example Team",
    //     sport: "Baseball",
    //     year: "2022",
    //     setName: "Repost Rocket Preview",
    //     cardNumber: "RR-01",
    //     brand: "Mock Brand",
    //     notes: "Development mock result. Real AI is bypassed.",
    //     confidence: {
    //       player: "high",
    //       year: "high",
    //       setName: "medium",
    //       cardNumber: "medium",
    //       brand: "medium",
    //     },
    //     sources: {
    //       player: "front",
    //       year: "back",
    //       setName: "back",
    //       cardNumber: "back",
    //       brand: "front",
    //     },
    //   };
    //   return {
    //     statusCode: 200,
    //     body: JSON.stringify(mockPayload),
    //   };
    // }

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    let ocrLines = [];
    if (frontImage) {
      const frontResult = await runFullImageOcr(client, {
        imageUrl: frontImage,
        label: "Front of card",
        altText: altText?.front,
        requestId,
      });
      ocrLines = frontResult.lines;
    }
    let backOcrLines = [];
    if (backImage) {
      const backResult = await runFullImageOcr(client, {
        imageUrl: backImage,
        label: "Back of card",
        altText: altText?.back,
        requestId,
        logLabel: "OCR BACK",
      });
      backOcrLines = backResult.lines;
    }
    const fullCardOcr = {
      lines: ocrLines,
      confidence: ocrLines.reduce(
        (max, line) => Math.max(max, typeof line?.confidence === "number" ? line.confidence : 0),
        0
      ),
    };
    const zoneOcrResults = {};
    const zoneSuggestions = {};
    const zoneUsage = {};
  const derived = deriveFieldsFromOcr(ocrLines, hints);
    const formattedZones = Object.entries(zoneOcrResults || {}).reduce(
      (acc, [zoneKey, zoneData]) => {
        const lines = Array.isArray(zoneData?.lines) ? zoneData.lines : [];
        const bestConfidence = lines.reduce(
          (max, line) => Math.max(max, line.confidence || 0),
          0
        );
        acc[zoneKey] = {
          lines,
          bestConfidence,
          usedForSuggestion: Boolean(zoneUsage?.[zoneKey]),
          image: nameZoneCrops?.[zoneKey]?.image || null,
        };
        return acc;
      },
      {}
    );
    const cardBackDetails = buildBackDetailsFromOcr(backOcrLines);

    const responsePayload = {
      ...EMPTY_RESPONSE,
      ...derived,
      imageHash,
      requestId,
      ocr: { lines: ocrLines },
      ocrBack: { lines: backOcrLines },
      ocrFull: fullCardOcr,
      ocrZones: formattedZones,
      cardBackDetails,
      manualSuggestions: {
        ...EMPTY_RESPONSE.manualSuggestions,
        ...zoneSuggestions,
        ...derived.manualSuggestions,
      },
    };
    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
    };
  } catch (err) {
    console.error("[cardIntel] fatal error", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: err?.message || "Card intel failed unexpectedly.",
        stack: err?.stack || null,
        requestId: currentRequestId || `cardIntel-error-${Date.now()}`,
      }),
    };
  }
}

async function runFullImageOcr(client, { imageUrl, label, altText, requestId, logLabel }) {
  if (!imageUrl) {
    return { lines: [] };
  }
  const userContent = [];
  if (altText) {
    userContent.push({
      type: "input_text",
      text: `${label} description: ${altText}`,
    });
  }
  userContent.push({ type: "input_text", text: label || "Card image" });
  userContent.push({ type: "input_image", image_url: imageUrl });

  console.log("[cardIntel] OpenAI OCR start", {
    label,
    requestId,
  });
  const response = await client.responses.create({
    model: "gpt-4o",
    input: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  });
  console.log("[cardIntel] OpenAI OCR completed", {
    label,
    requestId,
  });
  const raw = response.output_text || "";
  const logLabelSafe = logLabel || "OCR FULL CARD";
  console.log(`[cardIntel][${logLabelSafe}] rawText="%s"`, raw);
  const parsed = parseJsonSafe(raw);
  const lines = extractOcrLines(parsed);
  return { lines, raw };
}

function parseJsonSafe(text) {
  if (!text) return null;
  try {
    return JSON.parse(stripCodeFences(text));
  } catch (err) {
    console.error("Card intel JSON parse failed:", err);
    return null;
  }
}

function stripCodeFences(str) {
  return str.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function extractOcrLines(payload, { skipFiltering = DISABLE_OCR_FILTERING } = {}) {
  if (!payload || typeof payload !== "object") {
    return [];
  }
  const rawLines = payload?.ocr?.lines;
  if (!Array.isArray(rawLines)) return [];
  const mapped = rawLines.map((line, index) => {
    const rawText =
      typeof line?.text === "string"
        ? line.text
        : line?.text === null || line?.text === undefined
        ? ""
        : String(line.text);
    return {
      text: rawText,
      normalized: normalizeTextLine(rawText),
      confidence: typeof line?.confidence === "number" ? line.confidence : null,
      index,
    };
  });
  if (skipFiltering) {
    return mapped;
  }
  return mapped.filter((entry) => Boolean(entry.text && entry.text.trim()));
}

async function runNameZoneOcr(client, zoneMap) {
  if (!zoneMap || typeof zoneMap !== "object") return {};
  const entries = Object.entries(zoneMap);
  if (!entries.length) return {};
  const results = {};
  const model = "gpt-4o";
  for (const [zoneKey, zoneValue] of entries) {
    const imageDataUrl =
      typeof zoneValue === "string"
        ? zoneValue
        : typeof zoneValue?.image === "string"
        ? zoneValue.image
        : null;
    if (!imageDataUrl) continue;
    try {
      console.log("[cardIntel][OCR] zone=%s model=%s request -> start", zoneKey, model);
      const response = await client.responses.create({
        model,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `OCR zone focus: ${zoneKey}`,
              },
              {
                type: "input_image",
                image_url: imageDataUrl,
              },
            ],
          },
        ],
      });
      const rawText = response.output_text || "";
      console.log("[cardIntel][OCR RAW] zone=%s model=%s raw=%s", zoneKey, model, rawText);
      const parsed = parseJsonSafe(rawText);
      const lines = extractOcrLines(parsed, { skipFiltering: true });
      results[zoneKey] = { lines };
    } catch (err) {
      console.error("Card intel zone OCR failed:", zoneKey, err);
    }
  }
  return results;
}

function buildManualSuggestionsFromZones(zones = {}) {
  if (!zones || typeof zones !== "object") {
    return { suggestions: {}, zoneUsage: {} };
  }
  const zoneOrder = ["bottomCenter", "bottomLeft", "topBanner"];
  const zoneUsage = {};
  const suggestions = {};

  const findValue = (fieldKey, finderFn, transformFn) => {
    if (suggestions[fieldKey]) return;
    for (const zoneKey of zoneOrder) {
      const lines = zones?.[zoneKey]?.lines;
      if (!Array.isArray(lines) || !lines.length) continue;
      const entry = finderFn(lines);
      if (entry) {
        suggestions[fieldKey] = transformFn(entry);
        zoneUsage[zoneKey] = zoneUsage[zoneKey] || {};
        zoneUsage[zoneKey][fieldKey] = true;
        break;
      }
    }
  };

  findValue("player", findPlayerCandidate, (entry) => titleCase(entry.text));
  findValue("team", findTeamCandidate, (entry) => titleCaseTeam(entry.text));
  findValue("setName", findSetCandidate, (entry) => titleCase(entry.brand));

  return { suggestions, zoneUsage };
}

export function deriveFieldsFromOcr(lines = [], hints = {}) {
  const evidence = [];
  const sources = { ...EMPTY_RESPONSE.sources };
  const isTextVerified = { ...EMPTY_RESPONSE.isTextVerified };
  const confidence = { ...EMPTY_RESPONSE.confidence };
  const manualSuggestions = { ...EMPTY_RESPONSE.manualSuggestions };

  const verifiedPlayerEntry = findVerifiedPlayerFromOcr(lines);
  const fallbackPlayerEntry = findPlayerCandidate(lines);
  const player = verifiedPlayerEntry ? verifiedPlayerEntry.matchedName : "";
  if (verifiedPlayerEntry) {
    evidence.push(buildEvidenceLine("player", verifiedPlayerEntry));
    sources.player = "ocr";
    isTextVerified.player = true;
    confidence.player = "high";
  }
  manualSuggestions.player = fallbackPlayerEntry
    ? titleCase(fallbackPlayerEntry.text)
    : "";

  const verifiedTeamEntry = findVerifiedTeamFromOcr(lines);
  const fallbackTeamEntry = findTeamCandidate(lines);
  const team = verifiedTeamEntry ? verifiedTeamEntry.matchedTeam : "";
  if (verifiedTeamEntry) {
    evidence.push(buildEvidenceLine("team", verifiedTeamEntry));
    sources.team = "ocr";
    isTextVerified.team = true;
    confidence.team = "high";
  }
  manualSuggestions.team = fallbackTeamEntry
    ? titleCaseTeam(fallbackTeamEntry.text)
    : "";

  const verifiedYearEntry = findVerifiedYearFromOcr(lines);
  const fallbackYearEntry = findYearCandidate(lines);
  const year = verifiedYearEntry ? verifiedYearEntry.matchedYear : "";
  if (verifiedYearEntry) {
    evidence.push(buildEvidenceLine("year", verifiedYearEntry));
    sources.year = "ocr";
    isTextVerified.year = true;
    confidence.year = "high";
  }
  manualSuggestions.year = fallbackYearEntry ? fallbackYearEntry.match : "";

  const verifiedCardNumberEntry = findVerifiedCardNumberFromOcr(lines);
  const fallbackCardNumberEntry = findCardNumberSuggestion(lines);
  const cardNumber = verifiedCardNumberEntry ? verifiedCardNumberEntry.matchedNumber : "";
  if (verifiedCardNumberEntry) {
    evidence.push(buildEvidenceLine("cardNumber", verifiedCardNumberEntry));
    sources.cardNumber = "ocr";
    confidence.cardNumber = "high";
    isTextVerified.cardNumber = true;
  }
  manualSuggestions.cardNumber = fallbackCardNumberEntry
    ? fallbackCardNumberEntry.matchedNumber
    : "";

  const setEntry = findSetCandidate(lines);
  const setName = setEntry ? titleCase(setEntry.brand) : "";
  let brand = setName || "";
  if (setEntry) {
    evidence.push(buildEvidenceLine("setName", setEntry));
    sources.setName = "ocr";
    confidence.setName = "medium";
    confidence.brand = "medium";
    isTextVerified.setName = true;
  } else {
    confidence.setName = "low";
    confidence.brand = "low";
  }
  manualSuggestions.setName = setName;

  const needsUserConfirmation = REQUIRED_IDENTITY_FIELDS.some((field) => {
    if (field === "setName") return !setName;
    if (field === "player") return !player;
    if (field === "team") return !team;
    if (field === "year") return !year;
    return false;
  });

  if (!player) {
    evidence.push("No verified player name detected in OCR.");
    confidence.player = "low";
  }
  if (!team) {
    evidence.push("No verified MLB team detected in OCR.");
    confidence.team = "low";
  }
  if (!year) {
    evidence.push("No verified year detected in OCR.");
    confidence.year = "low";
  }
  if (!setName) {
    evidence.push("No card brand/set text detected in OCR.");
  }

  return {
    player,
    team,
    sport: hints?.sport || "",
    year,
    setName,
    cardNumber,
    brand,
    notes: "",
    confidence,
    sources,
    sourceEvidence: evidence,
    isTextVerified,
    needsUserConfirmation,
    manualSuggestions,
  };
}

function normalizeTextLine(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizePlayerName(text = "") {
  return text.replace(/\s+/g, " ").trim();
}

function isExactKnownPlayer(text = "") {
  const normalized = normalizePlayerName(text);
  if (!normalized) return null;
  if (!/^[A-Za-z.'\-\s]+$/.test(normalized)) return null;
  return KNOWN_PLAYER_SET.has(normalized.toLowerCase()) ? normalized : null;
}

function findVerifiedPlayerFromOcr(lines = []) {
  if (!Array.isArray(lines)) return null;
  for (const entry of lines) {
    const confidence =
      typeof entry?.confidence === "number" ? entry.confidence : null;
    if (confidence === null || confidence < PLAYER_OCR_CONFIDENCE_THRESHOLD) {
      continue;
    }
    const matched = isExactKnownPlayer(entry?.text || "");
    if (matched) {
      return {
        ...entry,
        matchedName: matched,
      };
    }
  }
  return null;
}

function findVerifiedYearFromOcr(lines = []) {
  if (!Array.isArray(lines)) return null;
  const currentYear = new Date().getFullYear();
  for (const entry of lines) {
    const confidence =
      typeof entry?.confidence === "number" ? entry.confidence : null;
    if (confidence === null || confidence < YEAR_OCR_CONFIDENCE_THRESHOLD) {
      continue;
    }
    const raw = String(entry?.text || "").trim();
    if (!/^\d{4}$/.test(raw)) continue;
    const yearValue = Number(raw);
    if (Number.isNaN(yearValue)) continue;
    if (yearValue < MIN_YEAR || yearValue > currentYear) continue;
    return {
      ...entry,
      matchedYear: String(yearValue),
    };
  }
  return null;
}

function extractCardNumberMatch(text = "") {
  const normalized = normalizeTextLine(text);
  if (!normalized) return null;
  const prefixPatterns = [
    { regex: /^#\s*(\d{1,4})$/i, type: "prefix" },
    { regex: /^No\.?\s*#?\s*(\d{1,4})$/i, type: "prefix" },
    { regex: /^Card\s*#?\s*(\d{1,4})$/i, type: "prefix" },
  ];
  for (const pattern of prefixPatterns) {
    const match = normalized.match(pattern.regex);
    if (match) {
      return { number: match[1], type: "prefix" };
    }
  }
  if (/^\d{1,4}$/.test(normalized)) {
    return { number: normalized, type: "plain" };
  }
  return null;
}

function hasNearbyContext(lines = [], targetIndex = 0, range = 2) {
  for (
    let i = Math.max(0, targetIndex - range);
    i <= Math.min(lines.length - 1, targetIndex + range);
    i += 1
  ) {
    if (i === targetIndex) continue;
    const text = String(lines[i]?.text || "").toLowerCase();
    if (!text) continue;
    if (/\b(18|19|20)\d{2}\b/.test(text)) return true;
    for (const brand of CARD_BRAND_SET) {
      if (text.includes(brand)) return true;
    }
  }
  return false;
}

function findCardNumberSuggestion(lines = []) {
  if (!Array.isArray(lines)) return null;
  for (const entry of lines) {
    const match = extractCardNumberMatch(entry?.text || "");
    if (!match) continue;
    if (match.type === "plain" && !hasNearbyContext(lines, entry.index)) continue;
    return { ...entry, matchedNumber: match.number };
  }
  return null;
}

function findVerifiedCardNumberFromOcr(lines = []) {
  if (!Array.isArray(lines)) return null;
  const matches = [];
  lines.forEach((entry) => {
    const confidence =
      typeof entry?.confidence === "number" ? entry.confidence : null;
    if (confidence === null || confidence < CARD_NUMBER_OCR_CONFIDENCE_THRESHOLD) {
      return;
    }
    const match = extractCardNumberMatch(entry?.text || "");
    if (!match) return;
    if (match.type === "plain" && !hasNearbyContext(lines, entry.index)) return;
    matches.push({
      entry,
      matchedNumber: match.number,
    });
  });
  if (matches.length === 1) {
    const { entry, matchedNumber } = matches[0];
    return { ...entry, matchedNumber };
  }
  return null;
}

function findPositionFromLines(lines = []) {
  for (const entry of lines) {
    const text = String(entry?.text || "");
    if (!text) continue;
    for (const keyword of POSITION_KEYWORDS) {
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(text)) {
        return keyword;
      }
    }
  }
  return "";
}

function buildBackDetailsFromOcr(lines = []) {
  if (!Array.isArray(lines) || !lines.length) return null;
  const teamEntry = findVerifiedTeamFromOcr(lines);
  const position = findPositionFromLines(lines);
  const consumedTexts = new Set();
  if (teamEntry?.text) consumedTexts.add(teamEntry.text.trim());

  const uniqueLines = [];
  lines.forEach((entry) => {
    const text = String(entry?.text || "").trim();
    if (!text) return;
    if (consumedTexts.has(text)) return;
    if (uniqueLines.includes(text)) return;
    uniqueLines.push(text);
  });

  const supportingLines = uniqueLines.slice(0, 4);

  if (!teamEntry && !position && !supportingLines.length) {
    return null;
  }

  return {
    team: teamEntry?.matchedTeam || "",
    position: position || "",
    lines: supportingLines,
  };
}

function findVerifiedTeamFromOcr(lines = []) {
  if (!Array.isArray(lines)) return null;
  for (const entry of lines) {
    const confidence =
      typeof entry?.confidence === "number" ? entry.confidence : null;
    if (confidence === null || confidence < TEAM_OCR_CONFIDENCE_THRESHOLD) {
      continue;
    }
    const normalized = normalizePlayerName(entry?.text || "").toLowerCase();
    if (!normalized) continue;
    if (!MLB_TEAM_SET.has(normalized)) continue;
    const canonical = MLB_TEAMS.find(
      (team) => team.toLowerCase() === normalized
    );
    if (!canonical) continue;
    return {
      ...entry,
      matchedTeam: canonical,
    };
  }
  return null;
}

function titleCase(value = "") {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function titleCaseTeam(value = "") {
  const normalized = value.toLowerCase();
  const match = MLB_TEAMS.find((team) => team.toLowerCase() === normalized);
  if (match) return match;
  return titleCase(value);
}

function findPlayerCandidate(lines) {
  return lines.find((entry) => {
    if (!isLikelyPlayer(entry.text)) return false;
    const normalized = entry.text.toLowerCase();
    const matchesTeam = MLB_TEAMS.some((team) => team.toLowerCase() === normalized);
    if (matchesTeam) return false;
    const matchesBrand = CARD_BRANDS.some((brand) =>
      normalized.includes(brand.toLowerCase())
    );
    return !matchesBrand;
  });
}

function findTeamCandidate(lines) {
  for (const entry of lines) {
    const normalized = entry.text.toLowerCase();
    const hit = MLB_TEAMS.find((team) => team.toLowerCase() === normalized);
    if (hit) {
      return { ...entry, text: hit };
    }
  }
  return null;
}

function findYearCandidate(lines) {
  for (const entry of lines) {
    const match = entry.text.match(/\b(18|19|20)\d{2}\b/);
    if (match) {
      return { ...entry, match: match[0] };
    }
  }
  return null;
}

function findSetCandidate(lines) {
  for (const entry of lines) {
    const hit = CARD_BRANDS.find((brand) =>
      entry.text.toLowerCase().includes(brand.toLowerCase())
    );
    if (hit) {
      return { ...entry, brand: hit };
    }
  }
  return null;
}

function isLikelyPlayer(text = "") {
  if (!text) return false;
  const cleaned = text.replace(/[^A-Z\s'-]/gi, "");
  if (!cleaned.trim()) return false;
  const words = cleaned.trim().split(/\s+/);
  if (words.length < 2 || words.length > 3) return false;
  const uppercaseRatio =
    cleaned.replace(/[^A-Z]/g, "").length / cleaned.replace(/[^A-Za-z]/g, "").length || 0;
  return uppercaseRatio > 0.7;
}

function buildEvidenceLine(field, entry) {
  const text =
    typeof entry?.text === "string"
      ? entry.text
      : typeof entry?.match === "string"
      ? entry.match
      : typeof entry?.matchedName === "string"
      ? entry.matchedName
      : "";
  return text
    ? `OCR line ${entry.index + 1 || 0}: "${text}" -> ${field}`
    : `OCR mapping for ${field}`;
}
