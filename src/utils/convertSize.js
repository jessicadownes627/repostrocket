// src/utils/convertSize.js
import {
  womenShoeSizeMap,
  menShoeSizeMap,
  kidsShoeSizeMap,
  alphaToNumeric,
  numericClothingMap
} from "./sizeConversionTables";

export function parseSize(input) {
  if (!input) return null;

  const clean = input.toLowerCase().trim();

  // Shoe sizes
  if (/^\d{1,2}(\.\d)?$/.test(clean)) return { type: "shoe_us", value: clean };
  if (/^\d{1,2}t$/.test(clean)) return { type: "shoe_kids", value: clean };
  if (/^\d{1,2}y$/.test(clean)) return { type: "shoe_kids", value: clean };

  // Alpha clothing
  if (alphaToNumeric[clean]) return { type: "alpha", value: clean };

  // Numeric clothing
  if (numericClothingMap[clean]) return { type: "numeric", value: clean };

  return null;
}

// UNIVERSAL CONVERSION
export function convertSize(input) {
  const parsed = parseSize(input);
  if (!parsed) return null;

  const { type, value } = parsed;

  if (type === "shoe_us") {
    return {
      us_women: womenShoeSizeMap[value] ? value : null,
      us_men: menShoeSizeMap[value] ? value : null,
      eu: womenShoeSizeMap[value]?.eu || menShoeSizeMap[value]?.eu || null,
      uk: womenShoeSizeMap[value]?.uk || menShoeSizeMap[value]?.uk || null,
      cm: womenShoeSizeMap[value]?.cm || menShoeSizeMap[value]?.cm || null
    };
  }

  if (type === "shoe_kids") {
    return kidsShoeSizeMap[value] || null;
  }

  if (type === "alpha") {
    return {
      us_alpha: value.toUpperCase(),
      us_numeric: alphaToNumeric[value],
      uk: null,
      eu: null
    };
  }

  if (type === "numeric") {
    return {
      us_numeric: value,
      uk: numericClothingMap[value].uk,
      eu: numericClothingMap[value].eu
    };
  }

  return null;
}
