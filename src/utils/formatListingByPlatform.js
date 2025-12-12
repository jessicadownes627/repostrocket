import { mapPhotosToUrls } from "./photoHelpers";

/**
 * Full deluxe formatting engine for all marketplaces.
 * Defensive coding everywhere — no assumptions about fields.
 * listingData may contain undefined/null, so guard EVERYTHING.
 */

const clean = (v) => {
  if (!v) return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v).trim();
};

const stripEmojis = (text = "") => {
  return text.replace(
    /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]+)/g,
    ""
  ).trim();
};

const lower = (v) => clean(v).toLowerCase();
const safeArray = (arr) => (Array.isArray(arr) ? arr : []);
const safePhotos = (p) => mapPhotosToUrls(p).filter(Boolean);


// -------------------------------------------------------------
// MERCARI FORMATTER
// -------------------------------------------------------------
const formatMercari = (l) => {
  const brand = clean(l.brand);
  const item = clean(l.title);
  const color = clean(l.color);
  const size = clean(l.size);
  const condition = clean(l.condition);
  const desc = clean(l.description);
  const tags = clean(l.tags);

  const titleParts = [];
  if (brand) titleParts.push(brand);
  if (item) titleParts.push(item);
  if (color) titleParts.push(color);
  if (size) titleParts.push(size);

  const finalTitle = stripEmojis(titleParts.join(" ").replace(/\s+/g, " "));

  const fullDescription = `
Condition: ${condition || "Good"}
Size: ${size || "—"}
Color: ${color || "—"}

${desc}

Keywords: ${tags || ""}
`.trim();

  return {
    title: finalTitle,
    description: stripEmojis(fullDescription),
    category: clean(l.category),
    condition,
    brand,
    color,
    size,
    price: clean(l.price),
    shipping: clean(l.shipping),
    sku: clean(l.sku),
    tags,
    photos: safePhotos(l.photos)
  };
};


// -------------------------------------------------------------
// POSHMARK FORMATTER
// -------------------------------------------------------------
const formatPoshmark = (l) => {
  const brand = clean(l.brand);
  const item = clean(l.title);
  const color = clean(l.color);
  const size = clean(l.size);
  const cond = clean(l.condition);
  const desc = clean(l.description);

  // Poshmark title = Brand + Item + Color + Size
  const titleParts = [];
  if (brand) titleParts.push(brand);
  if (item) titleParts.push(item);
  if (color) titleParts.push(color);
  if (size) titleParts.push(size);

  const finalTitle = stripEmojis(titleParts.join(" ").replace(/\s+/g, " "));

  const body = `
Brand: ${brand || "—"}
Size: ${size || "—"}
Color: ${color || "—"}
Condition: ${cond || "Good"}

${desc}
  `.trim();

  return {
    title: finalTitle,
    description: stripEmojis(body),
    category: clean(l.category),
    brand,
    color,
    size,
    price: clean(l.price),
    originalPrice: clean(l.originalPrice),
    condition: cond,
    photos: safePhotos(l.photos)
  };
};


// -------------------------------------------------------------
// EBAY FORMATTER
// -------------------------------------------------------------
const formatEbay = (l) => {
  const brand = clean(l.brand);
  const item = clean(l.title);
  const color = clean(l.color);
  const size = clean(l.size);
  const cond = clean(l.condition);
  const desc = clean(l.description);
  const tags = clean(l.tags);

  // SEO title
  const titleParts = [];
  if (brand) titleParts.push(brand);
  if (item) titleParts.push(item);
  if (color) titleParts.push(color);
  if (size) titleParts.push(size);
  if (cond) titleParts.push(cond);

  const finalTitle = stripEmojis(titleParts.join(" ").replace(/\s+/g, " "));

  const specifics = `
• Brand: ${brand || "—"}
• Size: ${size || "—"}
• Color: ${color || "—"}
• Condition: ${cond || "Good"}
  `.trim();

  const body = `
${specifics}

Description:
${desc}

Keywords:
${tags}
  `.trim();

  return {
    title: finalTitle,
    description: stripEmojis(body),
    category: clean(l.category),
    condition: cond,
    brand,
    price: clean(l.price),
    shipping: clean(l.shipping),
    photos: safePhotos(l.photos),
    sku: clean(l.sku)
  };
};


// -------------------------------------------------------------
// ETSY FORMATTER
// -------------------------------------------------------------
const formatEtsy = (l) => {
  const item = clean(l.title);
  const color = clean(l.color);
  const tags = clean(l.tags);
  const desc = clean(l.description);

  const finalTitle = stripEmojis(`${item} | ${color}`.trim());

  const body = `
${desc}

Tags:
${tags}
  `.trim();

  return {
    title: finalTitle,
    description: stripEmojis(body),
    category: clean(l.category),
    tags,
    price: clean(l.price),
    photos: safePhotos(l.photos),
    sku: clean(l.sku)
  };
};


// -------------------------------------------------------------
// DEPOP FORMATTER
// -------------------------------------------------------------
const formatDepop = (l) => {
  const brand = lower(l.brand);
  const item = lower(l.title);
  const color = lower(l.color);
  const size = lower(l.size);
  const cond = lower(l.condition);
  const desc = lower(l.description);
  const tags = lower(l.tags);

  const finalTitle = stripEmojis(
    [brand, item, color, size].filter(Boolean).join(" ").trim()
  );

  const body = `
${cond || ""}
${desc}

${tags}
  `.trim();

  return {
    title: finalTitle,
    description: stripEmojis(body),
    category: lower(l.category),
    brand,
    color,
    size,
    condition: cond,
    price: clean(l.price),
    photos: safePhotos(l.photos)
  };
};


// -------------------------------------------------------------
// FACEBOOK MARKETPLACE FORMATTER
// -------------------------------------------------------------
const formatFacebook = (l) => {
  const item = clean(l.title);
  const cond = clean(l.condition);
  const desc = clean(l.description);

  const finalTitle = stripEmojis(item);

  const body = `
Condition: ${cond || "Good"}

${desc}
  `.trim();

  return {
    title: finalTitle,
    description: stripEmojis(body),
    category: clean(l.category),
    condition: cond,
    price: clean(l.price),
    photos: safePhotos(l.photos)
  };
};


// -------------------------------------------------------------
// MAIN DISPATCHER
// -------------------------------------------------------------
export const formatListingByPlatform = (listing, config) => {
  const l = listing || {};
  const id = config?.id;

  switch (id) {
    case "mercari": return formatMercari(l);
    case "poshmark": return formatPoshmark(l);
    case "ebay": return formatEbay(l);
    case "etsy": return formatEtsy(l);
    case "depop": return formatDepop(l);
    case "facebook": return formatFacebook(l);
    default:
      // fallback: clean & return only the requested fields
      const out = {};
      (config.fields || []).forEach(f => {
        if (f === "photos") out[f] = safePhotos(l.photos);
        else out[f] = clean(l[f]);
      });
      return out;
  }
};
