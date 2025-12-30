export function buildCardTitle(attrs = {}) {
  if (!attrs || typeof attrs !== "object") return "";

  const {
    isTextVerified = {},
    player,
    team,
    year,
    setName,
    setBrand,
  } = attrs;

  const sanitize = (value) => {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  };

  const hasVerified = (key) => Boolean(isTextVerified?.[key]);
  const playerName = hasVerified("player") ? sanitize(player) : "";
  if (!playerName) return "";

  const verifiedTeam = hasVerified("team") ? sanitize(team) : "";
  const verifiedYear = hasVerified("year") ? sanitize(year) : "";
  const verifiedSet =
    hasVerified("setName")
      ? sanitize(setName || setBrand)
      : hasVerified("setBrand")
      ? sanitize(setBrand)
      : "";

  const suffixParts = [];
  if (verifiedYear) suffixParts.push(verifiedYear);
  if (verifiedSet) suffixParts.push(verifiedSet);

  let title = playerName;
  if (verifiedTeam) {
    title += ` (${verifiedTeam})`;
  }
  if (suffixParts.length) {
    title += ` ${suffixParts.join(" ")}`;
  }
  return title;
}
