export function composeCardTitle({ year, setName, player } = {}) {
  if (!player) return "";
  const safePlayer = String(player).trim();
  if (year && setName) {
    return `${String(year).trim()} ${String(setName).trim()} ${safePlayer}`.trim();
  }
  return safePlayer;
}
