export function fbmEngine(listing) {
  const {
    title,
    brand,
    condition,
    description,
    size,
    color,
    parsedTitle,
    bagType,
  } = listing;

  const parsedSize = size || parsedTitle?.size;
  const parsedBag = bagType || parsedTitle?.bagType;

  const shortTitle = `${brand ? brand + " " : ""}${title}`
    .trim()
    .slice(0, 60);

  return {
    title: shortTitle,
    description: `${condition ? condition + ". " : ""}${description}${
      parsedSize ? `\nSize: ${parsedSize}` : ""
    }${parsedBag ? `\nBag Type: ${parsedBag}` : ""}`,
    tags: [],
  };
}
