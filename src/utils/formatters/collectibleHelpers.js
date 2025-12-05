// NEW — Build Collectible Details Block
export function buildCollectibleDetails(item) {
  if (!item || !["Sports Cards", "Collectibles"].includes(item.category)) {
    return "";
  }

  const lines = [];

  if (item.gradingCompany) {
    lines.push(`Grade: ${item.gradingCompany} ${item.gradeNumber || ""}`.trim());
  }

  if (item.serialNumber) {
    lines.push(`Cert/Serial: ${item.serialNumber}`);
  }

  if (item.cardPlayer) {
    lines.push(`Player/Character: ${item.cardPlayer}`);
  }

  if (item.cardTeam) {
    lines.push(`Team: ${item.cardTeam}`);
  }

  if (item.cardSet) {
    lines.push(`Set: ${item.cardSet}`);
  }

  if (item.cardNumber) {
    lines.push(`Card Number: ${item.cardNumber}`);
  }

  if (item.variant) {
    lines.push(`Variant/Parallel: ${item.variant}`);
  }

  return lines.length
    ? `\n\n🔥 **Collectible Details**\n${lines.map((l) => `• ${l}`).join("\n")}\n`
    : "";
}

