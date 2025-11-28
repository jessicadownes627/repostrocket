export function ebayEngine(listing) {
  const {
    title,
    brand,
    category,
    condition,
    features = [],
    color,
    size,
    description,
    parsedTitle,
    bagType,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const parsedBag = bagType || parsedTitle?.bagType;

  const seoTitle = [
    brand,
    title,
    parsedSize,
    color,
    condition,
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 80);

  const bullets = [
    condition && `Condition: ${condition}`,
    parsedSize && `Size: ${parsedSize}`,
    color && `Color: ${color}`,
    parsedBag && `Bag Type: ${parsedBag}`,
    ...features.map((f) => `• ${f}`),
  ].filter(Boolean);

  return {
    title: seoTitle,
    description: `${description}\n\n${bullets.join("\n")}`,
    tags: [],
  };
}
