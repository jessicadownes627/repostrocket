export function poshmarkEngine(listing) {
  const {
    title,
    brand,
    category,
    condition,
    description,
    size,
    color,
    material,
    parsedTitle,
    bagType,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const parsedBag = bagType || parsedTitle?.bagType;

  const baseTitle = `${brand ? brand + " " : ""}${title}`
    .trim()
    .slice(0, 50);

  const hashtags = [
    brand && `#${brand.replace(/\s+/g, "")}`,
    category && `#${category.replace(/\s+/g, "")}`,
    color && `#${color.replace(/\s+/g, "")}`,
    parsedSize && `#${parsedSize.replace(/\s+/g, "")}`,
  ].filter(Boolean);

  const bullets = [
    parsedSize && `Size: ${parsedSize}`,
    color && `Color: ${color}`,
    material && `Material: ${material}`,
    condition && `Condition: ${condition}`,
    parsedBag && `Bag Type: ${parsedBag}`,
  ].filter(Boolean);

  return {
    title: baseTitle,
    description: `${description}\n\n${bullets.join("\n")}`,
    tags: hashtags,
  };
}
