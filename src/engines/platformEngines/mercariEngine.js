export function mercariEngine(listing) {
  const {
    title,
    brand,
    condition,
    description,
    features = [],
    color,
    size,
    parsedTitle,
    material,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const bagType = listing.bagType || parsedTitle?.bagType;

  const baseTitle = `${brand ? brand + " " : ""}${title}`.trim();

  const bullets = [
    condition && `Condition: ${condition}`,
    parsedSize && `Size: ${parsedSize}`,
    color && `Color: ${color}`,
    bagType && `Bag Type: ${bagType}`,
    material && `Material: ${material}`,
    ...features.map((f) => `• ${f}`),
  ].filter(Boolean);

  return {
    title: baseTitle.slice(0, 40),
    description: `${description}\n\n${bullets.join("\n")}`,
    tags: [],
  };
}
