import { getPhotoUrl } from "../utils/photoHelpers";

// --------------------------------------------
// Basic Category Detection
// --------------------------------------------
export function predictCategoryFromPhoto(photos = []) {
  const firstEntry = photos && photos.length > 0 ? photos[0] : null;
  const firstUrl = getPhotoUrl(firstEntry) || String(firstEntry || "");
  const img = firstUrl.toLowerCase();

  if (/mug|cup|tumbler|coffee/.test(img)) return "Home · Kitchen";
  if (/sweater|hoodie|zip|fleece|top/.test(img)) return "Women’s Clothing";
  if (/shoe|sneaker|boot/.test(img)) return "Footwear";
  if (/toy|lego|plush|doll/.test(img)) return "Kids · Toys";
  if (/lipstick|palette|makeup/.test(img)) return "Beauty";

  return "General Merchandise";
}

// --------------------------------------------
// Sports Card Detection
// --------------------------------------------
export function isSportsCardPhoto(photos = []) {
  const firstEntry = photos && photos.length > 0 ? photos[0] : null;
  const firstUrl = getPhotoUrl(firstEntry) || String(firstEntry || "");
  const img = firstUrl.toLowerCase();

  const pattern =
    /topps|panini|prizm|chrome|bowman|donruss|optic|rated\s*rookie/;

  return pattern.test(img);
}

// --------------------------------------------
// Basic Brand Guessing
// --------------------------------------------
export function guessBrandFromPhoto(photos = []) {
  const firstEntry = photos && photos.length > 0 ? photos[0] : null;
  const firstUrl = getPhotoUrl(firstEntry) || String(firstEntry || "");
  const img = firstUrl.toLowerCase();

  if (/yeti/.test(img)) return "YETI";
  if (/stanley/.test(img)) return "Stanley";
  if (/nike/.test(img)) return "Nike";
  if (/gap/.test(img)) return "GAP";
  if (/adidas/.test(img)) return "Adidas";

  // fall back
  return "Premium Basics";
}

// --------------------------------------------
// Build SEO keywords
// --------------------------------------------
export function buildSeoKeywords({ title = "", description = "", tags = [] }) {
  const tagWords = Array.isArray(tags) ? tags : [];

  const baseWords = [
    ...String(title).split(" "),
    ...String(description).split(" "),
    ...tagWords,
  ].map((w) => String(w).toLowerCase().trim());

  const cleaned = baseWords.filter(
    (w) => w.length > 2 && /^[a-z0-9]+$/.test(w)
  );

  // De-duplicate and limit
  return Array.from(new Set(cleaned)).slice(0, 15);
}

// --------------------------------------------
// Extract Year e.g. 2023, 2019, 2020
// --------------------------------------------
export function extractCardYear(text = "") {
  const match = String(text).match(/20\d{2}/);
  return match ? match[0] : "";
}

// --------------------------------------------
// Extract card number e.g. #182
// --------------------------------------------
export function extractCardNumber(text = "") {
  const match = String(text).match(/#\s*\d+/);
  return match ? match[0].replace("#", "").trim() : "";
}

// --------------------------------------------
// Extract serial numbers e.g. /199, /75
// --------------------------------------------
export function extractCardSerial(text = "") {
  const match = String(text).match(/\/\s*\d+/);
  return match ? match[0].replace("/", "").trim() : "";
}

// --------------------------------------------
// Detect exact brand/set
// --------------------------------------------
export function detectCardBrand(text = "") {
  const t = String(text).toLowerCase();

  if (t.includes("prizm")) return "Panini Prizm";
  if (t.includes("optic")) return "Donruss Optic";
  if (t.includes("chrome")) return "Topps Chrome";
  if (t.includes("bowman")) return "Bowman";
  if (t.includes("donruss")) return "Donruss";
  if (t.includes("topps")) return "Topps";
  if (t.includes("panini")) return "Panini";

  return "";
}

// --- SPORTS CARD EXTRACTION SUITE (PHASE 3) ---

// Detect if the text contains a known player's name
export function extractCardPlayer(text = "") {
  const players = [
    // MLB
    "shohei ohtani",
    "mike trout",
    "ronald acuña",
    "juan soto",
    "aaron judge",
    "mookie betts",
    "bobby witt",
    "elly de la cruz",
    "jazz chisholm",
    "wander franco",

    // NBA
    "lebron james",
    "stephen curry",
    "luka doncic",
    "ja morant",
    "victor wembanyama",
    "anthony edwards",
    "kevin durant",
    "jayson tatum",
    "zion williamson",

    // NFL
    "patrick mahomes",
    "joe burrow",
    "josh allen",
    "cj stroud",
    "lamar jackson",
    "jalen hurts",
    "aaron rodgers",
    "trevor lawrence",
    "brock purdy",

    // NHL
    "connor mcdavid",
    "auston matthews",
    "sidney crosby",
    "alex ovechkin",
  ];

  const lower = String(text).toLowerCase();
  return players.find((p) => lower.includes(p)) || "";
}

// Detect team name (from MLB / NBA / NFL / NHL)
export function extractCardTeam(text = "") {
  const teams = [
    // MLB
    "yankees",
    "mets",
    "dodgers",
    "angels",
    "braves",
    "cubs",
    "giants",
    "padres",
    "phillies",
    "cardinals",
    "astros",
    "red sox",
    "rangers",

    // NBA
    "lakers",
    "warriors",
    "celtics",
    "knicks",
    "nets",
    "bulls",
    "heat",
    "mavericks",
    "spurs",
    "bucks",
    "suns",
    "76ers",

    // NFL
    "chiefs",
    "eagles",
    "cowboys",
    "jets",
    "giants",
    "bills",
    "ravens",
    "lions",
    "bengals",
    "49ers",
    "packers",
    "steelers",

    // NHL
    "rangers",
    "bruins",
    "maple leafs",
    "blackhawks",
    "canadiens",
    "oilers",
    "capitals",
  ];

  const lower = String(text).toLowerCase();
  return teams.find((t) => lower.includes(t)) || "";
}

// Detect parallels
export function detectCardParallel(text = "") {
  const lower = String(text).toLowerCase();
  const parallels = [
    "silver",
    "holo",
    "mojo",
    "cracked ice",
    "pink ice",
    "checkerboard",
    "sapphire",
    "tie-dye",
    "atomic",
    "gold",
    "green",
    "blue",
    "red",
    "purple",
    "refractor",
    "superfractor",
    "xfractor",
  ];

  return parallels.find((p) => lower.includes(p)) || "";
}

// --------------------------------------------
// Auto eBay Sports Card Listing Builder
// --------------------------------------------

export function autoSportsCardTitle(item = {}) {
  const {
    cardYear,
    cardBrandExact,
    cardPlayer,
    cardNumber,
    cardParallel,
    cardTeam,
  } = item;

  const parts = [];

  if (cardYear) parts.push(cardYear);
  if (cardBrandExact) parts.push(cardBrandExact);
  if (cardPlayer) parts.push(cardPlayer);
  if (cardNumber) parts.push(`#${cardNumber}`);
  if (cardParallel) parts.push(cardParallel);
  if (cardTeam) parts.push(`- ${cardTeam}`);

  return parts.join(" ").trim();
}

export function autoSportsCardDescription(item = {}) {
  const {
    cardPlayer,
    cardTeam,
    cardYear,
    cardBrandExact,
    cardNumber,
    cardParallel,
    cardSerial,
  } = item;

  const lines = [];

  lines.push("Card Details:");
  if (cardPlayer) lines.push(`• Player: ${cardPlayer}`);
  if (cardTeam) lines.push(`• Team: ${cardTeam}`);
  if (cardYear) lines.push(`• Year: ${cardYear}`);
  if (cardBrandExact) lines.push(`• Brand / Set: ${cardBrandExact}`);
  if (cardNumber) lines.push(`• Card Number: #${cardNumber}`);
  if (cardParallel) lines.push(`• Parallel: ${cardParallel}`);
  if (cardSerial) lines.push(`• Serial Number: /${cardSerial}`);

  lines.push("");
  lines.push("Condition:");
  lines.push("• Please review photos for exact condition.");
  lines.push("");
  lines.push("Shipping:");
  lines.push("• Ships in penny sleeve + top loader + team bag.");
  lines.push("• Multiple card orders ship FREE.");

  return lines.join("\n");
}

export function autoSportsCardSpecifics(item = {}) {
  const {
    cardPlayer,
    cardTeam,
    cardYear,
    cardNumber,
    cardBrandExact,
    cardParallel,
    cardSerial,
  } = item;

  const specifics = {};

  if (cardPlayer) specifics["Player"] = cardPlayer;
  if (cardTeam) specifics["Team"] = cardTeam;
  if (cardYear) specifics["Card Year"] = cardYear;
  if (cardNumber) specifics["Card Number"] = cardNumber;
  if (cardBrandExact) specifics["Set"] = cardBrandExact;
  if (cardParallel) specifics["Parallel/Variety"] = cardParallel;
  if (cardSerial) specifics["Serial Number"] = cardSerial;

  const t = (cardTeam || "").toLowerCase();
  if (t.includes("yankees") || t.includes("dodgers") || t.includes("braves")) {
    specifics["Sport"] = "Baseball";
    specifics["League"] = "MLB";
  } else if (
    t.includes("lakers") ||
    t.includes("celtics") ||
    t.includes("knicks")
  ) {
    specifics["Sport"] = "Basketball";
    specifics["League"] = "NBA";
  } else if (
    t.includes("chiefs") ||
    t.includes("eagles") ||
    t.includes("cowboys")
  ) {
    specifics["Sport"] = "Football";
    specifics["League"] = "NFL";
  } else if (
    t.includes("rangers") ||
    t.includes("bruins") ||
    t.includes("oilers")
  ) {
    specifics["Sport"] = "Hockey";
    specifics["League"] = "NHL";
  }

  return specifics;
}

// -------------------------------
// SPORT + LEAGUE DETECTION
// -------------------------------

const MLB_TEAMS = {
  yankees: "AL East",
  "red sox": "AL East",
  "blue jays": "AL East",
  orioles: "AL East",
  rays: "AL East",
  angels: "AL West",
  astros: "AL West",
  athletics: "AL West",
  mariners: "AL West",
  rangers: "AL West",
  dodgers: "NL West",
  giants: "NL West",
  rockies: "NL West",
  padres: "NL West",
  diamondbacks: "NL West",
  // (Can be expanded later)
};

const NBA_TEAMS = {
  lakers: "Western",
  clippers: "Western",
  warriors: "Western",
  kings: "Western",
  suns: "Western",
  heat: "Eastern",
  celtics: "Eastern",
  knicks: "Eastern",
  nets: "Eastern",
  // Can add more
};

const NFL_TEAMS = {
  chiefs: "AFC West",
  raiders: "AFC West",
  broncos: "AFC West",
  chargers: "AFC West",
  eagles: "NFC East",
  giants: "NFC East",
  cowboys: "NFC East",
  commanders: "NFC East",
  // Can add more
};

const NHL_TEAMS = {
  rangers: "Metro",
  devils: "Metro",
  flyers: "Metro",
  bruins: "Atlantic",
  "maple leafs": "Atlantic",
  // Etc...
};

export function detectSport(team = "") {
  const t = String(team).toLowerCase();

  if (MLB_TEAMS[t]) return "Baseball";
  if (NBA_TEAMS[t]) return "Basketball";
  if (NFL_TEAMS[t]) return "Football";
  if (NHL_TEAMS[t]) return "Hockey";

  return "";
}

export function detectLeague(team = "") {
  const t = String(team).toLowerCase();

  if (MLB_TEAMS[t]) return MLB_TEAMS[t];
  if (NBA_TEAMS[t]) return NBA_TEAMS[t];
  if (NFL_TEAMS[t]) return NFL_TEAMS[t];
  if (NHL_TEAMS[t]) return NHL_TEAMS[t];

  return "";
}

// -------------------------------
// ROOKIE DETECTION
// -------------------------------
export function detectRookie(text = "") {
  const t = String(text).toLowerCase();
  if (t.includes("rated rookie")) return true;
  if (t.includes("1st bowman")) return true;
  if (t.includes("rookie")) return true;
  if (t.match(/\brc\b/)) return true;
  return false;
}

// -------------------------------
// GRADING + SLAB DETECTION
// -------------------------------
export function detectGrading(text = "") {
  const t = String(text).toLowerCase();
  let graded = false;
  let company = "";
  let value = "";

  if (t.includes("psa")) {
    graded = true;
    company = "PSA";
    const m = t.match(/psa\s*(\d+(\.\d+)?)/);
    if (m) value = m[1];
  }

  if (t.includes("bgs")) {
    graded = true;
    company = "BGS";
    const m = t.match(/bgs\s*(\d+(\.\d+)?)/);
    if (m) value = m[1];
  }

  if (t.includes("sgc")) {
    graded = true;
    company = "SGC";
    const m = t.match(/sgc\s*(\d+(\.\d+)?)/);
    if (m) value = m[1];
  }

  return { graded, company, value };
}

export function detectSlab(text = "") {
  const t = String(text).toLowerCase();
  return (
    t.includes("slab") ||
    t.includes("graded") ||
    t.includes("case") ||
    t.includes("encased")
  );
}

// -------------------------------
// PROTECTION RECOMMENDATION
// -------------------------------
export function recommendProtection({ slabbed, graded, serial }) {
  if (slabbed || graded) return "Slab sleeve recommended.";
  if (serial) return "Top loader + team bag recommended.";
  return "Penny sleeve + top loader recommended.";
}
