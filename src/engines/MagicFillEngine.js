// src/engines/MagicFillEngine.js

const EMPTY_FIELDS = {
  title: { before: "", after: "", note: "" },
  description: { before: "", after: "", note: "" },
  price: { before: "", after: "", note: "" },
  tags: { before: [], after: [], note: "" },
  category_choice: null,
  style_choices: [],
  debug: {},
};

export function parseMagicFillOutput(payload) {
  if (!payload || typeof payload !== "object") {
    return EMPTY_FIELDS;
  }

  return {
    title: {
      before: "",
      after: payload.title || "",
      note: "AI improved clarity and SEO.",
    },
    description: {
      before: "",
      after: payload.description || "",
      note: "AI improved readability.",
    },
    price: {
      before: "",
      after: payload.price || "",
      note: "Suggested based on similar listings.",
    },
    tags: {
      before: [],
      after: Array.isArray(payload.tags) ? payload.tags : [],
      note: "Smart tags extracted from product.",
    },
    category_choice: payload.category_choice || null,
    style_choices: Array.isArray(payload.style_choices)
      ? payload.style_choices
      : [],
    debug: payload.debug || {},
  };
}
