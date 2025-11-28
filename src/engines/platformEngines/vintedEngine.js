export function vintedEngine(listing) {
  const {
    title,
    brand,
    size,
    condition,
    color,
    material,
    description,
    parsedTitle,
    bagType,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const parsedBag = bagType || parsedTitle?.bagType;

  const bullets = [
    parsedSize && `Size: ${parsedSize}`,
    color && `Color: ${color}`,
    material && `Material: ${material}`,
    condition && `Condition: ${condition}`,
    parsedBag && `Bag Type: ${parsedBag}`,
  ].filter(Boolean);

  return {
    title: `${brand ? brand + " " : ""}${title}`.slice(0, 50),
    description: `${description}\n\n${bullets.join("\n")}`,
    tags: [],
  };
}
