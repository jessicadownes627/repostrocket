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
        lines.push(entry);
      } else if (typeof entry?.text === "string") {
        lines.push(entry.text);
      }
    });
  };
  pushLines(intel?.ocrFull?.lines);
  pushLines(intel?.ocr?.lines);
  pushLines(intel?.ocrZones?.topBanner?.lines);
  pushLines(intel?.ocrZones?.bottomCenter?.lines);
  pushLines(intel?.ocrZones?.bottomLeft?.lines);
  return lines.map((line) => line.trim()).filter(Boolean);
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

function findTeamFromOcr(lines) {
  const allTeams = [...MLB_TEAMS, ...NFL_TEAMS, ...NBA_TEAMS, ...NHL_TEAMS];
  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (!normalized) continue;
    for (const team of allTeams) {
      if (normalized.includes(team)) {
        return titleCase(normalized);
      }
    }
  }
  return "";
}

function findBrandFromOcr(lines) {
  const brands = [
    "upper deck",
    "topps",
    "panini",
    "bowman",
    "donruss",
    "fleer",
    "score",
    "leaf",
    "skybox",
  ];
  for (const line of lines) {
    const normalized = normalizeLine(line);
    if (!normalized) continue;
    for (const brand of brands) {
      if (normalized === brand || normalized.includes(brand)) {
        return titleCase(brand);
      }
    }
  }
  return "";
}

function findYearFromOcr(lines) {
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(19|20)\d{2}$/.test(trimmed)) {
      return trimmed;
    }
  }
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^'?\s*(\d{2})\s*$/);
    if (match) {
      const year = Number(match[1]);
      const century = year >= 30 ? 1900 : 2000;
      return String(century + year);
    }
  }
  return "";
}

function findPlayerFromOcr(lines, teamLine, brandLine) {
  for (const line of lines) {
    const cleaned = normalizeLine(line);
    if (!cleaned) continue;
    if (teamLine && cleaned === normalizeLine(teamLine)) continue;
    if (brandLine && cleaned.includes(normalizeLine(brandLine))) continue;
    if (/\d/.test(cleaned)) continue;
    const words = cleaned.split(" ").filter(Boolean);
    if (words.length < 2 || words.length > 3) continue;
    if (words.some((word) => word.length < 2)) continue;
    return titleCase(cleaned);
  }
  return "";
}

export function resolveCardFacts(intel = {}) {
  const promotions = {};
  if (!intel) return promotions;

  if (intel.player && isVerifiedField(intel, "player")) {
    promotions.player = intel.player;
  }

  const teamValue = intel.team;
  const teamVerified = isVerifiedField(intel, "team");
  if (teamValue && teamVerified) {
    promotions.team = teamValue;
    if (!promotions.league || !promotions.sport) {
      const inferred = matchesLeague(teamValue);
      if (inferred) {
        promotions.league = promotions.league || inferred.league;
        promotions.sport = promotions.sport || inferred.sport;
      }
    }
  }

  if (intel.league && isVerifiedField(intel, "league")) {
    promotions.league = intel.league;
  }
  if (intel.sport && isVerifiedField(intel, "sport")) {
    promotions.sport = intel.sport;
  }

  const setName = intel.setName || intel.setBrand;
  if (setName && (isVerifiedField(intel, "setName") || isVerifiedField(intel, "setBrand"))) {
    promotions.setName = setName;
    if (!promotions.setBrand && intel.setBrand) {
      promotions.setBrand = intel.setBrand;
    }
  }

  const position = intel.position || intel.role || intel.primaryPosition;
  if (position && isVerifiedField(intel, "position")) {
    promotions.position = normalizePosition(position);
  }

  if (intel.year && isVerifiedField(intel, "year")) {
    promotions.year = intel.year;
  }

  const needsOcrFallback =
    !promotions.player &&
    !promotions.team &&
    !promotions.setName &&
    !promotions.year;
  if (needsOcrFallback) {
    const ocrLines = collectOcrLines(intel);
    if (ocrLines.length) {
      const teamLine = !promotions.team ? findTeamFromOcr(ocrLines) : "";
      const brandLine = !promotions.setName ? findBrandFromOcr(ocrLines) : "";
      const yearValue = !promotions.year ? findYearFromOcr(ocrLines) : "";
      const playerLine =
        !promotions.player && (teamLine || brandLine || yearValue)
          ? findPlayerFromOcr(ocrLines, teamLine, brandLine)
          : "";
      const signalCount = [teamLine, brandLine, yearValue, playerLine].filter(Boolean).length;
      if (signalCount < 2) {
        return promotions;
      }
      if (!promotions.team && teamLine) {
        promotions.team = teamLine;
        const inferred = matchesLeague(teamLine);
        if (inferred) {
          promotions.league = promotions.league || inferred.league;
          promotions.sport = promotions.sport || inferred.sport;
        }
      }
      if (!promotions.setName && brandLine) {
        promotions.setName = brandLine;
        promotions.setBrand = brandLine;
      }
      if (!promotions.year && yearValue) {
        promotions.year = yearValue;
      }
      if (!promotions.player && playerLine) {
        promotions.player = playerLine;
      }
    }
  }

  return promotions;
}
