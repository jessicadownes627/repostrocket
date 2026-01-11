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

  return promotions;
}
