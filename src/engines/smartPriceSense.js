// --- SMART PRICE SENSE (NO API, NO SCRAPE) ---

const playerTiers = {
  S: [
    "shohei ohtani",
    "mike trout",
    "patrick mahomes",
    "luka doncic",
    "connor mcdavid",
    "wayne gretzky",
  ],
  A: [
    "aaron judge",
    "joe burrow",
    "jayson tatum",
    "ronald acuna",
    "sidney crosby",
  ],
  B: [
    "bryce harper",
    "steph curry",
    "jalen hurts",
    "anthony edwards",
  ],
};

const parallelWeight = {
  gold: 3,
  "cracked ice": 3,
  mojo: 2,
  tie: 2,
  silver: 1,
  refractor: 1,
  base: 0,
};

export function smartPriceSense(item = {}) {
  let score = 0;

  const year = item.cardYear;
  const parallel = (item.cardParallel || "").toLowerCase();
  const serial = item.cardSerial;
  const player = (item.cardPlayer || "").toLowerCase();

  // --- Player Tier Weight ---
  for (const [tier, names] of Object.entries(playerTiers)) {
    if (names.some((n) => player.includes(n))) {
      if (tier === "S") score += 4;
      if (tier === "A") score += 3;
      if (tier === "B") score += 2;
    }
  }

  // --- Parallel Weight ---
  const foundParallel = Object.keys(parallelWeight).find((p) =>
    parallel.includes(p)
  );
  if (foundParallel) score += parallelWeight[foundParallel];

  // --- Serial Weight ---
  if (serial) {
    const num = parseInt(String(serial).replace("/", ""));
    if (!isNaN(num)) {
      if (num <= 10) score += 4;
      else if (num <= 25) score += 3;
      else if (num <= 99) score += 2;
      else if (num <= 199) score += 1;
    }
  }

  // --- Rookie bump ---
  if (item.title?.toLowerCase().includes("rookie")) score += 2;

  // --- Generate Range ---
  let range = "$5–$10";
  if (score >= 2) range = "$10–$25";
  if (score >= 4) range = "$25–$60";
  if (score >= 6) range = "$60–$150";
  if (score >= 8) range = "$150–$350";
  if (score >= 10) range = "$350+";

  return {
    score,
    range,
    reason: `Based on player tier, detected parallel, and serial numbering.`,
  };
}

