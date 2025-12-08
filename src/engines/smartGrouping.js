// SMART GROUPING ENGINE FOR SPORTS CARDS

export function groupSportsCards(items = []) {
  const groups = {
    highValue: [],
    rookies: [],
    parallels: [],
    graded: [],
    base: [],
    bulk: [],
  };

  for (const item of items) {
    const intel = item.cardIntelligence || {};
    const parallel = item.cardParallel;
    const serial = item.cardSerial;
    const rookie = intel.rookie;
    const graded = intel.graded;
    const priceSenseScore = item.priceSense?.score || 0;

    // Group 1 — High Value (Tier S)
    if (priceSenseScore >= 80) {
      groups.highValue.push(item);
      continue;
    }

    // Group 2 — Rookies
    if (rookie) {
      groups.rookies.push(item);
      continue;
    }

    // Group 3 — Parallels & Serial Cards
    if (parallel || serial) {
      groups.parallels.push(item);
      continue;
    }

    // Group 4 — Graded Cards
    if (graded) {
      groups.graded.push(item);
      continue;
    }

    // Group 5 — Base tier if nothing else applied
    if (!parallel && !serial && !rookie && !graded) {
      // If too many base cards → send extras to "bulk"
      if (groups.base.length >= 50) {
        groups.bulk.push(item);
      } else {
        groups.base.push(item);
      }
      continue;
    }
  }

  return groups;
}

