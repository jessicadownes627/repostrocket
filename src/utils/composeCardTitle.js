export function composeCardTitle({ year, setName, player } = {}) {
  if (!player) return "";
  const parts = [];
  if (setName) parts.push(String(setName).trim());
  parts.push(String(player).trim());
  return parts.filter(Boolean).join(" ").trim();
}
