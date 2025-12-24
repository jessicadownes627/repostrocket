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

const REQUIRED_IDENTITY_FIELDS = ["player", "team", "year", "setName"];
const DISABLE_OCR_FILTERING =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

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
  },
  needsUserConfirmation: true,
  ocr: {
    lines: [],
  },
  manualSuggestions: {
    player: "",
    team: "",
    year: "",
    setName: "",
  },
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

    const userContent = buildUserContent({ frontImage, backImage, altText });

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("[cardIntel] OpenAI request starting", { requestId, imageHash });
    console.log("[cardIntel] calling OpenAI OCR for full card");
    const response = await client.responses.create({
      model: "gpt-4o",
      input: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    });
    console.log("[cardIntel] OpenAI request completed", { requestId });

    const raw = response.output_text || "";
    console.log('[cardIntel][OCR FULL CARD] rawText="%s"', raw);
    const parsed = parseJsonSafe(raw);
    const ocrLines = extractOcrLines(parsed);
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

    const responsePayload = {
      ...EMPTY_RESPONSE,
      ...derived,
      imageHash,
      requestId,
      ocr: { lines: ocrLines },
      ocrFull: fullCardOcr,
      ocrZones: formattedZones,
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

function buildUserContent({ frontImage, backImage, altText }) {
  const segments = [];
  if (frontImage) {
    if (altText?.front) {
      segments.push({
        type: "input_text",
        text: `Front image description: ${altText.front}`,
      });
    }
    segments.push({ type: "input_text", text: "Front of card" });
    segments.push({ type: "input_image", image_url: frontImage });
  } else {
    segments.push({ type: "input_text", text: "Front image not provided." });
  }

  if (backImage) {
    if (altText?.back) {
      segments.push({
        type: "input_text",
        text: `Back image description: ${altText.back}`,
      });
    }
    segments.push({ type: "input_text", text: "Back of card" });
    segments.push({ type: "input_image", image_url: backImage });
  } else {
    segments.push({ type: "input_text", text: "Back image not provided." });
  }

  return segments;
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

  const playerEntry = findPlayerCandidate(lines);
  const player = playerEntry ? titleCase(playerEntry.text) : "";
  if (playerEntry) {
    evidence.push(buildEvidenceLine("player", playerEntry));
    sources.player = "ocr";
    isTextVerified.player = true;
    confidence.player = "high";
  }
  manualSuggestions.player = player;

  const teamEntry = findTeamCandidate(lines);
  const team = teamEntry ? titleCaseTeam(teamEntry.text) : "";
  if (teamEntry) {
    evidence.push(buildEvidenceLine("team", teamEntry));
    sources.team = "ocr";
    isTextVerified.team = true;
    confidence.team = "high";
  }
  manualSuggestions.team = team;

  const yearEntry = findYearCandidate(lines);
  const year = yearEntry ? yearEntry.match : "";
  if (yearEntry) {
    evidence.push(buildEvidenceLine("year", yearEntry));
    sources.year = "ocr";
    isTextVerified.year = true;
    confidence.year = "high";
  }
  manualSuggestions.year = year;

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
    evidence.push("No readable player text detected in OCR.");
    confidence.player = "low";
  }
  if (!team) {
    evidence.push("No MLB team name detected in OCR text.");
    confidence.team = "low";
  }
  if (!year) {
    evidence.push("No printed year detected in OCR text.");
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
    cardNumber: "",
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
      : "";
  return text
    ? `OCR line ${entry.index + 1 || 0}: "${text}" -> ${field}`
    : `OCR mapping for ${field}`;
}
