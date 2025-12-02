// src/utils/sizeConversionTables.js

// Women’s US → EU/UK/CM
export const womenShoeSizeMap = {
  "5":    { eu: "35",   uk: "3",   cm: "22" },
  "5.5":  { eu: "35.5", uk: "3.5", cm: "22.5" },
  "6":    { eu: "36",   uk: "4",   cm: "23" },
  "6.5":  { eu: "37",   uk: "4.5", cm: "23.5" },
  "7":    { eu: "37.5", uk: "5",   cm: "24" },
  "7.5":  { eu: "38",   uk: "5.5", cm: "24.5" },
  "8":    { eu: "38.5", uk: "6",   cm: "25" },
  "8.5":  { eu: "39",   uk: "6.5", cm: "25.5" },
  "9":    { eu: "40",   uk: "7",   cm: "26" },
  "9.5":  { eu: "40.5", uk: "7.5", cm: "26.5" },
  "10":   { eu: "41",   uk: "8",   cm: "27" }
};

// Men’s US → EU/UK/CM
export const menShoeSizeMap = {
  "7":    { eu: "40",   uk: "6",   cm: "25" },
  "7.5":  { eu: "40.5", uk: "6.5", cm: "25.5" },
  "8":    { eu: "41",   uk: "7",   cm: "26" },
  "8.5":  { eu: "41.5", uk: "7.5", cm: "26.5" },
  "9":    { eu: "42",   uk: "8",   cm: "27" },
  "9.5":  { eu: "42.5", uk: "8.5", cm: "27.3" },
  "10":   { eu: "43",   uk: "9",   cm: "28" },
  "10.5": { eu: "43.5", uk: "9.5", cm: "28.3" },
  "11":   { eu: "44",   uk: "10",  cm: "28.6" },
  "11.5": { eu: "44.5", uk: "10.5", cm: "29" },
  "12":   { eu: "45",   uk: "11",  cm: "29.5" }
};

// Clothing alpha → numeric (approx)
export const alphaToNumeric = {
  "xs": "0–2",
  "s":  "2–4",
  "m":  "6–8",
  "l":  "10–12",
  "xl": "14–16",
  "xxl": "18–20",
  "xxxl": "22–24"
};

// Numeric clothing → international
export const numericClothingMap = {
  "0":  { uk: "4",  eu: "32" },
  "2":  { uk: "6",  eu: "34" },
  "4":  { uk: "8",  eu: "36" },
  "6":  { uk: "10", eu: "38" },
  "8":  { uk: "12", eu: "40" },
  "10": { uk: "14", eu: "42" },
  "12": { uk: "16", eu: "44" },
  "14": { uk: "18", eu: "46" },
  "16": { uk: "20", eu: "48" }
};

// Kids shoes → EU/CM (approx)
export const kidsShoeSizeMap = {
  "7t":   { eu: "23", cm: "14" },
  "8t":   { eu: "24", cm: "14.5" },
  "9t":   { eu: "25", cm: "15" },
  "10t":  { eu: "27", cm: "16" },
  "11":   { eu: "28", cm: "17" },
  "12":   { eu: "30", cm: "18" },
  "13":   { eu: "31", cm: "19" },
  "1y":   { eu: "32", cm: "20" },
  "2y":   { eu: "33", cm: "21" },
  "3y":   { eu: "34", cm: "22" }
};
