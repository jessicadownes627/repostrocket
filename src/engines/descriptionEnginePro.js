// src/engines/descriptionEnginePro.js
// Builds a refined description while staying minimal/safe.

export async function buildDescriptionPro({ parsed = {}, userDesc = "", imageHints = {} }) {
  const parts = [];

  if (userDesc) parts.push(userDesc.trim());

  const details = [
    parsed.condition && `Condition: ${parsed.condition}`,
    parsed.color && `Color: ${parsed.color}`,
    parsed.size && `Size: ${parsed.size}`,
    parsed.category && `Category: ${parsed.category}`,
    parsed.bagType && `Bag Type: ${parsed.bagType}`,
    imageHints.material && `Material: ${imageHints.material}`,
  ]
    .filter(Boolean)
    .join("\n");

  if (details) parts.push(details);

  return parts.join("\n\n").trim();
}
