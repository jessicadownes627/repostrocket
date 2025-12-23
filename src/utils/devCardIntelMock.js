const MOCK_PLAYERS = [
  { player: "Jordan Alvarez", team: "Houston Astros", sport: "Baseball" },
  { player: "Justin Jefferson", team: "Minnesota Vikings", sport: "Football" },
  { player: "Julio Rodriguez", team: "Seattle Mariners", sport: "Baseball" },
  { player: "Caitlin Clark", team: "Indiana Fever", sport: "Basketball" },
];

const MOCK_SETS = [
  { setName: "Repost Rocket Premiere", brand: "Repost Rocket", year: "2023" },
  { setName: "Future Stars", brand: "RR Labs", year: "2022" },
  { setName: "Signature Chrome", brand: "RR Chrome", year: "2024" },
];

function randomFrom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

export async function generateDevCardIntelMock(payload = {}) {
  const player = randomFrom(MOCK_PLAYERS);
  const set = randomFrom(MOCK_SETS);
  const delay = payload?.frontImage || payload?.backImage ? 650 : 200;

  await new Promise((resolve) => setTimeout(resolve, delay));

  return {
    player: player.player,
    team: player.team,
    sport: player.sport,
    year: set.year,
    setName: set.setName,
    cardNumber: "RR-DEV",
    brand: set.brand,
    notes: "Development mock intel — real AI disabled.",
    confidence: {
      player: "high",
      year: "medium",
      setName: "medium",
      cardNumber: "medium",
      brand: "medium",
    },
    sources: {
      player: "front",
      year: "back",
      setName: "back",
      cardNumber: "back",
      brand: "front",
    },
    imageHash: payload?.imageHash || null,
    requestId: payload?.requestId || `mock-${Date.now()}`,
  };
}
