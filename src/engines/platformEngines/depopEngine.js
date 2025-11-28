export function depopEngine(listing) {
  const {
    title,
    brand,
    description,
    size,
    color,
    condition,
    parsedTitle,
    bagType,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const parsedBag = bagType || parsedTitle?.bagType;

  const base = `${brand ? brand + " " : ""}${title}`.slice(0, 45);

  return {
    title: base,
    description: `${description}

${parsedSize ? `Size: ${parsedSize}` : ""}
${color ? `Color: ${color}` : ""}
${condition ? `Condition: ${condition}` : ""}
${parsedBag ? `Bag Type: ${parsedBag}` : ""}

✨ fast shipping ✨`.trim(),
    tags: [],
  };
}
