export function buildCardTitle(attrs) {
  if (!attrs) return "";

  const {
    year,
    player,
    team,
    set,
    parallel,
    cardNumber,
  } = attrs;

  return [
    year,
    player,
    team ? `(${team})` : "",
    set,
    parallel,
    cardNumber ? `#${cardNumber}` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

